import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { audit, ingest } from "./ingest.js"
import { initProject } from "./init.js"

const tempDirs: string[] = []

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true })
  }
})

describe("ingest", () => {
  it("reports skipped files and detects stale indexed content by checksum", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mimir-ingest-"))
    tempDirs.push(root)
    await initProject(root)
    await mkdir(path.join(root, "private"), { recursive: true })
    await writeFile(path.join(root, "private", "evidence.md"), "First version.\n", "utf8")
    await writeFile(path.join(root, "private", "scan.heic"), "unsupported image\n", "utf8")

    const result = await ingest({ cwd: root })
    expect(result.discoveredFiles).toBe(2)
    expect(result.supportedFiles).toBe(1)
    expect(result.rebuiltFiles).toBe(1)
    expect(result.reusedFiles).toBe(0)
    expect(result.unsupportedFiles).toBe(1)
    expect(result.unsupportedExtensions).toEqual([{ extension: ".heic", count: 1 }])

    await writeFile(path.join(root, "private", "evidence.md"), "Changed version.\n", "utf8")
    const report = await audit(root)

    expect(report.missingFromIndex).toEqual([])
    expect(report.staleInIndex).toEqual(["private/evidence.md"])
    expect(report.skippedFiles).toEqual([
      expect.objectContaining({
        relativePath: "private/scan.heic",
        reason: "unsupported-extension",
      }),
    ])
  })

  it("reuses unchanged indexed rows during incremental ingest", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mimir-ingest-"))
    tempDirs.push(root)
    await initProject(root)
    await mkdir(path.join(root, "private"), { recursive: true })
    await writeFile(path.join(root, "private", "alpha.md"), "Alpha evidence.\n", "utf8")
    await writeFile(path.join(root, "private", "beta.md"), "Beta evidence.\n", "utf8")

    const first = await ingest({ cwd: root })
    await writeFile(path.join(root, "private", "beta.md"), "Changed beta evidence.\n", "utf8")
    const second = await ingest({ cwd: root })

    expect(first.indexedFiles).toBe(2)
    expect(second.indexedFiles).toBe(2)
    expect(second.rebuiltFiles).toBe(1)
    expect(second.reusedFiles).toBe(1)
  })
})
