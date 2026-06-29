import type { ParsedDocument, SourceFile } from "./types.js";
export interface ParseFileOptions {
    pdfOcrCommand?: string[];
    pdfOcrTimeoutMs?: number;
}
export declare function parseFile(file: SourceFile, options?: ParseFileOptions): Promise<ParsedDocument>;
//# sourceMappingURL=parsing.d.ts.map