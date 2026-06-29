import { mkdir } from "node:fs/promises";
import * as lancedb from "@lancedb/lancedb";
export async function writeRows(rows, config) {
    await mkdir(config.storageDir, { recursive: true });
    const db = await lancedb.connect(config.storageDir);
    if (rows.length === 0) {
        const tableNames = await db.tableNames();
        if (tableNames.includes(config.tableName)) {
            await db.dropTable(config.tableName);
        }
        return;
    }
    const records = rows.map((row) => ({ ...row }));
    await db.createTable(config.tableName, records, {
        mode: "overwrite",
    });
}
export async function openRowsTable(config) {
    const db = await lancedb.connect(config.storageDir);
    const tableNames = await db.tableNames();
    if (!tableNames.includes(config.tableName)) {
        return null;
    }
    return db.openTable(config.tableName);
}
export async function readRows(config) {
    const table = await openRowsTable(config);
    if (!table) {
        return [];
    }
    return (await table.query().toArray()).map((row) => ({
        ...row,
        vector: normalizeVector(row.vector),
    }));
}
export async function countRows(config) {
    const table = await openRowsTable(config);
    return table ? table.countRows() : 0;
}
function normalizeVector(vector) {
    if (Array.isArray(vector) && vector.every((value) => typeof value === "number")) {
        return vector;
    }
    if (ArrayBuffer.isView(vector) && "length" in vector) {
        return Array.from(vector);
    }
    if (hasIndexedNumberGetter(vector)) {
        return Array.from({ length: vector.length }, (_, index) => vector.get(index));
    }
    throw new Error("Stored vector row is not a numeric vector.");
}
function hasIndexedNumberGetter(value) {
    return (typeof value === "object" &&
        value !== null &&
        "length" in value &&
        typeof value.length === "number" &&
        "get" in value &&
        typeof value.get === "function");
}
//# sourceMappingURL=store.js.map