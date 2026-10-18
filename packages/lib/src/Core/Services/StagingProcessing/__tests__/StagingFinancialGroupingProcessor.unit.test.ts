import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { IbkrExtractService } from "@brrr/Brokers/Ibkr/Services/IbkrExtractService";
import { IbkrTransformService } from "@brrr/Brokers/Ibkr/Services/IbkrTransformService";
import type { ImportFile } from "@brrr/Brokers/Models/ImportFile";
import { DividendType } from "@brrr/Core/Models/Events/DividendType";
import { IdentifierChangeType } from "@brrr/Core/Models/IdentifierRelationships/IdentifierChangeType";
import {
	CashActionId,
	CashTransactionId,
	CurrencyCode,
	Isin,
	ListingExchange,
	TaxLotId,
	Ticker,
	TradeEventId,
} from "@brrr/Core/Models/Identifiers";
import { Category } from "@brrr/Core/Models/Instrument/Category";
import { OptionRight } from "@brrr/Core/Models/Instrument/OptionRight";
import { ShortLong } from "@brrr/Core/Models/Lots/ShortLong";
import { StagingIdentifierChangeType } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierChangeType";
import { StagingIdentifierRelationship } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationship";
import { StagingIdentifierRelationships } from "@brrr/Core/Models/Staging/IdentifierRelationships/StagingIdentifierRelationships";
import { StagingFinancialIdentifier } from "@brrr/Core/Models/Staging/Instrument/StagingFinancialIdentifier";
import { StagingFinancialEvents } from "@brrr/Core/Models/Staging/StagingFinancialEvents";
import { IdentifierRelationshipResolution } from "@brrr/Core/Services/StagingProcessing/IdentifierRelationshipResolution";
import { StagingFinancialGroupingProcessor } from "@brrr/Core/Services/StagingProcessing/StagingFinancialGroupingProcessor";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import { ProvenanceField } from "@brrr/Provenance/Models/ProvenanceField";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import { NullProvenanceRecorder } from "@brrr/Provenance/Services/NullProvenanceRecorder";
import { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";
import { ProvenanceWalker } from "@brrr/Provenance/Services/ProvenanceWalker";
import { TestKit } from "@brrr/test-cases";

const { build } = Scenario;
const { staging } = build;

const ident = new StagingFinancialIdentifier({
	isin: Isin.Schema.parse("US123"),
	ticker: Ticker.Schema.parse("AAPL"),
	name: "AAPL",
});

const simpleStagingStockBuy = staging.stockBought({
	id: TradeEventId.Schema.parse("StockBought"),
	identifier: ident,
	date: "2023-01-01",
	quantity: 1,
	price: 10,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingStockSold = staging.stockSold({
	id: TradeEventId.Schema.parse("StockSold"),
	identifier: ident,
	date: "2023-01-02",
	quantity: -1,
	price: 15,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingDividend = staging.dividend({
	id: TradeEventId.Schema.parse("Dividend"),
	identifier: ident,
	date: "2023-01-01",
	amount: 10,
	actionId: CashActionId.Schema.parse("ActionID"),
	transactionId: CashTransactionId.Schema.parse("TransactionID"),
	listingExchange: ListingExchange.Schema.parse("ListingExchange"),
	dividendType: DividendType.ORDINARY,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingDividendWithholdingTax = staging.withholdingTax({
	id: TradeEventId.Schema.parse("DividendWithholdingTax"),
	identifier: ident,
	date: "2023-01-01",
	amount: -5,
	actionId: CashActionId.Schema.parse("ActionID"),
	transactionId: CashTransactionId.Schema.parse("TransactionID"),
	listingExchange: ListingExchange.Schema.parse("ListingExchange"),
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingPaymentInLieuOfDividend = staging.paymentInLieu({
	id: TradeEventId.Schema.parse("PaymentInLieuOfDividend"),
	identifier: ident,
	date: "2023-01-01",
	amount: 5,
	actionId: CashActionId.Schema.parse("ActionID"),
	transactionId: CashTransactionId.Schema.parse("TransactionID"),
	listingExchange: ListingExchange.Schema.parse("ListingExchange"),
	dividendType: DividendType.ORDINARY,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingPaymentInLieuOfDividendWithholdingTax = staging.paymentInLieuWithholdingTax({
	id: TradeEventId.Schema.parse("PaymentInLieuOfDividendWithholdingTax"),
	identifier: ident,
	date: "2023-01-01",
	amount: -2.5,
	actionId: CashActionId.Schema.parse("ActionID"),
	transactionId: CashTransactionId.Schema.parse("TransactionID"),
	listingExchange: ListingExchange.Schema.parse("ListingExchange"),
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingStockLot = staging.taxLot({
	id: TaxLotId.Schema.parse("Lot"),
	identifier: ident,
	quantity: 1,
	shortLongType: ShortLong.LONG,
	acquired: { id: TradeEventId.Schema.parse("StockBought"), date: null },
	sold: { id: null, date: "2023-01-02" },
});

const simpleStagingDerivativeBuy = staging.optionBought({
	id: TradeEventId.Schema.parse("DerivativeBought"),
	identifier: ident,
	date: "2023-01-01",
	multiplier: 100,
	contract: Fixtures.optionContract,
	quantity: 1,
	price: 10,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingDerivativeSold = staging.optionSold({
	id: TradeEventId.Schema.parse("DerivativeSold"),
	identifier: ident,
	date: "2023-01-02",
	multiplier: 1,
	contract: Fixtures.optionContract,
	quantity: -1,
	price: 15,
	currency: CurrencyCode.Schema.parse("EUR"),
	commission: 0,
	tax: 0,
	fxRateToBase: 1,
});

const simpleStagingDerivativeLot = staging.taxLot({
	id: TaxLotId.Schema.parse("Lot"),
	identifier: ident,
	quantity: 1,
	shortLongType: ShortLong.LONG,
	acquired: { id: TradeEventId.Schema.parse("DerivativeBought"), date: null },
	sold: { id: null, date: "2023-01-02" },
});

test("simple stock lot matching", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const groupings = [
		staging.grouping({
			identifier: ident,
			countryOfOrigin: null,
			category: Category.REGULAR,
			stockTrades: [simpleStagingStockBuy, simpleStagingStockSold],
			stockTaxLots: [simpleStagingStockLot],
			derivativeTrades: [],
			derivativeTaxLots: [],
			cashTransactions: [],
		}),
	];
	const results = processor.generateGenericGroupings(groupings, new NullProvenanceRecorder());
	expect(results.length).toEqual(1);
	expect(results[0].stockTaxLots[0].acquired).toEqual(results[0].stockTrades[0]);
	expect(results[0].stockTaxLots[0].acquired.exchangedMoney.quantity).toEqual(1);
	expect(results[0].stockTaxLots[0].sold).toEqual(results[0].stockTrades[1]);
	expect(results[0].stockTaxLots[0].sold.exchangedMoney.quantity).toEqual(-1);
});

test("partial stock lot matching throws", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const groupings = [
		staging.grouping({
			identifier: ident,
			countryOfOrigin: null,
			category: Category.REGULAR,
			stockTrades: [simpleStagingStockBuy],
			stockTaxLots: [simpleStagingStockLot],
			derivativeTrades: [],
			derivativeTaxLots: [],
			cashTransactions: [],
		}),
	];
	expect(() => processor.generateGenericGroupings(groupings, new NullProvenanceRecorder())).toThrow(
		Error,
	);
});

test("throws when a stock lot has no sold date", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const lotWithoutSoldDate = staging.taxLot({
		id: TaxLotId.Schema.parse("Lot"),
		identifier: ident,
		quantity: 1,
		shortLongType: ShortLong.LONG,
		acquired: { id: TradeEventId.Schema.parse("StockBought"), date: null },
		sold: { id: null, date: null },
	});
	const groupings = [
		staging.grouping({
			identifier: ident,
			countryOfOrigin: null,
			category: Category.REGULAR,
			stockTrades: [simpleStagingStockBuy, simpleStagingStockSold],
			stockTaxLots: [lotWithoutSoldDate],
			derivativeTrades: [],
			derivativeTaxLots: [],
			cashTransactions: [],
		}),
	];

	expect(() => processor.generateGenericGroupings(groupings, new NullProvenanceRecorder())).toThrow(
		"LookupError: Failed to match stock lot",
	);
});

test("simple derivative lot matching", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const groupings = [
		staging.grouping({
			identifier: ident,
			countryOfOrigin: null,
			category: Category.REGULAR,
			stockTrades: [],
			stockTaxLots: [],
			derivativeTrades: [simpleStagingDerivativeBuy, simpleStagingDerivativeSold],
			derivativeTaxLots: [simpleStagingDerivativeLot],
			cashTransactions: [],
		}),
	];
	const results = processor.generateGenericGroupings(groupings, new NullProvenanceRecorder());
	expect(results.length).toEqual(1);
	expect(results[0].derivativeGroupings[0].derivativeTaxLots[0].acquired).toEqual(
		results[0].derivativeGroupings[0].derivativeTrades[0],
	);
	expect(
		results[0].derivativeGroupings[0].derivativeTaxLots[0].acquired.exchangedMoney.quantity,
	).toEqual(1);
	expect(results[0].derivativeGroupings[0].derivativeTaxLots[0].sold).toEqual(
		results[0].derivativeGroupings[0].derivativeTrades[1],
	);
	expect(
		results[0].derivativeGroupings[0].derivativeTaxLots[0].sold.exchangedMoney.quantity,
	).toEqual(-1);
});

test("dividend with withholding tax", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const groupings = [
		staging.grouping({
			identifier: ident,
			countryOfOrigin: null,
			category: Category.REGULAR,
			stockTrades: [],
			stockTaxLots: [],
			derivativeTrades: [],
			derivativeTaxLots: [],
			cashTransactions: [simpleStagingDividend, simpleStagingDividendWithholdingTax],
		}),
	];
	const results = processor.generateGenericGroupings(groupings, new NullProvenanceRecorder());
	expect(results.length).toEqual(1);
	expect(results[0].cashTransactions[0].id).toEqual(simpleStagingDividend.id);
	expect(results[0].cashTransactions[1].id).toEqual(simpleStagingDividendWithholdingTax.id);
	expect(results[0].cashTransactions[0].exchangedMoney.quantity).toEqual(1);
	expect(results[0].cashTransactions[1].exchangedMoney.quantity).toEqual(1);
	expect(results[0].cashTransactions[0].exchangedMoney.priceInBase).toEqual(10);
	expect(results[0].cashTransactions[1].exchangedMoney.priceInBase).toEqual(-5);
});

test("payment in lieu of dividend with withholding tax", () => {
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const groupings = [
		staging.grouping({
			identifier: ident,
			countryOfOrigin: null,
			category: Category.REGULAR,
			stockTrades: [],
			stockTaxLots: [],
			derivativeTrades: [],
			derivativeTaxLots: [],
			cashTransactions: [
				simpleStagingPaymentInLieuOfDividend,
				simpleStagingPaymentInLieuOfDividendWithholdingTax,
			],
		}),
	];
	const results = processor.generateGenericGroupings(groupings, new NullProvenanceRecorder());
	expect(results.length).toEqual(1);
	expect(results[0].cashTransactions[0].id).toEqual(simpleStagingPaymentInLieuOfDividend.id);
	expect(results[0].cashTransactions[1].id).toEqual(
		simpleStagingPaymentInLieuOfDividendWithholdingTax.id,
	);
	expect(results[0].cashTransactions[0].exchangedMoney.quantity).toEqual(1);
	expect(results[0].cashTransactions[1].exchangedMoney.quantity).toEqual(1);
	expect(results[0].cashTransactions[0].exchangedMoney.priceInBase).toEqual(5);
	expect(results[0].cashTransactions[1].exchangedMoney.priceInBase).toEqual(-2.5);
});

test("processStagingFinancialEvents returns FinancialEvents with converted relationships", () => {
	const stagingIdA = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US111"),
		ticker: Ticker.Schema.parse("OLD"),
		name: "Old",
	});
	const stagingIdB = new StagingFinancialIdentifier({
		isin: Isin.Schema.parse("US222"),
		ticker: Ticker.Schema.parse("NEW"),
		name: "New",
	});
	const stagingRel = new StagingIdentifierRelationship({
		fromIdentifier: stagingIdA,
		toIdentifier: stagingIdB,
		changeType: StagingIdentifierChangeType.RENAME,
		effectiveDate: build.date("2024-06-01"),
	});
	const relationships = new StagingIdentifierRelationships({
		relationships: [stagingRel],
		partialRelationships: [],
	});
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());
	const result = processor.processStagingFinancialEvents(
		new StagingFinancialEvents({
			groupings: [
				staging.grouping({
					identifier: stagingIdA,
					countryOfOrigin: null,
					category: Category.REGULAR,
					stockTrades: [],
					stockTaxLots: [],
					derivativeTrades: [],
					derivativeTaxLots: [],
					cashTransactions: [],
				}),
			],
			identifierRelationships: relationships,
		}),
		new NullProvenanceRecorder(),
	);
	expect(result.groupings.length).toEqual(1);
	expect(result.groupings[0].financialIdentifier.isin).toEqual("US111");
	expect(result.identifierRelationships.length).toEqual(1);
	expect(result.identifierRelationships[0].fromIdentifier.isin).toEqual("US111");
	expect(result.identifierRelationships[0].toIdentifier.isin).toEqual("US222");
	expect(result.identifierRelationships[0].changeType).toEqual(IdentifierChangeType.RENAME);
});

function staged(file: ImportFile, graph: ProvenanceGraph): StagingFinancialEvents {
	graph.node(file, ProvenanceNodeKind.FILE, file.fileName, {});
	const segmented = new IbkrExtractService().extractFromXML(file, graph);
	return new IbkrTransformService().convertSegmentedTradesToStagingEvents(segmented, graph);
}

test("staging objects convert to core objects", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const stagingEvents = staged(TestKit.ibkr.stockTrade.inputs.simpleStockTrade.read(), graph);
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());

	const events = processor.processStagingFinancialEvents(stagingEvents, graph);

	const walker = new ProvenanceWalker(graph);
	const buy = graph.nodeOf(events.groupings[0].stockTrades[0]);
	expect(buy.kind).toEqual(ProvenanceNodeKind.EVENT);
	expect(buy.label).toEqual("stock bought 241234985 · 5 EDF");
	expect(walker.parents(buy)[0].change).toEqual(ProvenanceChange.CONVERTED);
	expect(walker.parents(buy)[0].by).toEqual("StagingToCore");
	expect(walker.parents(buy)[0].from.kind).toEqual(ProvenanceNodeKind.STAGING_EVENT);
	const lot = graph.nodeOf(events.groupings[0].stockTaxLots[0]);
	expect(lot.kind).toEqual(ProvenanceNodeKind.LOT);
	expect(lot.label).toEqual("lot 241234985 · 5 EDF");
	const grouping = graph.nodeOf(events.groupings[0]);
	expect(grouping.kind).toEqual(ProvenanceNodeKind.GROUPING);
	expect(grouping.label).toEqual("grouping FR0010242511 · EDF");
	expect(walker.parents(grouping)[0].from.kind).toEqual(ProvenanceNodeKind.STAGING_GROUPING);
});

test("a paired corporate action converts to a core one", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const stagingEvents = staged(
		TestKit.ibkr.corporateActionsTwoRows.inputs.corporateActionsTwoRows.read(),
		graph,
	);
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());

	const events = processor.processStagingFinancialEvents(stagingEvents, graph);

	const action = graph.nodeOf(events.identifierRelationships[0]);
	expect(action.kind).toEqual(ProvenanceNodeKind.CORPORATE_ACTION);
	expect(action.label).toEqual("SPLIT SMCI.OLD → SMCI (4 → 40)");
	expect(new ProvenanceWalker(graph).parents(action)[0].from.label).toEqual(
		"SPLIT SMCI.OLD → SMCI",
	);
});

test("a corporate action of a type lib doesn't know is dropped", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const twoRows = TestKit.ibkr.corporateActionsTwoRows.inputs.corporateActionsTwoRows.read();
	const file = {
		fileName: "unknown-type.xml",
		xml: twoRows.xml.replaceAll('type="FI"', 'type="SO"'),
	};
	const stagingEvents = staged(file, graph);
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());

	processor.processStagingFinancialEvents(stagingEvents, graph);

	const drops = graph.drops();
	expect(drops).toHaveLength(1);
	expect(drops[0].node.label).toEqual("UNKNOWN SMCI.OLD → SMCI");
	expect(drops[0].reason).toEqual(DropReason.UNKNOWN_TYPE);
});

test("a derivative lot of an instrument with no derivative trades is dropped", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const stagingLot = simpleStagingDerivativeLot;
	const stagingGrouping = staging.grouping({
		identifier: ident,
		countryOfOrigin: null,
		category: Category.REGULAR,
		stockTrades: [],
		stockTaxLots: [],
		derivativeTrades: [],
		derivativeTaxLots: [stagingLot],
		cashTransactions: [],
	});
	graph.node(stagingLot, ProvenanceNodeKind.STAGING_LOT, "lot Lot · 1 AAPL", {});
	graph.node(stagingGrouping, ProvenanceNodeKind.STAGING_GROUPING, "grouping US123 · AAPL", {});
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());

	processor.process(stagingGrouping, graph);

	const drops = graph.drops();
	expect(drops).toHaveLength(1);
	expect(drops[0].node).toBe(graph.nodeOf(stagingLot));
	expect(drops[0].reason).toEqual(DropReason.NO_TRADES);
});

