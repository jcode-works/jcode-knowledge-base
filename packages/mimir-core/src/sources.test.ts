import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { addSourceEntries, listSourceEntries } from "./sources.js"

const tempDirs: string[] = []

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true })
  }
})

describe("source entries", () => {
  it("creates the sources file and adds path or glob entries without duplicates", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mimir-sources-"))
    tempDirs.push(root)

    const result = await addSourceEntries({
      cwd: root,
      entries: ["../apps/*/README.md", "../apps/*/docs/**/*.md", "../apps/*/README.md"],
    })

    expect(result.added).toEqual(["../apps/*/README.md", "../apps/*/docs/**/*.md"])
    expect(result.skipped).toEqual([])
    await expect(readFile(path.join(root, ".mimir", "sources.txt"), "utf8")).resolves.toContain(
      "../apps/*/docs/**/*.md\n",
    )

    const second = await addSourceEntries({
      cwd: root,
      entries: ["../apps/*/README.md", "!../apps/**/node_modules/**"],
    })

    expect(second.added).toEqual(["!../apps/**/node_modules/**"])
    expect(second.skipped).toEqual(["../apps/*/README.md"])
    await expect(listSourceEntries(root)).resolves.toEqual({
      sourcesFile: path.join(root, ".mimir", "sources.txt"),
      entries: ["../apps/*/README.md", "../apps/*/docs/**/*.md", "!../apps/**/node_modules/**"],
    })
  })

  it("preserves existing comments while listing only active entries", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "mimir-sources-"))
    tempDirs.push(root)
    await mkdir(path.join(root, ".mimir"), { recursive: true })
    await writeFile(
      path.join(root, ".mimir", "sources.txt"),
      "# Existing notes\n\n../docs/**/*.md\n",
      "utf8",
    )

    await expect(listSourceEntries(root)).resolves.toEqual({
      sourcesFile: path.join(root, ".mimir", "sources.txt"),
      entries: ["../docs/**/*.md"],
    })

    await addSourceEntries({ cwd: root, entries: ["../apps/*/README.md"] })

    await expect(readFile(path.join(root, ".mimir", "sources.txt"), "utf8")).resolves.toBe(
      "# Existing notes\n\n../docs/**/*.md\n../apps/*/README.md\n",
    )
  })
})
