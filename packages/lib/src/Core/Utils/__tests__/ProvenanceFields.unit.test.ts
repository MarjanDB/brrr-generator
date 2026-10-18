import { Fixtures } from "@brrr/__tests__/support/Fixtures";
import { Scenario } from "@brrr/__tests__/support/Scenario";
import { IdentifierChangeType } from "@brrr/Core/Models/IdentifierRelationships/IdentifierChangeType";
import { IdentifierRelationship } from "@brrr/Core/Models/IdentifierRelationships/IdentifierRelationship";
import { IdentifierRelationshipSplit } from "@brrr/Core/Models/IdentifierRelationships/IdentifierRelationshipSplit";
import { CurrencyCode, Isin, TaxLotId, Ticker, TradeEventId } from "@brrr/Core/Models/Identifiers";
import { FinancialIdentifier } from "@brrr/Core/Models/Instrument/FinancialIdentifier";
import { ShortLong } from "@brrr/Core/Models/Lots/ShortLong";
import { ProvenanceFields } from "@brrr/Core/Utils/ProvenanceFields";
import { ProvenanceEventKind } from "@brrr/Provenance/Models/ProvenanceEventKind";
import { ProvenanceField } from "@brrr/Provenance/Models/ProvenanceField";
import { ProvenanceLegSide } from "@brrr/Provenance/Models/ProvenanceLegSide";

test("a trade event's fields are its kind, date, quantity, prices, currency and id", () => {
	const trade = Scenario.build.stockBought({
		id: TradeEventId.Schema.parse("t1"),
		date: "2024-03-05",
		quantity: 5,
		price: 10,
		currency: CurrencyCode.Schema.parse("USD"),
		commission: 0,
		tax: 0,
		fxRateToBase: 0.5,
	});

	const fields = ProvenanceFields.event(trade, ProvenanceEventKind.ACQUIRED);

	expect(fields[ProvenanceField.EVENT_KIND]).toEqual("ACQUIRED");
	expect(fields[ProvenanceField.ASSET_CLASS]).toEqual("STOCK");
	expect(fields[ProvenanceField.DATE]).toEqual("2024-03-05");
	expect(fields[ProvenanceField.QUANTITY]).toEqual("5");
	expect(fields[ProvenanceField.PRICE_IN_BASE]).toEqual("10");
	expect(fields[ProvenanceField.PRICE]).toEqual("20");
	expect(fields[ProvenanceField.CURRENCY]).toEqual("USD");
	expect(fields[ProvenanceField.TRANSACTION_ID]).toEqual("t1");
});

test("a stock grouping's fields leave out what the identifier lacks", () => {
	const identifier = new FinancialIdentifier({
		isin: Isin.Schema.parse("US0378331005"),
		ticker: Ticker.Schema.parse("AAPL"),
	});

	const fields = ProvenanceFields.grouping(identifier);

	expect(fields[ProvenanceField.ISIN]).toEqual("US0378331005");
	expect(fields[ProvenanceField.TICKER]).toEqual("AAPL");
	expect(fields[ProvenanceField.NAME]).toBeUndefined();
	expect(fields[ProvenanceField.UNDERLYING_SYMBOL]).toBeUndefined();
});

test("a derivative grouping's fields add the option and its contract terms", () => {
	const identifier = new FinancialIdentifier({
		isin: Isin.Schema.parse("US0378331005"),
		ticker: Ticker.Schema.parse("AAPL  231222C00202500"),
		name: "AAPL 22DEC23 202.5 C",
	});

	const fields = ProvenanceFields.derivativeGrouping(identifier, Fixtures.optionContract);

	expect(fields[ProvenanceField.TICKER]).toEqual("AAPL  231222C00202500");
	expect(fields[ProvenanceField.NAME]).toEqual("AAPL 22DEC23 202.5 C");
	expect(fields[ProvenanceField.ASSET_CLASS]).toEqual("OPTION");
	expect(fields[ProvenanceField.UNDERLYING_SYMBOL]).toEqual("AAPL");
	expect(fields[ProvenanceField.EXPIRY]).toEqual("2023-12-22");
	expect(fields[ProvenanceField.STRIKE]).toEqual("202.5");
	expect(fields[ProvenanceField.OPTION_RIGHT]).toEqual("CALL");
	expect(fields[ProvenanceField.MULTIPLIER]).toEqual("100");
});

