import { spawn } from "node:child_process"
import { readFile } from "node:fs/promises"
import { strFromU8, unzipSync } from "fflate"
import { htmlToText } from "html-to-text"

import mammoth = require("mammoth")

import { extractText, getDocumentProxy } from "unpdf"
import { read as readWorkbook, utils as spreadsheetUtils } from "xlsx"
import YAML from "yaml"
import type { ParsedDocument, SourceFile } from "./types.js"

const MAX_OFFICE_XML_ENTRY_BYTES = 25_000_000
const MAX_OCR_STDIO_BYTES = 25_000_000

export interface ParseFileOptions {
  pdfOcrCommand?: string[]
  pdfOcrTimeoutMs?: number
}

export async function parseFile(
  file: SourceFile,
  options: ParseFileOptions = {},
): Promise<ParsedDocument> {
  let text: string

  switch (file.extension) {
    case ".pdf":
      text = await parsePdf(file.absolutePath, options)
      break
    case ".docx":
      text = await parseDocx(file.absolutePath)
      break
    case ".pptx":
      text = await parsePptx(file.absolutePath)
      break
    case ".xlsx":
      text = await parseXlsx(file.absolutePath)
      break
    case ".odt":
    case ".ods":
    case ".odp":
      text = await parseOpenDocument(file.absolutePath)
      break
    case ".epub":
      text = await parseEpub(file.absolutePath)
      break
    case ".html":
    case ".htm":
      text = htmlToText(await readFile(file.absolutePath, "utf8"), {
        wordwrap: false,
        selectors: [
          { selector: "a", options: { ignoreHref: true } },
          { selector: "img", format: "skip" },
        ],
      })
      break
    case ".json":
    case ".ipynb":
      text = JSON.stringify(JSON.parse(await readFile(file.absolutePath, "utf8")), null, 2)
      break
    case ".yaml":
    case ".yml":
      text = YAML.stringify(YAML.parse(await readFile(file.absolutePath, "utf8")))
      break
    case ".rtf":
      text = stripRtf(await readFile(file.absolutePath, "utf8"))
      break
    default:
      text = await readFile(file.absolutePath, "utf8")
  }

  return { file, text: normalizeText(text) }
}

async function parseDocx(filePath: string): Promise<string> {
  const result = await mammoth.extractRawText({ path: filePath })
  return result.value
}

async function parsePptx(filePath: string): Promise<string> {
  const entries = unzipOfficeFile(await readFile(filePath))
  return xmlEntriesToText(entries, [
    /^ppt\/slides\/slide\d+\.xml$/u,
    /^ppt\/notesSlides\/notesSlide\d+\.xml$/u,
  ])
}

async function parseXlsx(filePath: string): Promise<string> {
  const workbook = readWorkbook(await readFile(filePath), { cellDates: true })
  const sheets: string[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) {
      continue
    }

    const rows = spreadsheetUtils
      .sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "", raw: false })
      .map(spreadsheetRowToText)
      .filter((row) => row.some(Boolean))

    if (rows.length > 0) {
      sheets.push(`# ${sheetName}`, rows.map((row) => row.join("\t")).join("\n"))
    }
  }

  return sheets.join("\n\n")
}

async function parseOpenDocument(filePath: string): Promise<string> {
  const entries = unzipOfficeFile(await readFile(filePath))
  return xmlEntriesToText(entries, [/^content\.xml$/u, /^meta\.xml$/u])
}

