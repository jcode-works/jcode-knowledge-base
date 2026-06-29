import { readFile } from "node:fs/promises"
import { strFromU8, unzipSync } from "fflate"
import { htmlToText } from "html-to-text"
import { extractText, getDocumentProxy } from "unpdf"
import YAML from "yaml"
import type { ParsedDocument, SourceFile } from "./types.js"

const MAX_OFFICE_XML_ENTRY_BYTES = 25_000_000

export async function parseFile(file: SourceFile): Promise<ParsedDocument> {
  let text: string

  switch (file.extension) {
    case ".pdf":
      text = await parsePdf(file.absolutePath)
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
  const entries = unzipOfficeFile(await readFile(filePath))
  return xmlEntriesToText(entries, [
    /^word\/document\.xml$/u,
    /^word\/header\d*\.xml$/u,
    /^word\/footer\d*\.xml$/u,
    /^word\/footnotes\.xml$/u,
    /^word\/endnotes\.xml$/u,
    /^word\/comments\.xml$/u,
  ])
}

async function parsePptx(filePath: string): Promise<string> {
  const entries = unzipOfficeFile(await readFile(filePath))
  return xmlEntriesToText(entries, [
    /^ppt\/slides\/slide\d+\.xml$/u,
    /^ppt\/notesSlides\/notesSlide\d+\.xml$/u,
  ])
}

async function parseXlsx(filePath: string): Promise<string> {
  const entries = unzipOfficeFile(await readFile(filePath))
  const sharedStrings = parseSharedStrings(entries.get("xl/sharedStrings.xml") ?? "")
  const sheetNames = parseWorkbookSheetNames(entries)
  const sheets = [...entries.entries()]
    .filter(([name]) => /^xl\/worksheets\/sheet\d+\.xml$/u.test(name))
    .sort(([a], [b]) => a.localeCompare(b))

  const rows: string[] = []
  for (const [name, xml] of sheets) {
    const values = parseSheetValues(xml, sharedStrings)
    if (values.length > 0) {
      rows.push(`# ${sheetNames.get(name) ?? name}`, values.join("\n"))
    }
  }
  return rows.join("\n\n")
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

function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si\b[\s\S]*?<\/si>/gu)].map(([item]) => xmlToText(item))
}

function parseWorkbookSheetNames(entries: Map<string, string>): Map<string, string> {
  const workbook = entries.get("xl/workbook.xml") ?? ""
  const relationships = entries.get("xl/_rels/workbook.xml.rels") ?? ""
  const relationshipTargets = parseWorkbookRelationships(relationships)
  const sheetNames = new Map<string, string>()

  for (const sheetMatch of workbook.matchAll(/<sheet\b([^>]*)\/?>/gu)) {
    const attributes = sheetMatch[1] ?? ""
    const name = readXmlAttribute(attributes, "name")
    const relationshipId = readXmlAttribute(attributes, "r:id")
    const target = relationshipId ? relationshipTargets.get(relationshipId) : undefined
    if (name && target) {
      sheetNames.set(target, decodeXmlEntities(name))
    }
  }

  return sheetNames
}

function parseWorkbookRelationships(xml: string): Map<string, string> {
  const relationships = new Map<string, string>()
  for (const relationshipMatch of xml.matchAll(/<Relationship\b([^>]*)\/?>/gu)) {
    const attributes = relationshipMatch[1] ?? ""
    const id = readXmlAttribute(attributes, "Id")
    const target = readXmlAttribute(attributes, "Target")
    if (id && target) {
      relationships.set(id, normalizeWorkbookTarget(target))
    }
  }
  return relationships
}

function normalizeWorkbookTarget(target: string): string {
  if (target.startsWith("/xl/")) {
    return target.slice(1)
  }
  if (target.startsWith("xl/")) {
    return target
  }
  return `xl/${target.replace(/^\.\//u, "")}`
}

function parseSheetValues(xml: string, sharedStrings: string[]): string[] {
  const rows: string[] = []
  for (const rowMatch of xml.matchAll(/<row\b[\s\S]*?<\/row>/gu)) {
    const rowXml = rowMatch[0]
    const values: string[] = []
    let nextColumn = 1
    for (const cellMatch of rowXml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gu)) {
      const attrs = cellMatch[1] ?? ""
      const cellXml = cellMatch[2] ?? ""
      const reference = readXmlAttribute(attrs, "r")
      const column = reference ? columnReferenceToIndex(reference) : nextColumn
      while (values.length < column - 1) {
        values.push("")
      }
      values[column - 1] = parseCellValue(attrs, cellXml, sharedStrings)
      nextColumn = column + 1
    }

    const trimmed = trimTrailingEmptyValues(values)
    if (trimmed.some(Boolean)) {
      rows.push(trimmed.join("\t"))
    }
  }
  return rows
}

function parseCellValue(attrs: string, cellXml: string, sharedStrings: string[]): string {
  const inline = firstMatch(cellXml, /<is\b[\s\S]*?<\/is>/u)
  if (inline) {
    return xmlToText(inline)
  }

  const rawValue = firstMatch(cellXml, /<v>([\s\S]*?)<\/v>/u)
  if (!rawValue) {
    return ""
  }

  if (/\bt="s"/u.test(attrs)) {
    return sharedStrings[Number.parseInt(rawValue, 10)] ?? ""
  }
  return decodeXmlEntities(rawValue)
}

function trimTrailingEmptyValues(values: string[]): string[] {
  let end = values.length
  while (end > 0 && values[end - 1] === "") {
    end -= 1
  }
  return values.slice(0, end)
}

function columnReferenceToIndex(reference: string): number {
  const column = reference.match(/[A-Z]+/iu)?.[0].toUpperCase() ?? ""
  let index = 0
  for (const char of column) {
    index = index * 26 + char.charCodeAt(0) - 64
  }
  return index || 1
}

function readXmlAttribute(attributes: string, name: string): string {
  const escapedName = name.replace(/[-/\\^$*+?.()|[\]{}]/gu, "\\$&")
  return firstMatch(attributes, new RegExp(`\\b${escapedName}="([^"]*)"`, "u"))
}

function firstMatch(input: string, pattern: RegExp): string {
  const match = input.match(pattern)
  return match?.[1] ?? match?.[0] ?? ""
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

async function parsePdf(filePath: string): Promise<string> {
  const buffer = await readFile(filePath)
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const result = await extractText(pdf, { mergePages: true })
  return result.text
}

function normalizeText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
}
