import fs from "node:fs";
import path from "node:path";

const CASES_ROOT = path.join(import.meta.dirname, "cases");

type ExportFile = { fileName: string; xml: string };

// One case: a folder holding broker exports in input/ and the tax authority files they should
// produce in expected/<authority>/<year>/. Each case is self-contained.
function testCase(folder: string) {
	const root = path.join(CASES_ROOT, folder);
	const inputDir = path.join(root, "input");
	const inputPath = (fileName: string) => path.join(inputDir, fileName);
	const expectedPath = (relativePath: string) => path.join(root, "expected", relativePath);
	const readInput = (fileName: string): ExportFile => ({
		fileName,
		xml: fs.readFileSync(inputPath(fileName), "utf-8"),
	});

	return {
		inputPath,
		expectedPath,
		// Both files of one report, e.g. "slovenia/2022/kdvp-fifo".
		expectedReport: (name: string) => ({
			xmlPath: expectedPath(`${name}.xml`),
			csvPath: expectedPath(`${name}.csv`),
		}),
		readInput,
		// Every export in input/, sorted by file name, shaped for
		// BrokerageRegistry.loadAndTransformDetected.
		readInputs: (): ExportFile[] => fs.readdirSync(inputDir).sort().map(readInput),
		readExpected: (relativePath: string) => fs.readFileSync(expectedPath(relativePath), "utf-8"),
	};
}

// The test cases: broker exports and the tax authority files expected from them.
export const TestKit = {
	ibkr: {
		stockTrade: testCase("Ibkr/StockTrade"),
		optionTrade: testCase("Ibkr/OptionTrade"),
		dividends: testCase("Ibkr/Dividends"),
		paymentInLieuOfDividends: testCase("Ibkr/PaymentInLieuOfDividends"),
		duplicatingTrades: testCase("Ibkr/DuplicatingTrades"),
		corporateAction: testCase("Ibkr/CorporateAction"),
		corporateActionsTwoRows: testCase("Ibkr/CorporateActionsTwoRows"),
		// SMCI bought before and after its 10-for-1 split on 2024-09-30, then sold.
		split: testCase("Ibkr/Split"),
	},
};
