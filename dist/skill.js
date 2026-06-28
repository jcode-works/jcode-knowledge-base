import { cp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureMimirGitignore } from "./gitignore.js";
const PACKAGE_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SKILL_NAME = "mimir";
export function bundledSkillPath() {
    return path.join(PACKAGE_ROOT, "skills", SKILL_NAME);
}
export async function installSkill(options = {}) {
    const cwd = path.resolve(options.cwd ?? process.cwd());
    const targetDir = path.resolve(cwd, options.targetDir ?? ".mimir/skills");
    const skillPath = path.join(targetDir, SKILL_NAME);
    const mimirDir = path.resolve(cwd, ".mimir");
    const mcpConfigPath = path.join(mimirDir, "mcp.json");
    const readmePath = path.join(mimirDir, "README.md");
    await mkdir(targetDir, { recursive: true });
    await mkdir(mimirDir, { recursive: true });
    await cp(bundledSkillPath(), skillPath, { recursive: true, force: true });
    await writeFile(mcpConfigPath, `${JSON.stringify(mcpConfig(cwd), null, 2)}\n`, "utf8");
    await writeFile(readmePath, agentKitReadme(skillPath, mcpConfigPath), "utf8");
    const wroteGitignore = await ensureMimirGitignore(cwd);
    const written = [
        path.relative(cwd, skillPath),
        path.relative(cwd, mcpConfigPath),
        path.relative(cwd, readmePath),
    ];
    if (wroteGitignore) {
        written.push(".gitignore");
    }
    return {
        skillPath,
        mcpConfigPath,
        readmePath,
        written,
    };
}
function mcpConfig(cwd) {
    return {
        mcpServers: {
            mimir: {
                command: "pnpm",
                args: ["exec", "kb", "serve-mcp"],
                cwd,
            },
        },
    };
}
function agentKitReadme(skillPath, mcpConfigPath) {
    return `# Mimir Agent Kit

This folder contains portable agent instructions for Mimir.

## Skill

Skill folder:

\`\`\`plain text
${skillPath}
\`\`\`

Agents that support skill folders can load that folder directly.

## MCP

MCP config example:

\`\`\`plain text
${mcpConfigPath}
\`\`\`

Use the MCP server when your agent supports MCP tools. The server command is:

\`\`\`bash
pnpm exec kb serve-mcp
\`\`\`

`;
}
//# sourceMappingURL=skill.js.map