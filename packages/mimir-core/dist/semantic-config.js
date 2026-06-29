import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { findProjectRoot } from "./config.js";
import { CONFIG_PATH, DEFAULT_CONFIG } from "./defaults.js";
import { initProject } from "./init.js";
export async function enableSemanticEmbeddings(cwd = process.cwd()) {
    const projectRoot = findProjectRoot(cwd);
    await initProject(projectRoot);
    const configPath = path.join(projectRoot, CONFIG_PATH);
    const rawConfig = JSON.parse(await readFile(configPath, "utf8"));
    if (!isRecord(rawConfig)) {
        throw new Error(`${CONFIG_PATH} must contain a JSON object.`);
    }
    const embeddingModel = typeof rawConfig.embeddingModel === "string"
        ? rawConfig.embeddingModel
        : DEFAULT_CONFIG.embeddingModel;
    const embeddingModelPath = typeof rawConfig.embeddingModelPath === "string"
        ? rawConfig.embeddingModelPath
        : DEFAULT_CONFIG.embeddingModelPath;
    const nextConfig = {
        ...rawConfig,
        embeddingProvider: "transformers",
        embeddingModel,
        embeddingModelPath,
        transformersAllowRemoteModels: false,
    };
    await writeFile(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, "utf8");
    return {
        configPath,
        embeddingProvider: "transformers",
        embeddingModel,
        embeddingModelPath,
        transformersAllowRemoteModels: false,
    };
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=semantic-config.js.map