test("a lot's fields are its two dates and its quantity", () => {
	const acquired = Scenario.build.stockBought({
		id: TradeEventId.Schema.parse("t1"),
		date: "2024-01-02",
		quantity: 2,
		price: 10,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const sold = Scenario.build.stockSold({
		id: TradeEventId.Schema.parse("t2"),
		date: "2024-02-03",
		quantity: -2,
		price: 12,
		currency: CurrencyCode.Schema.parse("EUR"),
		commission: 0,
		tax: 0,
		fxRateToBase: 1,
	});
	const lot = Scenario.build.stockTaxLot({
		id: TaxLotId.Schema.parse("l1"),
		quantity: 2,
		shortLongType: ShortLong.LONG,
		acquired,
		sold,
	});

	const fields = ProvenanceFields.lot(lot);

	expect(fields[ProvenanceField.ACQUIRED_DATE]).toEqual("2024-01-02");
	expect(fields[ProvenanceField.SOLD_DATE]).toEqual("2024-02-03");
	expect(fields[ProvenanceField.QUANTITY]).toEqual("2");
});

test("a split's fields add the counts before and after", () => {
	const split = new IdentifierRelationshipSplit({
		fromIdentifier: new FinancialIdentifier({
			isin: Isin.Schema.parse("US86800U1043"),
			ticker: Ticker.Schema.parse("SMCI.OLD"),
		}),
		toIdentifier: new FinancialIdentifier({
			isin: Isin.Schema.parse("US86800U3023"),
			ticker: Ticker.Schema.parse("SMCI"),
		}),
		changeType: IdentifierChangeType.SPLIT,
		effectiveDate: Scenario.build.date("2024-10-01"),
		quantityBefore: 4,
		quantityAfter: 40,
	});

	const fields = ProvenanceFields.corporateAction(split);

	expect(fields[ProvenanceField.CORPORATE_ACTION_KIND]).toEqual("SPLIT");
	expect(fields[ProvenanceField.DATE]).toEqual("2024-10-01");
	expect(fields[ProvenanceField.FROM_ISIN]).toEqual("US86800U1043");
	expect(fields[ProvenanceField.TO_ISIN]).toEqual("US86800U3023");
	expect(fields[ProvenanceField.FROM_TICKER]).toEqual("SMCI.OLD");
	expect(fields[ProvenanceField.TO_TICKER]).toEqual("SMCI");
	expect(fields[ProvenanceField.SPLIT_BEFORE]).toEqual("4");
	expect(fields[ProvenanceField.SPLIT_AFTER]).toEqual("40");
});

test("a rename's fields have no counts", () => {
	const rename = new IdentifierRelationship({
		fromIdentifier: new FinancialIdentifier({
			isin: Isin.Schema.parse("US111"),
			ticker: Ticker.Schema.parse("OLD"),
		}),
		toIdentifier: new FinancialIdentifier({
			isin: Isin.Schema.parse("US222"),
			ticker: Ticker.Schema.parse("NEW"),
		}),
		changeType: IdentifierChangeType.RENAME,
		effectiveDate: Scenario.build.date("2024-06-01"),
	});

	const fields = ProvenanceFields.corporateAction(rename);

	expect(fields[ProvenanceField.CORPORATE_ACTION_KIND]).toEqual("RENAME");
	expect(fields[ProvenanceField.SPLIT_BEFORE]).toBeUndefined();
	expect(fields[ProvenanceField.SPLIT_AFTER]).toBeUndefined();
});

test("a leg's fields are its side and its quantity", () => {
	const fields = ProvenanceFields.leg(ProvenanceLegSide.SOLD, -5);

	expect(fields[ProvenanceField.LEG_SIDE]).toEqual("SOLD");
	expect(fields[ProvenanceField.QUANTITY]).toEqual("-5");
});
