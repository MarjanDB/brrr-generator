import { fixturePath, readFixture } from "@brrr/__tests__/support/Fixtures";
import { BrokerageRegistry } from "@brrr/Brokerages/BrokerageRegistry";
import { StagingFinancialGroupingProcessor } from "@brrr/Core/StagingProcessor/StagingFinancialGroupingProcessor";
import { createContainer } from "@brrr/container";
import { TreatyType } from "@brrr/InfoProviders/InfoProvider";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/PredefinedInfoProvider";
import {
	TaxAuthorityLotMatchingMethod,
	type TaxPayerInfo,
	TaxPayerType,
} from "@brrr/TaxAuthorities/ConfigurationProvider";
import { TaxAuthorityRegistry } from "@brrr/TaxAuthorities/TaxAuthorityRegistry";
import type { ValidDateTime } from "@brrr/Utils/DateTime";
import { DateTime, Settings, type Zone } from "luxon";

// Golden outputs for every report. These pin the generated XML and CSV byte for byte, so
// refactors can prove they change nothing. Never regenerate them to make a refactor pass.

// The registry takes report type IDs as strings; this enum pins the three it knows.
enum ReportTypeId {
	KDVP = "kdvp",
	DIV = "div",
	IFI = "ifi",
}

type GoldenCase = {
	name: string;
	files: string[]; // paths from lib/src, read with readFixture
	year: number;
	reportTypeId: ReportTypeId;
	lotMatchingMethod: TaxAuthorityLotMatchingMethod;
};

const IBKR = "Brokerages/Ibkr/__tests__/Cases/";
const SLOVENIA = "TaxAuthorities/Slovenia/__tests__/";
const ALL = [
	`${IBKR}SimpleStockTrade.xml`,
	`${IBKR}SimpleOptionTrade.xml`,
	`${IBKR}SimpleCashTransactionOfDividends.xml`,
	`${IBKR}SimpleCashTransactionOfPaymentInLieuOfDividends.xml`,
	`${IBKR}SimpleCorporateAction.xml`,
	`${IBKR}CorporateActionsTwoRows.xml`,
	`${SLOVENIA}DuplicatingTrades.xml`,
];
const FIFO = TaxAuthorityLotMatchingMethod.FIFO;

const CASES: GoldenCase[] = [
	{
		name: "kdvp-2022-fifo",
		files: [`${IBKR}SimpleStockTrade.xml`],
		year: 2022,
		reportTypeId: ReportTypeId.KDVP,
		lotMatchingMethod: FIFO,
	},
	{
		name: "kdvp-2022-provided",
		files: [`${IBKR}SimpleStockTrade.xml`],
		year: 2022,
		reportTypeId: ReportTypeId.KDVP,
		lotMatchingMethod: TaxAuthorityLotMatchingMethod.PROVIDED,
	},
	{
		name: "kdvp-2024-fifo",
		files: [`${SLOVENIA}DuplicatingTrades.xml`],
		year: 2024,
		reportTypeId: ReportTypeId.KDVP,
		lotMatchingMethod: FIFO,
	},
	{
		name: "ifi-2023-fifo",
		files: [`${IBKR}SimpleOptionTrade.xml`],
		year: 2023,
		reportTypeId: ReportTypeId.IFI,
		lotMatchingMethod: FIFO,
	},
	{
		name: "div-2022",
		files: [`${IBKR}SimpleCashTransactionOfDividends.xml`],
		year: 2022,
		reportTypeId: ReportTypeId.DIV,
		lotMatchingMethod: FIFO,
	},
	{
		name: "div-2024",
		files: [`${IBKR}SimpleCashTransactionOfPaymentInLieuOfDividends.xml`],
		year: 2024,
		reportTypeId: ReportTypeId.DIV,
		lotMatchingMethod: FIFO,
	},
	// All fixtures together: merging, corporate actions, several groupings.
	...Object.values(ReportTypeId).flatMap((reportTypeId) =>
		[2022, 2023, 2024].map((year) => ({
			name: `all-${reportTypeId}-${year}`,
			files: ALL,
			year,
			reportTypeId,
			lotMatchingMethod: FIFO,
		})),
	),
];

const taxPayerInfo: TaxPayerInfo = {
	taxNumber: "12345678",
	taxpayerType: TaxPayerType.PHYSICAL_SUBJECT,
	name: "Ime Priimek",
	address1: "Naslov 1",
	address2: null,
	city: "Ljubljana",
	postNumber: "1000",
	postName: "Ljubljana",
	municipalityName: "Ljubljana",
	birthDate: DateTime.fromISO("1990-01-01") as ValidDateTime,
	maticnaStevilka: "1234567",
	invalidskoPodjetje: false,
	resident: true,
	activityCode: "",
	activityName: "",
	countryId: "SI",
	countryName: "Slovenija",
};

function infoProvider(): PredefinedInfoProvider {
	const info = new PredefinedInfoProvider();
	info.addCompany("FR0000120271", {
		shortName: "TotalEnergies",
		longName: "TotalEnergies SE",
		location: {
			country: "France",
			address1: "2 Place Jean Millier",
			address2: null,
			zipCode: "92400",
			city: "Courbevoie",
			state: null,
			shortCodeCountry2: "FR",
		},
	});
	info.addCompany("US5801351017", {
		shortName: "McDonald's",
		longName: "McDonald's Corporation",
		location: {
			country: "United States",
			address1: "110 North Carpenter Street",
			address2: null,
			zipCode: "60607",
			city: "Chicago",
			state: "IL",
			shortCodeCountry2: "US",
		},
	});
	info.addCountry("France", {
		name: "France",
		shortCode2: "FR",
		treaties: new Map([[TreatyType.TaxRelief, "Article 10"]]),
	});
	info.addCountry("United States", {
		name: "United States",
		shortCode2: "US",
		treaties: new Map([[TreatyType.TaxRelief, "Article 10"]]),
	});
	return info;
}

let originalZone: Zone;
let originalNow: () => number;

beforeAll(() => {
	originalZone = Settings.defaultZone;
	originalNow = Settings.now;
	// The CSVs carry UTC offsets and DIV's self-report flag reads the clock: pin both.
	Settings.defaultZone = "Europe/Ljubljana";
	const now = DateTime.fromISO("2026-03-01T12:00:00Z").toMillis();
	Settings.now = () => now;
});

afterAll(() => {
	Settings.defaultZone = originalZone;
	Settings.now = originalNow;
});

test.each(CASES)("$name", async (golden) => {
	const container = createContainer(infoProvider());
	const files = golden.files.map((file) => ({ fileName: file, xml: readFixture(file) }));

	const { stagingEvents } = container.get(BrokerageRegistry).loadAndTransformDetected(files);
	const events = container
		.get(StagingFinancialGroupingProcessor)
		.processStagingFinancialEvents(stagingEvents);

	const { xml, csv } = await container.get(TaxAuthorityRegistry).generateExports({
		authorityId: "slovenia",
		reportTypeId: golden.reportTypeId,
		taxPayerInfo,
		reportConfig: {
			fromDate: DateTime.fromISO(`${golden.year}-01-01`) as ValidDateTime,
			toDate: DateTime.fromISO(`${golden.year + 1}-01-01`) as ValidDateTime,
			lotMatchingMethod: golden.lotMatchingMethod,
		},
		events,
	});

	await expect(xml).toMatchFileSnapshot(
		fixturePath(`${SLOVENIA}__snapshots__/golden/${golden.name}.xml`),
	);
	await expect(csv).toMatchFileSnapshot(
		fixturePath(`${SLOVENIA}__snapshots__/golden/${golden.name}.csv`),
	);
});
