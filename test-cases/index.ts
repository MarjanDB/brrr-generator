import fs from "node:fs";
import path from "node:path";

const CASES_ROOT = path.join(import.meta.dirname, "cases");

type ExportFile = { fileName: string; xml: string };

// One case: a folder holding broker exports in input/ and the tax authority files they should
// produce in expected/<authority>/<year>/. A case may also run on other cases' exports.
function testCase(folder: string, borrowsInputsFrom: { readInputs(): ExportFile[] }[] = []) {
	const root = path.join(CASES_ROOT, folder);
	const inputDir = path.join(root, "input");
	const inputPath = (fileName: string) => path.join(inputDir, fileName);
	const expectedPath = (relativePath: string) => path.join(root, "expected", relativePath);
	const readInput = (fileName: string): ExportFile => ({
		fileName,
		xml: fs.readFileSync(inputPath(fileName), "utf-8"),
	});
	const ownInputs = () => (fs.existsSync(inputDir) ? fs.readdirSync(inputDir).map(readInput) : []);

	return {
		inputPath,
		expectedPath,
		// Both files of one report, e.g. "slovenia/2022/kdvp-fifo".
		expectedReport: (name: string) => ({
			xmlPath: expectedPath(`${name}.xml`),
			csvPath: expectedPath(`${name}.csv`),
		}),
		readInput,
		// Every export the case runs on, sorted by file name, shaped for
		// BrokerageRegistry.loadAndTransformDetected.
		readInputs: (): ExportFile[] =>
			[...ownInputs(), ...borrowsInputsFrom.flatMap((other) => other.readInputs())].sort((a, b) =>
				a.fileName < b.fileName ? -1 : a.fileName > b.fileName ? 1 : 0,
			),
		readExpected: (relativePath: string) => fs.readFileSync(expectedPath(relativePath), "utf-8"),
	};
}

const stockTrade = testCase("Ibkr/StockTrade");
const optionTrade = testCase("Ibkr/OptionTrade");
const dividends = testCase("Ibkr/Dividends");
const paymentInLieuOfDividends = testCase("Ibkr/PaymentInLieuOfDividends");
const duplicatingTrades = testCase("Ibkr/DuplicatingTrades");
const corporateAction = testCase("Ibkr/CorporateAction");
const corporateActionsTwoRows = testCase("Ibkr/CorporateActionsTwoRows");

// The test cases: broker exports and the tax authority files expected from them.
export const TestKit = {
	ibkr: {
		stockTrade,
		optionTrade,
		dividends,
		paymentInLieuOfDividends,
		duplicatingTrades,
		corporateAction,
		corporateActionsTwoRows,
		// Every export above at once.
		allFixtures: testCase("Ibkr/AllFixtures", [
			stockTrade,
			optionTrade,
			dividends,
			paymentInLieuOfDividends,
			duplicatingTrades,
			corporateAction,
			corporateActionsTwoRows,
		]),
	},
};
