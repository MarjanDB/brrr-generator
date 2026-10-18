import { Scenario } from "@brrr/__tests__/support/Scenario";
import { DividendType } from "@brrr/Core/Models/Events/DividendType";
import {
	CashActionId,
	CashTransactionId,
	CurrencyCode,
	Isin,
	ListingExchange,
	Ticker,
	TradeEventId,
} from "@brrr/Core/Models/Identifiers";
import { Category } from "@brrr/Core/Models/Instrument/Category";
import { FinancialIdentifier } from "@brrr/Core/Models/Instrument/FinancialIdentifier";
import type { CompanyInfo } from "@brrr/InfoProviders/Models/CompanyInfo";
import { PredefinedInfoProvider } from "@brrr/InfoProviders/Predefined/PredefinedInfoProvider";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceDetailKind } from "@brrr/Provenance/Models/ProvenanceDetailKind";
import { ProvenanceDetailValue } from "@brrr/Provenance/Models/ProvenanceDetailValue";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { NullProvenanceRecorder } from "@brrr/Provenance/Services/NullProvenanceRecorder";
import { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";
import { ProvenanceWalker } from "@brrr/Provenance/Services/ProvenanceWalker";
import { TaxAuthorityLotMatchingMethod } from "@brrr/TaxAuthorities/Models/TaxAuthorityLotMatchingMethod";
import { DivReportGenerator } from "@brrr/TaxAuthorities/Slovenia/Services/Div/DivReportGenerator";

const { build } = Scenario;

const config = Scenario.config.report(2023, TaxAuthorityLotMatchingMethod.NONE);
const identifier = new FinancialIdentifier({
	isin: Isin.Schema.parse("ISIN"),
	ticker: Ticker.Schema.parse("Ticker"),
	name: "Name",
});

test("dividends add up per action, then per day, and are rounded at the end", async () => {
	const lines = await new DivReportGenerator(new PredefinedInfoProvider()).convert(
		config,
		[
			build.grouping({
				identifier,
				countryOfOrigin: null,
				category: Category.REGULAR,
				stockTrades: [],
				stockTaxLots: [],
				derivativeGroupings: [],
				cashTransactions: [
					// Action A pays twice. Only its first payment's own tax counts; the withholdings add to it.
					build.dividend({
						id: TradeEventId.Schema.parse("A-10"),
						date: "2023-06-07",
						amount: 10,
						actionId: CashActionId.Schema.parse("A"),
						transactionId: CashTransactionId.Schema.parse("A-10"),
						listingExchange: ListingExchange.Schema.parse("EXH"),
						dividendType: DividendType.ORDINARY,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0.5,
						fxRateToBase: 0.5,
					}),
					build.dividend({
						id: TradeEventId.Schema.parse("A-2.5"),
						date: "2023-06-07",
						amount: 2.5,
						actionId: CashActionId.Schema.parse("A"),
						transactionId: CashTransactionId.Schema.parse("A-2.5"),
						listingExchange: ListingExchange.Schema.parse("EXH"),
						dividendType: DividendType.ORDINARY,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0.7,
						fxRateToBase: 0.5,
					}),
					build.withholdingTax({
						id: TradeEventId.Schema.parse("A--1.5"),
						date: "2023-06-07",
						amount: -1.5,
						actionId: CashActionId.Schema.parse("A"),
						transactionId: CashTransactionId.Schema.parse("A--1.5"),
						listingExchange: ListingExchange.Schema.parse("EXH"),
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 0.5,
					}),
					build.withholdingTax({
						id: TradeEventId.Schema.parse("A--0.25"),
						date: "2023-06-07",
						amount: -0.25,
						actionId: CashActionId.Schema.parse("A"),
						transactionId: CashTransactionId.Schema.parse("A--0.25"),
						listingExchange: ListingExchange.Schema.parse("EXH"),
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 0.5,
					}),
					// Action B is paid on the same day, so it joins A's line.
					build.dividend({
						id: TradeEventId.Schema.parse("B-1"),
						date: "2023-06-07",
						amount: 1,
						actionId: CashActionId.Schema.parse("B"),
						transactionId: CashTransactionId.Schema.parse("B-1"),
						listingExchange: ListingExchange.Schema.parse("EXH"),
						dividendType: DividendType.ORDINARY,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 0.5,
					}),
					build.dividend({
						id: TradeEventId.Schema.parse("C-4.444"),
						date: "2023-06-08",
						amount: 4.444,
						actionId: CashActionId.Schema.parse("C"),
						transactionId: CashTransactionId.Schema.parse("C-4.444"),
						listingExchange: ListingExchange.Schema.parse("EXH"),
						dividendType: DividendType.ORDINARY,
						currency: CurrencyCode.Schema.parse("USD"),
						commission: 0,
						tax: 0,
						fxRateToBase: 0.5,
					}),
				],
			}),
		],
		new NullProvenanceRecorder(),
	);

	expect(
		lines.map((line) => ({
			date: line.dateReceived.toISODate(),
			tracking: line.dividendIdentifierForTracking,
			isin: line.dividendPayerIdentificationNumber,
			dividendAmount: line.dividendAmount,
			dividendAmountInOriginalCurrency: line.dividendAmountInOriginalCurrency,
			foreignTaxPaid: line.foreignTaxPaid,
			foreignTaxPaidInOriginalCurrency: line.foreignTaxPaidInOriginalCurrency,
		})),
	).toEqual([
		{
			date: "2023-06-07",
			tracking: "A-B",
			isin: "ISIN",
			dividendAmount: 13.5,
			dividendAmountInOriginalCurrency: 27,
			foreignTaxPaid: 1.25,
			foreignTaxPaidInOriginalCurrency: 2.5,
		},
		{
			date: "2023-06-08",
			tracking: "C",
			isin: "ISIN",
			dividendAmount: 4.44,
			dividendAmountInOriginalCurrency: 8.89,
			foreignTaxPaid: 0,
			foreignTaxPaidInOriginalCurrency: 0,
		},
	]);
});

test("a withholding without a dividend of the same action is rejected", async () => {
	await expect(
		new DivReportGenerator(new PredefinedInfoProvider()).convert(
			config,
			[
				build.grouping({
					identifier,
					countryOfOrigin: null,
					category: Category.REGULAR,
					stockTrades: [],
					stockTaxLots: [],
					derivativeGroupings: [],
					cashTransactions: [
						build.dividend({
							id: TradeEventId.Schema.parse("A-10"),
							date: "2023-06-07",
							amount: 10,
							actionId: CashActionId.Schema.parse("A"),
							transactionId: CashTransactionId.Schema.parse("A-10"),
							listingExchange: ListingExchange.Schema.parse("EXH"),
							dividendType: DividendType.ORDINARY,
							currency: CurrencyCode.Schema.parse("USD"),
							commission: 0,
							tax: 0,
							fxRateToBase: 0.5,
						}),
						build.withholdingTax({
							id: TradeEventId.Schema.parse("B--1.5"),
							date: "2023-06-07",
							amount: -1.5,
							actionId: CashActionId.Schema.parse("B"),
							transactionId: CashTransactionId.Schema.parse("B--1.5"),
							listingExchange: ListingExchange.Schema.parse("EXH"),
							currency: CurrencyCode.Schema.parse("USD"),
							commission: 0,
							tax: 0,
							fxRateToBase: 0.5,
						}),
					],
				}),
			],
			new NullProvenanceRecorder(),
		),
	).rejects.toThrow("Edge case where Withholding Tax has no matching Dividend Cash Transaction");
});

test("a dividend line is recorded from its day's sum, which comes from its action's sum", async () => {
	const d1 = build.dividend({
		id: TradeEventId.Schema.parse("d1"),
		date: "2022-05-02",
		amount: 10,
		actionId: CashActionId.Schema.parse("A1"),
		transactionId: CashTransactionId.Schema.parse("d1"),
		listingExchange: ListingExchange.Schema.parse("EXH"),
		dividendType: DividendType.ORDINARY,
		currency: CurrencyCode.Schema.parse("USD"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const w1 = build.withholdingTax({
		id: TradeEventId.Schema.parse("w1"),
		date: "2022-05-02",
		amount: -1.5,
		actionId: CashActionId.Schema.parse("A1"),
		transactionId: CashTransactionId.Schema.parse("w1"),
		listingExchange: ListingExchange.Schema.parse("EXH"),
		currency: CurrencyCode.Schema.parse("USD"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const d0 = build.dividend({
		id: TradeEventId.Schema.parse("d0"),
		date: "2021-12-30",
		amount: 4,
		actionId: CashActionId.Schema.parse("A0"),
		transactionId: CashTransactionId.Schema.parse("d0"),
		listingExchange: ListingExchange.Schema.parse("EXH"),
		dividendType: DividendType.ORDINARY,
		currency: CurrencyCode.Schema.parse("USD"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const dividendGrouping = build.grouping({
		identifier: new FinancialIdentifier({
			isin: Isin.Schema.parse("US0000000001"),
			ticker: Ticker.Schema.parse("PAY"),
			name: "Payer",
		}),
		countryOfOrigin: null,
		category: Category.REGULAR,
		stockTrades: [],
		stockTaxLots: [],
		derivativeGroupings: [],
		cashTransactions: [d1, w1, d0],
	});
	const graph = new ProvenanceGraph({ parent: null });
	graph.node(d1, ProvenanceNodeKind.EVENT, "dividend d1 · PAY", {});
	graph.node(w1, ProvenanceNodeKind.EVENT, "withholding tax w1 · PAY", {});
	graph.node(d0, ProvenanceNodeKind.EVENT, "dividend d0 · PAY", {});

	const [line] = await new DivReportGenerator(new PredefinedInfoProvider()).convert(
		Scenario.config.report(2022, TaxAuthorityLotMatchingMethod.FIFO),
		[dividendGrouping],
		graph,
	);

	const walker = new ProvenanceWalker(graph);
	const lineNode = graph.nodeOf(line);
	expect(lineNode.kind).toEqual(ProvenanceNodeKind.REPORT_LINE);
	expect(lineNode.label).toEqual("DOH_DIV 2022-05-02 · US0000000001 · 10");
	const lineParents = walker.parents(lineNode);
	expect(lineParents).toHaveLength(1);
	expect(lineParents[0].change).toEqual(ProvenanceChange.REPORTED);
	const daySum = lineParents[0].from;
	expect(daySum.kind).toEqual(ProvenanceNodeKind.SUM);
	expect(daySum.label).toEqual("day sum 2022-05-02 · 1");
	const daySumParents = walker.parents(daySum);
	expect(daySumParents).toHaveLength(1);
	expect(daySumParents[0].change).toEqual(ProvenanceChange.MERGED);
	const actionSum = daySumParents[0].from;
	expect(actionSum.kind).toEqual(ProvenanceNodeKind.SUM);
	expect(actionSum.label).toEqual("action sum A1");
	const summed = walker.parents(actionSum);
	expect(summed).toHaveLength(2);
	expect(summed[0].change).toEqual(ProvenanceChange.SUMMED);
	expect(summed[0].from).toBe(graph.nodeOf(d1));
	expect(summed[1].from).toBe(graph.nodeOf(w1));
	expect(graph.drops()).toHaveLength(1);
	expect(graph.drops()[0].node).toBe(graph.nodeOf(d0));
	expect(graph.drops()[0].reason).toEqual(DropReason.OUTSIDE_PERIOD);
	expect(graph.drops()[0].detail?.kind).toEqual(ProvenanceDetailKind.PAID_OUTSIDE_PERIOD);
	expect(graph.drops()[0].detail?.values[ProvenanceDetailValue.DATE]).toEqual("2021-12-30");
});

// Wiring for one test, not test data: a lookup that cannot be reached.
class OfflineInfoProvider extends PredefinedInfoProvider {
	public override async getCompanyInfo(_isin: Isin): Promise<CompanyInfo | null> {
		throw new Error("offline");
	}
}

test("a failed company lookup warns on the line, which still goes out", async () => {
	const d1 = build.dividend({
		id: TradeEventId.Schema.parse("d1"),
		date: "2022-05-02",
		amount: 10,
		actionId: CashActionId.Schema.parse("A1"),
		transactionId: CashTransactionId.Schema.parse("d1"),
		listingExchange: ListingExchange.Schema.parse("EXH"),
		dividendType: DividendType.ORDINARY,
		currency: CurrencyCode.Schema.parse("USD"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const dividendGrouping = build.grouping({
		identifier: new FinancialIdentifier({
			isin: Isin.Schema.parse("US0000000001"),
			ticker: Ticker.Schema.parse("PAY"),
			name: "Payer",
		}),
		countryOfOrigin: null,
		category: Category.REGULAR,
		stockTrades: [],
		stockTaxLots: [],
		derivativeGroupings: [],
		cashTransactions: [d1],
	});
	const graph = new ProvenanceGraph({ parent: null });
	graph.node(d1, ProvenanceNodeKind.EVENT, "dividend d1 · PAY", {});

	const [line] = await new DivReportGenerator(new OfflineInfoProvider()).convert(
		Scenario.config.report(2022, TaxAuthorityLotMatchingMethod.FIFO),
		[dividendGrouping],
		graph,
	);

	expect(line.dividendPayerTitle).toEqual("");
	expect(graph.warnings()).toHaveLength(1);
	expect(graph.warnings()[0].node).toBe(graph.nodeOf(line));
	expect(graph.warnings()[0].by).toEqual("DivReportGenerator");
	expect(graph.warnings()[0].detail.kind).toEqual(ProvenanceDetailKind.COMPANY_LOOKUP_FAILED);
	expect(graph.warnings()[0].detail.values[ProvenanceDetailValue.ERROR]).toEqual("offline");
	expect(graph.warnings()[0].detail.values[ProvenanceDetailValue.ISIN]).toEqual("US0000000001");
});

test("a lookup that finds no company warns on the line, which still goes out", async () => {
	const d1 = build.dividend({
		id: TradeEventId.Schema.parse("d1"),
		date: "2022-05-02",
		amount: 10,
		actionId: CashActionId.Schema.parse("A1"),
		transactionId: CashTransactionId.Schema.parse("d1"),
		listingExchange: ListingExchange.Schema.parse("EXH"),
		dividendType: DividendType.ORDINARY,
		currency: CurrencyCode.Schema.parse("USD"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const dividendGrouping = build.grouping({
		identifier: new FinancialIdentifier({
			isin: Isin.Schema.parse("US0000000001"),
			ticker: Ticker.Schema.parse("PAY"),
			name: "Payer",
		}),
		countryOfOrigin: null,
		category: Category.REGULAR,
		stockTrades: [],
		stockTaxLots: [],
		derivativeGroupings: [],
		cashTransactions: [d1],
	});
	const graph = new ProvenanceGraph({ parent: null });
	graph.node(d1, ProvenanceNodeKind.EVENT, "dividend d1 · PAY", {});

	const [line] = await new DivReportGenerator(new PredefinedInfoProvider()).convert(
		Scenario.config.report(2022, TaxAuthorityLotMatchingMethod.FIFO),
		[dividendGrouping],
		graph,
	);

	expect(line.dividendPayerTitle).toEqual("");
	expect(graph.warnings()).toHaveLength(1);
	expect(graph.warnings()[0].node).toBe(graph.nodeOf(line));
	expect(graph.warnings()[0].detail.kind).toEqual(ProvenanceDetailKind.COMPANY_NOT_FOUND);
	expect(graph.warnings()[0].detail.values[ProvenanceDetailValue.ISIN]).toEqual("US0000000001");
});
