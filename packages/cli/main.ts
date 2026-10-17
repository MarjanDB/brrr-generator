import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	BrokerageRegistry,
	createContainer,
	SlovenianReportTypeId,
	StagingFinancialGroupingProcessor,
	TaxAuthorityId,
	TaxAuthorityLotMatchingMethod,
	TaxAuthorityRegistry,
	TaxPayerConfigSchema,
	zDateTimeFromISOString,
} from "@brrr/lib";
import { NodeInfoProvider } from "@brrr/lib/info/node";
import { Command } from "commander";
import { load as parseYaml } from "js-yaml";

// The workspace root is the closest directory above this file holding pnpm-workspace.yaml.
function findWorkspaceRoot(startDir: string): string {
	let dir = path.resolve(startDir);
	while (!existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
		const parent = path.dirname(dir);
		if (parent === dir) {
			throw new Error(
				`Could not find the workspace root (no pnpm-workspace.yaml above ${startDir})`,
			);
		}
		dir = parent;
	}
	return dir;
}

const ROOT = findWorkspaceRoot(path.dirname(fileURLToPath(import.meta.url)));
const IMPORTS_DIR = path.join(ROOT, "imports");
const EXPORTS_DIR = path.join(ROOT, "exports");
const CONFIG_FILE = path.join(ROOT, "config", "userConfig.yml");

const OUTPUT_FILES: Record<SlovenianReportTypeId, { xml: string; csv: string }> = {
	[SlovenianReportTypeId.KDVP]: { xml: "Doh_KDVP.xml", csv: "export-trades.csv" },
	[SlovenianReportTypeId.DIV]: { xml: "Doh_Div.xml", csv: "export-dividends.csv" },
	[SlovenianReportTypeId.IFI]: { xml: "D_Ifi.xml", csv: "export-derivatives.csv" },
};

function parseReportTypeId(value: string): SlovenianReportTypeId | undefined {
	return Object.values(SlovenianReportTypeId).find((id) => id === value);
}

async function main() {
	const program = new Command();

	program
		.name("ib-tax")
		.description("Generate Slovenian tax reports from IBKR exports")
		.requiredOption("--year <year>", "Reporting year, e.g. 2025")
		.option("--report <type>", "Report type: kdvp, div, ifi, or all", "all")
		.parse(process.argv);

	const opts = program.opts<{ year: string; report: string }>();

	const year = parseInt(opts.year, 10);
	if (Number.isNaN(year)) {
		console.error(`Invalid year: ${opts.year}`);
		process.exit(1);
	}

	const validReportTypes = Object.values(SlovenianReportTypeId);
	const reportTypes: SlovenianReportTypeId[] = [];
	if (opts.report === "all") {
		reportTypes.push(...validReportTypes);
	} else {
		for (const r of opts.report.split(",")) {
			const reportType = parseReportTypeId(r.trim().toLowerCase());
			if (!reportType) {
				console.error(`Unknown report type: ${r}. Valid: ${validReportTypes.join(", ")}, all`);
				process.exit(1);
			}
			reportTypes.push(reportType);
		}
	}

	const configRaw = parseYaml(await fs.readFile(CONFIG_FILE, "utf-8"));
	const configParsed = TaxPayerConfigSchema.safeParse(configRaw);
	if (!configParsed.success) {
		console.error("Invalid userConfig.yml:");
		for (const issue of configParsed.error.issues) {
			console.error(`  ${issue.path.map(String).join(".")}: ${issue.message}`);
		}
		process.exit(1);
	}
	const taxPayerInfo = configParsed.data;

	const reportConfig = {
		fromDate: zDateTimeFromISOString.parse(`${year}-01-01`),
		toDate: zDateTimeFromISOString.parse(`${year + 1}-01-01`),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const container = createContainer(new NodeInfoProvider());
	const brokerages = container.get(BrokerageRegistry);
	const groupingProcessor = container.get(StagingFinancialGroupingProcessor);
	const taxAuthorities = container.get(TaxAuthorityRegistry);

	const files: { fileName: string; xml: string }[] = [];
	for (const entry of await fs.readdir(IMPORTS_DIR, { withFileTypes: true })) {
		if (entry.isFile() && entry.name.endsWith(".xml")) {
			files.push({
				fileName: entry.name,
				xml: await fs.readFile(path.join(IMPORTS_DIR, entry.name), "utf-8"),
			});
		}
	}
	console.log(`Found ${files.length} XML file(s)`);

	const { detections, stagingEvents } = brokerages.loadAndTransformDetected(files);
	// A broker export that can't be read must stop the run: leaving it out would silently change
	// the reports (e.g. the cost basis of later sales).
	const unreadable = detections.filter((detection) => detection.error !== null);
	if (unreadable.length > 0) {
		for (const detection of unreadable) {
			console.error(`${detection.fileName} looks like a broker export but can't be read:`);
			console.error(detection.error);
		}
		process.exit(1);
	}
	for (const detection of detections) {
		if (detection.detectedBrokerage === null) {
			console.warn(`Skipping ${detection.fileName}: not a recognised broker export`);
		}
	}

	const financialEvents = groupingProcessor.processStagingFinancialEvents(stagingEvents);
	console.log(`Processed ${financialEvents.groupings.length} grouping(s)`);

	await fs.mkdir(EXPORTS_DIR, { recursive: true });

	for (const reportType of reportTypes) {
		const outputFiles = OUTPUT_FILES[reportType];
		const { xml, csv } = await taxAuthorities.generateExports({
			authorityId: TaxAuthorityId.SLOVENIA,
			reportTypeId: reportType,
			taxPayerInfo,
			reportConfig,
			events: financialEvents,
		});
		const xmlPath = path.join(EXPORTS_DIR, outputFiles.xml);
		const csvPath = path.join(EXPORTS_DIR, outputFiles.csv);
		await fs.writeFile(xmlPath, xml, "utf-8");
		await fs.writeFile(csvPath, csv, "utf-8");
		console.log(`Written: ${xmlPath}`);
		console.log(`Written: ${csvPath}`);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
