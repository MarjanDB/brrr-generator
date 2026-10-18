import { Scenario } from "@brrr/__tests__/support/Scenario";
import {
	CountryCode,
	CurrencyCode,
	Isin,
	TaxLotId,
	Ticker,
	TradeEventId,
} from "@brrr/Core/Models/Identifiers";
import { Category } from "@brrr/Core/Models/Instrument/Category";
import { FinancialIdentifier } from "@brrr/Core/Models/Instrument/FinancialIdentifier";
import { ShortLong } from "@brrr/Core/Models/Lots/ShortLong";
import { FifoLotMatchingMethod } from "@brrr/Core/Services/LotMatching/FifoLotMatchingMethod";
import { ProvidedLotMatchingMethod } from "@brrr/Core/Services/LotMatching/ProvidedLotMatchingMethod";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { NullProvenanceRecorder } from "@brrr/Provenance/Services/NullProvenanceRecorder";
import { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";

const { build, pipeline } = Scenario;

const identifier = new FinancialIdentifier({
	isin: Isin.Schema.parse("US123"),
	ticker: Ticker.Schema.parse("AAPL"),
	name: "AAPL",
});

const stockBought = build.stockBought({
	id: TradeEventId.Schema.parse("StockBought"),
	date: "2023-01-01",
	quantity: 1,
	price: 10,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const stockSold = build.stockSold({
	id: TradeEventId.Schema.parse("StockSold"),
	date: "2023-01-02",
	quantity: -1,
	price: 15,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const grouping = build.grouping({
	identifier,
	countryOfOrigin: CountryCode.Schema.parse("US"),
	category: Category.REGULAR,
	stockTrades: [stockBought, stockSold],
	stockTaxLots: [
		build.stockTaxLot({
			id: TaxLotId.Schema.parse("Lot"),
			quantity: 1,
			shortLongType: ShortLong.LONG,
			acquired: stockBought,
			sold: stockSold,
		}),
	],
	derivativeGroupings: [],
	cashTransactions: [],
});

test("single stock lot matching", () => {
	const legs = pipeline
		.eventsProcessor()
		.stockLotLegsClosedInPeriod(
			grouping,
			new ProvidedLotMatchingMethod(grouping.stockTaxLots, new NullProvenanceRecorder()),
			build.date("2023-01-01"),
			build.date("2023-01-02"),
			new NullProvenanceRecorder(),
		);

	expect(legs.length).toEqual(2);
});

test("simple filtering trades of lots closed in period", () => {
	const legs = pipeline
		.eventsProcessor()
		.stockLotLegsClosedInPeriod(
			grouping,
			new ProvidedLotMatchingMethod(grouping.stockTaxLots, new NullProvenanceRecorder()),
			build.date("2022-01-01"),
			build.date("2022-01-02"),
			new NullProvenanceRecorder(),
		);

	expect(legs.length).toEqual(0);
});

test("no stock trades matching when no lots", () => {
	const groupingNoLots = build.grouping({
		identifier,
		countryOfOrigin: CountryCode.Schema.parse("US"),
		category: Category.REGULAR,
		stockTrades: [stockBought, stockSold],
		stockTaxLots: [],
		derivativeGroupings: [],
		cashTransactions: [],
	});

	const legs = pipeline
		.eventsProcessor()
		.stockLotLegsClosedInPeriod(
			groupingNoLots,
			new ProvidedLotMatchingMethod(groupingNoLots.stockTaxLots, new NullProvenanceRecorder()),
			build.date("2023-01-01"),
			build.date("2023-01-02"),
			new NullProvenanceRecorder(),
		);

	expect(legs.length).toEqual(0);
});

test("a lot closed before the period drops its legs, and an unmatched buy is an open position", () => {
	const b1 = build.stockBought({
		id: TradeEventId.Schema.parse("b1"),
		date: "2023-02-01",
		quantity: 10,
		price: 10,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const s1 = build.stockSold({
		id: TradeEventId.Schema.parse("s1"),
		date: "2023-06-01",
		quantity: -10,
		price: 12,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const b2 = build.stockBought({
		id: TradeEventId.Schema.parse("b2"),
		date: "2024-03-01",
		quantity: 3,
		price: 11,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const openGrouping = build.grouping({
		identifier,
		countryOfOrigin: CountryCode.Schema.parse("US"),
		category: Category.REGULAR,
		stockTrades: [b1, s1, b2],
		stockTaxLots: [],
		derivativeGroupings: [],
		cashTransactions: [],
	});
	const graph = new ProvenanceGraph({ parent: null });
	graph.node(b1, ProvenanceNodeKind.EVENT, "stock bought b1 · 10 AAPL", {});
	graph.node(s1, ProvenanceNodeKind.EVENT, "stock sold s1 · -10 AAPL", {});
	graph.node(b2, ProvenanceNodeKind.EVENT, "stock bought b2 · 3 AAPL", {});

	const legs = pipeline
		.eventsProcessor()
		.stockLotLegsClosedInPeriod(
			openGrouping,
			new FifoLotMatchingMethod(),
			build.date("2024-01-01"),
			build.date("2025-01-01"),
			graph,
		);

	expect(legs).toEqual([]);
	const drops = graph.drops();
	expect(drops).toHaveLength(3);
	expect(drops[0].reason).toEqual(DropReason.OUTSIDE_PERIOD);
	expect(drops[0].node.label).toEqual("leg b1 · 10");
	expect(drops[0].detail).toEqual("closed 2023-06-01");
	expect(drops[1].reason).toEqual(DropReason.OUTSIDE_PERIOD);
	expect(drops[1].node.label).toEqual("leg s1 · -10");
	expect(drops[2].reason).toEqual(DropReason.POSITION_OPEN);
	expect(drops[2].node).toBe(graph.nodeOf(b2));
	expect(drops[2].by).toEqual("FinancialEventsProcessor");
	expect(drops[2].detail).toEqual(null);
});

test("a trade split over a lot inside the period and one outside it is reported and dropped, never open", () => {
	const b1 = build.stockBought({
		id: TradeEventId.Schema.parse("b1"),
		date: "2023-02-01",
		quantity: 10,
		price: 10,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const s1 = build.stockSold({
		id: TradeEventId.Schema.parse("s1"),
		date: "2023-06-01",
		quantity: -4,
		price: 12,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const s2 = build.stockSold({
		id: TradeEventId.Schema.parse("s2"),
		date: "2024-05-01",
		quantity: -6,
		price: 13,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const splitGrouping = build.grouping({
		identifier,
		countryOfOrigin: CountryCode.Schema.parse("US"),
		category: Category.REGULAR,
		stockTrades: [b1, s1, s2],
		stockTaxLots: [],
		derivativeGroupings: [],
		cashTransactions: [],
	});
	const graph = new ProvenanceGraph({ parent: null });
	graph.node(b1, ProvenanceNodeKind.EVENT, "stock bought b1 · 10 AAPL", {});
	graph.node(s1, ProvenanceNodeKind.EVENT, "stock sold s1 · -4 AAPL", {});
	graph.node(s2, ProvenanceNodeKind.EVENT, "stock sold s2 · -6 AAPL", {});

	const legs = pipeline
		.eventsProcessor()
		.stockLotLegsClosedInPeriod(
			splitGrouping,
			new FifoLotMatchingMethod(),
			build.date("2024-01-01"),
			build.date("2025-01-01"),
			graph,
		);

	expect(legs).toHaveLength(2);
	expect(graph.drops().filter((drop) => drop.reason === DropReason.POSITION_OPEN)).toEqual([]);
	expect(graph.drops()).toHaveLength(2);
});
