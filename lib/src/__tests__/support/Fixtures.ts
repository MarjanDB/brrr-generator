import fs from "node:fs";
import path from "node:path";
import { inject } from "vitest";

declare module "vitest" {
	interface ProvidedContext {
		srcRoot: string;
	}
}

// Absolute path of a file under lib/src, e.g. "Brokerages/Ibkr/__tests__/Cases/SimpleStockTrade.xml".
export function fixturePath(pathFromSrc: string): string {
	return path.join(inject("srcRoot"), pathFromSrc);
}

export function readFixture(pathFromSrc: string): string {
	return fs.readFileSync(fixturePath(pathFromSrc), "utf-8");
}
