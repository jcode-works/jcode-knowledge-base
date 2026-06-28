import { readFile } from "node:fs/promises";
import { htmlToText } from "html-to-text";
import { extractText, getDocumentProxy } from "unpdf";
import YAML from "yaml";
export async function parseFile(file) {
    let text;
    switch (file.extension) {
        case ".pdf":
            text = await parsePdf(file.absolutePath);
            break;
        case ".html":
        case ".htm":
            text = htmlToText(await readFile(file.absolutePath, "utf8"), {
                wordwrap: false,
                selectors: [
                    { selector: "a", options: { ignoreHref: true } },
                    { selector: "img", format: "skip" },
                ],
            });
            break;
        case ".json":
            text = JSON.stringify(JSON.parse(await readFile(file.absolutePath, "utf8")), null, 2);
            break;
        case ".yaml":
        case ".yml":
            text = YAML.stringify(YAML.parse(await readFile(file.absolutePath, "utf8")));
            break;
        default:
            text = await readFile(file.absolutePath, "utf8");
    }
    return { file, text: normalizeText(text) };
}
async function parsePdf(filePath) {
    const buffer = await readFile(filePath);
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });
    return result.text;
}
function normalizeText(input) {
    return input
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{4,}/g, "\n\n\n")
        .trim();
}
//# sourceMappingURL=parsing.js.map