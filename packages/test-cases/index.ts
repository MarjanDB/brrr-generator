import fs from "node:fs";
import path from "node:path";

const CASES_ROOT = path.join(import.meta.dirname, "cases");

type ExportFile = { fileName: string; xml: string };
type InputFile = { fileName: string; path: string; read(): ExportFile };
type ExpectedReport = { xmlPath: string; csvPath: string };

// Names a case gives its files, mapped to the file names on disk.
type FileNames = Record<string, string>;

// The folders under expected/, one per tax authority.
enum AuthorityFolder {
	Slovenia = "slovenia",
}

// The same keys, each value mapped. TypeScript can't follow the keys through a loop, hence the cast.
function mapValues<T extends FileNames, U>(
	record: T,
	map: (value: string) => U,
): { [K in keyof T]: U } {
	const result: Partial<{ [K in keyof T]: U }> = {};
	for (const key of Object.keys(record) as (keyof T)[]) {
		result[key] = map(record[key]);
	}
	return result as { [K in keyof T]: U };
}

function inputFile(root: string, fileName: string): InputFile {
	const filePath = path.join(root, "input", fileName);
	return {
		fileName,
		path: filePath,
		read: () => ({ fileName, xml: fs.readFileSync(filePath, "utf-8") }),
	};
}

function expectedReport(root: string, authority: AuthorityFolder, name: string): ExpectedReport {
	return {
		xmlPath: path.join(root, "expected", authority, `${name}.xml`),
		csvPath: path.join(root, "expected", authority, `${name}.csv`),
	};
}

// Fails on import when the files a case declares and the files in its folder differ, either way.
function checkFolder(root: string, declared: string[]): void {
	const onDisk = fs
		.readdirSync(root, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => path.join(entry.parentPath, entry.name));
	const missing = declared.filter((file) => !onDisk.includes(file));
	const undeclared = onDisk.filter((file) => !declared.includes(file));
	if (missing.length > 0 || undeclared.length > 0) {
		throw new Error(
			`Test case ${root} doesn't match its registry entry. Missing: ${missing.join(", ") || "none"}. ` +
				`Not declared: ${undeclared.join(", ") || "none"}.`,
		);
	}
}

// A case for one year: broker exports in input/, and the reports they should produce in
// expected/<authority>/<name>.{xml,csv}.
function testCase<I extends FileNames, S extends FileNames>(definition: {
	folder: string;
	year: number;
	inputs: I;
	expected: { slovenia: S };
}) {
	const root = path.join(CASES_ROOT, definition.folder);
	const inputs = mapValues(definition.inputs, (fileName) => inputFile(root, fileName));
	const expected = {
		slovenia: mapValues(definition.expected.slovenia, (name) =>
			expectedReport(root, AuthorityFolder.Slovenia, name),
		),
	};
	checkFolder(root, [
		...Object.values(inputs).map((input) => input.path),
		...Object.values(expected.slovenia).flatMap((report) => [report.xmlPath, report.csvPath]),
	]);

	return {
		year: definition.year,
		inputs,
		// Every declared export, in declaration order, shaped for BrokerRegistry.loadAndTransformDetected.
		readInputs: (): ExportFile[] => Object.values(inputs).map((input) => input.read()),
		expected,
	};
}

// Exports with no expected reports, read by unit tests.
function exportsOnly<I extends FileNames>(definition: { folder: string; inputs: I }) {
	const root = path.join(CASES_ROOT, definition.folder);
	const inputs = mapValues(definition.inputs, (fileName) => inputFile(root, fileName));
	checkFolder(
		root,
		Object.values(inputs).map((input) => input.path),
	);

	return { inputs };
}

// The test cases: broker exports and the tax authority files expected from them.
export const TestKit = {
	ibkr: {
		stockTrade: testCase({
			folder: "Ibkr/StockTrade",
			year: 2022,
			inputs: { simpleStockTrade: "SimpleStockTrade.xml" },
			expected: { slovenia: { kdvpFifo: "kdvp-fifo", kdvpProvided: "kdvp-provided" } },
		}),
		optionTrade: testCase({
			folder: "Ibkr/OptionTrade",
			year: 2023,
			inputs: { simpleOptionTrade: "SimpleOptionTrade.xml" },
			expected: { slovenia: { ifiFifo: "ifi-fifo" } },
		}),
		dividends: testCase({
			folder: "Ibkr/Dividends",
			year: 2022,
			inputs: { simpleCashTransactionOfDividends: "SimpleCashTransactionOfDividends.xml" },
			expected: { slovenia: { div: "div" } },
		}),
		paymentInLieuOfDividends: testCase({
			folder: "Ibkr/PaymentInLieuOfDividends",
			year: 2024,
			inputs: {
				simpleCashTransactionOfPaymentInLieuOfDividends:
					"SimpleCashTransactionOfPaymentInLieuOfDividends.xml",
			},
			expected: { slovenia: { div: "div" } },
		}),
		duplicatingTrades: testCase({
			folder: "Ibkr/DuplicatingTrades",
			year: 2024,
			inputs: { duplicatingTrades: "DuplicatingTrades.xml" },
			expected: { slovenia: { kdvpFifo: "kdvp-fifo" } },
		}),
		// SMCI bought before and after its 10-for-1 split on 2024-09-30, then sold.
		split: testCase({
			folder: "Ibkr/Split",
			year: 2024,
			inputs: { smciSplit: "SmciSplit.xml" },
			expected: { slovenia: { kdvpFifo: "kdvp-fifo" } },
		}),
		corporateAction: exportsOnly({
			folder: "Ibkr/CorporateAction",
			inputs: { simpleCorporateAction: "SimpleCorporateAction.xml" },
		}),
		corporateActionsTwoRows: exportsOnly({
			folder: "Ibkr/CorporateActionsTwoRows",
			inputs: { corporateActionsTwoRows: "CorporateActionsTwoRows.xml" },
		}),
	},
};