async function parseEpub(filePath: string): Promise<string> {
  const entries = unzipOfficeFile(await readFile(filePath))
  const parts: string[] = []
  for (const [name, content] of [...entries.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (!/\.(?:xhtml|html|htm|xml)$/iu.test(name)) {
      continue
    }
    const text = htmlToText(content, {
      wordwrap: false,
      selectors: [
        { selector: "a", options: { ignoreHref: true } },
        { selector: "img", format: "skip" },
      ],
    })
    if (text.trim()) {
      parts.push(text)
    }
  }
  return parts.join("\n\n")
}

function unzipOfficeFile(buffer: Buffer): Map<string, string> {
  const unzipped = unzipSync(new Uint8Array(buffer), {
    filter: (file) => file.originalSize <= MAX_OFFICE_XML_ENTRY_BYTES,
  })
  const entries = new Map<string, string>()
  for (const [name, content] of Object.entries(unzipped)) {
    if (/\.(?:xml|rels|xhtml|html|htm)$/iu.test(name)) {
      entries.set(name, strFromU8(content))
    }
  }
  return entries
}

function xmlEntriesToText(entries: Map<string, string>, patterns: RegExp[]): string {
  const parts: string[] = []
  for (const [name, xml] of [...entries.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (patterns.some((pattern) => pattern.test(name))) {
      const text = xmlToText(xml)
      if (text) {
        parts.push(text)
      }
    }
  }
  return parts.join("\n\n")
}

function trimTrailingEmptyValues(values: string[]): string[] {
  let end = values.length
  while (end > 0 && values[end - 1] === "") {
    end -= 1
  }
  return values.slice(0, end)
}

function spreadsheetRowToText(row: readonly unknown[]): string[] {
  return trimTrailingEmptyValues(row.map(spreadsheetCellToText))
}

function spreadsheetCellToText(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
    return String(value)
  }
  return JSON.stringify(value)
}

function xmlToText(xml: string): string {
  return normalizeText(
    decodeXmlEntities(
      xml
        .replace(/<w:tab\/>/gu, " ")
        .replace(/<w:br\/>/gu, "\n")
        .replace(/<\/(?:w:p|a:p|text:p|text:h|table:table-row)>/gu, "\n")
        .replace(/<[^>]+>/gu, " ")
        .replace(/[ \t]{2,}/gu, " "),
    ),
  )
}

function stripRtf(input: string): string {
  return input
    .replace(/\\par[d]?/gu, "\n")
    .replace(/\\'[0-9a-fA-F]{2}/gu, " ")
    .replace(/\\[a-zA-Z]+-?\d* ?/gu, " ")
    .replace(/[{}]/gu, " ")
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&amp;/gu, "&")
}

async function parsePdf(filePath: string, options: ParseFileOptions): Promise<string> {
  const buffer = await readFile(filePath)
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const result = await extractText(pdf, { mergePages: true })
  if (normalizeText(result.text)) {
    return result.text
  }
  if (!options.pdfOcrCommand || options.pdfOcrCommand.length === 0) {
    return result.text
  }
  return runPdfOcr(filePath, options)
}

async function runPdfOcr(filePath: string, options: ParseFileOptions): Promise<string> {
  const command = options.pdfOcrCommand ?? []
  const [executable, ...configuredArgs] = command
  if (!executable) {
    return ""
  }

  const hasInputPlaceholder = command.some((part) => part.includes("{input}"))
  const args = configuredArgs.map((part) => part.replaceAll("{input}", filePath))
  if (!hasInputPlaceholder) {
    args.push(filePath)
  }

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      env: { ...process.env, MIMIR_PDF_PATH: filePath },
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    let didTimeout = false
    let outputTooLarge = false
    const timeout = setTimeout(() => {
      didTimeout = true
      child.kill("SIGTERM")
    }, options.pdfOcrTimeoutMs ?? 120_000)

    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk
      if (Buffer.byteLength(stdout, "utf8") > MAX_OCR_STDIO_BYTES) {
        outputTooLarge = true
        child.kill("SIGTERM")
      }
    })
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk
      if (Buffer.byteLength(stderr, "utf8") > MAX_OCR_STDIO_BYTES) {
        outputTooLarge = true
        child.kill("SIGTERM")
      }
    })
    child.on("error", (error) => {
      clearTimeout(timeout)
      reject(new Error(`PDF OCR command failed to start: ${error.message}`))
    })
    child.on("close", (code) => {
      clearTimeout(timeout)
      if (didTimeout) {
        reject(new Error("PDF OCR command timed out."))
        return
      }
      if (outputTooLarge) {
        reject(new Error("PDF OCR command produced too much output."))
        return
      }
      if (code !== 0) {
        const detail = stderr.trim()
        reject(new Error(detail ? `PDF OCR command failed: ${detail}` : "PDF OCR command failed."))
        return
      }
      resolve(stdout)
    })
  })
}

function normalizeText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
}
