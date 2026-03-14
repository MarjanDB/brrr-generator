import {
	ApplyIdentifierRelationshipsService,
	createContainer,
	DivReportGenerator,
	IbkrBrokerageExportProvider,
	IfiReportGenerator,
	KdvpReportGenerator,
	SlovenianTaxAuthorityProvider,
	SlovenianTaxAuthorityReportTypes,
	StagingFinancialGroupingProcessor,
	TaxAuthorityLotMatchingMethod,
	TaxPayerConfigSchema,
	zDateTimeFromISOString,
} from "@brrr/lib";
import { NodeInfoProvider } from "@brrr/lib/InfoProviders/Node/NodeInfoProvider.ts";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { load as parseYaml } from "js-yaml";
import fs from "fs/promises";
import { Command } from "commander";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const IMPORTS_DIR = join(PROJECT_ROOT, "imports");
const EXPORTS_DIR = join(PROJECT_ROOT, "exports");
const CONFIG_FILE = join(PROJECT_ROOT, "config", "userConfig.yml");

const REPORT_MAP: Record<string, SlovenianTaxAuthorityReportTypes> = {
	kdvp: SlovenianTaxAuthorityReportTypes.DOH_KDVP,
	div: SlovenianTaxAuthorityReportTypes.DOH_DIV,
	ifi: SlovenianTaxAuthorityReportTypes.D_IFI,
};

const OUTPUT_FILES = {
	[SlovenianTaxAuthorityReportTypes.DOH_KDVP]: { xml: "Doh_KDVP.xml", csv: "export-trades.csv" },
	[SlovenianTaxAuthorityReportTypes.DOH_DIV]: { xml: "Doh_Div.xml", csv: "export-dividends.csv" },
	[SlovenianTaxAuthorityReportTypes.D_IFI]: { xml: "D_Ifi.xml", csv: "export-derivatives.csv" },
} satisfies Partial<Record<SlovenianTaxAuthorityReportTypes, { xml: string; csv: string }>>;

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
	if (isNaN(year)) {
		console.error(`Invalid year: ${opts.year}`);
		process.exit(1);
	}

	const reportTypes: SlovenianTaxAuthorityReportTypes[] = [];
	if (opts.report === "all") {
		reportTypes.push(...Object.values(REPORT_MAP));
	} else {
		for (const r of opts.report.split(",")) {
			const t = REPORT_MAP[r.trim().toLowerCase()];
			if (!t) {
				console.error(`Unknown report type: ${r}. Valid: kdvp, div, ifi, all`);
				process.exit(1);
			}
			reportTypes.push(t);
		}
	}

	const configRaw = parseYaml(await fs.readFile(CONFIG_FILE, "utf-8"));
	const configParsed = TaxPayerConfigSchema.safeParse(configRaw);
	if (!configParsed.success) {
		console.error("Invalid config.json:", configParsed.error.format());
		process.exit(1);
	}
	const taxPayerInfo = configParsed.data;

	const reportConfig = {
		fromDate: zDateTimeFromISOString.parse(`${year}-01-01`),
		toDate: zDateTimeFromISOString.parse(`${year + 1}-01-01`),
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
	};

	const container = createContainer(new NodeInfoProvider());

	const provider = new SlovenianTaxAuthorityProvider(
		taxPayerInfo,
		reportConfig,
		container.get(ApplyIdentifierRelationshipsService),
		container.get(KdvpReportGenerator),
		container.get(DivReportGenerator),
		container.get(IfiReportGenerator),
	);

	const ibkrProvider = container.get(IbkrBrokerageExportProvider);
	const groupingProcessor = container.get(StagingFinancialGroupingProcessor);

	const xmlContents: string[] = [];
	for (const entry of await fs.readdir(IMPORTS_DIR, { withFileTypes: true })) {
		if (entry.isFile() && entry.name.endsWith(".xml")) {
			xmlContents.push(await fs.readFile(`${IMPORTS_DIR}/${entry.name}`, "utf-8"));
		}
	}
	console.log(`Found ${xmlContents.length} XML file(s)`);

	const stagingEvents = ibkrProvider.loadAndTransform(xmlContents);
	const financialEvents = groupingProcessor.processStagingFinancialEvents(stagingEvents);
	console.log(`Processed ${financialEvents.groupings.length} grouping(s)`);

	await fs.mkdir(EXPORTS_DIR, { recursive: true });

	for (const reportType of reportTypes) {
		const files = (OUTPUT_FILES as Partial<Record<SlovenianTaxAuthorityReportTypes, { xml: string; csv: string }>>)[reportType];
		if (!files) {
			console.error(`No output file mapping for report type: ${reportType}`);
			process.exit(1);
		}
		const xmlOutput = await provider.generateExportForTaxAuthority(reportType, financialEvents);
		const csvOutput = await provider.generateSpreadsheetExport(reportType, financialEvents);
		await fs.writeFile(`${EXPORTS_DIR}/${files.xml}`, xmlOutput, "utf-8");
		await fs.writeFile(`${EXPORTS_DIR}/${files.csv}`, csvOutput, "utf-8");
		console.log(`Written: ${EXPORTS_DIR}/${files.xml}`);
		console.log(`Written: ${EXPORTS_DIR}/${files.csv}`);
	}
}

main();