test("a core grouping is made from its staging grouping, then its events and lots", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const stagingEvents = staged(TestKit.ibkr.stockTrade.inputs.simpleStockTrade.read(), graph);
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());

	const events = processor.processStagingFinancialEvents(stagingEvents, graph);

	const parents = new ProvenanceWalker(graph).parents(graph.nodeOf(events.groupings[0]));
	expect(parents).toHaveLength(4);
	expect(parents[0].from.kind).toEqual(ProvenanceNodeKind.STAGING_GROUPING);
	expect(parents[0].change).toEqual(ProvenanceChange.CONVERTED);
	expect(parents[1].from.label).toEqual("stock bought 241234985 · 5 EDF");
	expect(parents[1].change).toEqual(ProvenanceChange.GROUPED);
	expect(parents[1].by).toEqual("StagingFinancialGroupingProcessor");
	expect(parents[2].from.label).toEqual("stock sold 262720557 · -5 EDF");
	expect(parents[2].change).toEqual(ProvenanceChange.GROUPED);
	expect(parents[3].from.label).toEqual("lot 241234985 · 5 EDF");
	expect(parents[3].change).toEqual(ProvenanceChange.GROUPED);
});

test("a derivative grouping is made from its trades and lots, and the grouping beside it holds nothing", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const stagingEvents = staged(TestKit.ibkr.optionTrade.inputs.simpleOptionTrade.read(), graph);
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());

	const events = processor.processStagingFinancialEvents(stagingEvents, graph);

	const walker = new ProvenanceWalker(graph);
	const derivative = walker.parents(graph.nodeOf(events.groupings[0].derivativeGroupings[0]));
	expect(derivative).toHaveLength(4);
	expect(derivative[0].change).toEqual(ProvenanceChange.CONVERTED);
	expect(derivative[1].from.label).toEqual("option bought 635331370 · 1 AAPL  231222C00202500");
	expect(derivative[1].change).toEqual(ProvenanceChange.GROUPED);
	expect(derivative[2].from.label).toEqual("option sold 639309966 · -1 AAPL  231222C00202500");
	expect(derivative[2].change).toEqual(ProvenanceChange.GROUPED);
	expect(derivative[3].from.label).toEqual("lot 635331370 · 1 AAPL  231222C00202500");
	expect(derivative[3].change).toEqual(ProvenanceChange.GROUPED);
	expect(walker.parents(graph.nodeOf(events.groupings[0]))).toHaveLength(1);
});

