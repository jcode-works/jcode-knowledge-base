import { mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { strToU8, zipSync } from "fflate"
import { afterEach, describe, expect, it } from "vitest"
import { utils as spreadsheetUtils, write as writeWorkbook } from "xlsx"
import { parseFile } from "./parsing.js"
import type { SourceFile } from "./types.js"

const tempDirs: string[] = []

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true })
  }
})

describe("parseFile", () => {
  it("extracts text from docx files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mimir-docx-"))
    tempDirs.push(root)
    const filePath = path.join(root, "brief.docx")
    await writeFile(
      filePath,
      createDocxPackage(
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Confidential briefing</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Risk owner</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>',
      ),
    )

    const parsed = await parseFile(sourceFile(root, filePath, ".docx"))

    expect(parsed.text).toContain("Confidential briefing")
    expect(parsed.text).toContain("Risk owner")
  })

  it("extracts shared strings and values from xlsx files", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mimir-xlsx-"))
    tempDirs.push(root)
    const filePath = path.join(root, "dataset.xlsx")
    const workbook = spreadsheetUtils.book_new()
    const sheet = spreadsheetUtils.aoa_to_sheet([["Invoice", "", 24000, "Paid"]])
    spreadsheetUtils.book_append_sheet(workbook, sheet, "Finance & Ops")
    await writeFile(filePath, writeWorkbook(workbook, { bookType: "xlsx", type: "buffer" }))

    const parsed = await parseFile(sourceFile(root, filePath, ".xlsx"))

    expect(parsed.text).toContain("# Finance & Ops")
    expect(parsed.text).toContain("Invoice\t\t24000\tPaid")
  })

  it("extracts text from epub html entries", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mimir-epub-"))
    tempDirs.push(root)
    const filePath = path.join(root, "brief.epub")
    await writeFile(
      filePath,
      zipSync({
        "OPS/chapter.xhtml": strToU8("<html><body><h1>Sovereign report</h1></body></html>"),
      }),
    )

    const parsed = await parseFile(sourceFile(root, filePath, ".epub"))

    expect(parsed.text).toContain("SOVEREIGN REPORT")
  })
})

function sourceFile(root: string, absolutePath: string, extension: string): SourceFile {
  return {
    absolutePath,
    relativePath: path.relative(root, absolutePath),
    source: path.basename(absolutePath),
    extension,
    bytes: 0,
    mtimeMs: 0,
    checksum: "test",
  }
}

function createDocxPackage(documentXml: string): Uint8Array {
  return zipSync({
    "[Content_Types].xml": strToU8(
      [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '<Default Extension="xml" ContentType="application/xml"/>',
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
        "</Types>",
      ].join(""),
    ),
    "_rels/.rels": strToU8(
      [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
        "</Relationships>",
      ].join(""),
    ),
    "word/document.xml": strToU8(documentXml),
  })
}