test("a derivative grouping takes the contract of its trades", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const stagingEvents = staged(TestKit.ibkr.optionTrade.inputs.simpleOptionTrade.read(), graph);
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());

	const events = processor.processStagingFinancialEvents(stagingEvents, graph);

	const contract = events.groupings[0].derivativeGroupings[0].contract;
	expect(contract.underlyingSymbol).toEqual("AAPL");
	expect(contract.strike).toEqual(202.5);
	expect(contract.optionRight).toEqual(OptionRight.CALL);
	expect(contract.multiplier).toEqual(100);
});

test("converted nodes carry their fields", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const stagingEvents = staged(TestKit.ibkr.stockTrade.inputs.simpleStockTrade.read(), graph);
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());

	const events = processor.processStagingFinancialEvents(stagingEvents, graph);

	const buy = graph.nodeOf(events.groupings[0].stockTrades[0]);
	expect(buy.fields[ProvenanceField.EVENT_KIND]).toEqual("ACQUIRED");
	expect(buy.fields[ProvenanceField.QUANTITY]).toEqual("5");
	expect(buy.fields[ProvenanceField.PRICE]).toEqual("8.02");
	expect(buy.fields[ProvenanceField.TRANSACTION_ID]).toEqual("241234985");
	expect(buy.fields[ProvenanceField.DATE]).toEqual("2022-02-22");
	const lot = graph.nodeOf(events.groupings[0].stockTaxLots[0]);
	expect(lot.fields[ProvenanceField.ACQUIRED_DATE]).toEqual("2022-02-22");
	expect(lot.fields[ProvenanceField.SOLD_DATE]).toEqual("2022-03-24");
	const grouping = graph.nodeOf(events.groupings[0]);
	expect(grouping.fields[ProvenanceField.ISIN]).toEqual("FR0010242511");
	expect(grouping.fields[ProvenanceField.TICKER]).toEqual("EDF");
});

test("a converted corporate action carries its fields", () => {
	const graph = new ProvenanceGraph({ parent: null });
	const stagingEvents = staged(
		TestKit.ibkr.corporateActionsTwoRows.inputs.corporateActionsTwoRows.read(),
		graph,
	);
	const processor = new StagingFinancialGroupingProcessor(new IdentifierRelationshipResolution());

	const events = processor.processStagingFinancialEvents(stagingEvents, graph);

	const action = graph.nodeOf(events.identifierRelationships[0]);
	expect(action.fields[ProvenanceField.CORPORATE_ACTION_KIND]).toEqual("SPLIT");
	expect(action.fields[ProvenanceField.SPLIT_BEFORE]).toEqual("4");
	expect(action.fields[ProvenanceField.SPLIT_AFTER]).toEqual("40");
});
