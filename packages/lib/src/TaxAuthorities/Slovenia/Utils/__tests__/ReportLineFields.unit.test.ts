import { Scenario } from "@brrr/__tests__/support/Scenario";
import { EDavkiDividendReportLine } from "@brrr/TaxAuthorities/Slovenia/Models/Div/EDavkiDividendReportLine";
import { EDavkiDividendType } from "@brrr/TaxAuthorities/Slovenia/Models/Div/EDavkiDividendType";
import {
	EDavkiCountryCode,
	EDavkiDividendTrackingId,
	EDavkiPayerIdentificationNumber,
	EDavkiTaxNumber,
} from "@brrr/TaxAuthorities/Slovenia/Models/EDavkiIdentifiers";
import { EDavkiProvenanceField } from "@brrr/TaxAuthorities/Slovenia/Models/EDavkiProvenanceField";
import { EDavkiDerivativeReportGainType } from "@brrr/TaxAuthorities/Slovenia/Models/Ifi/EDavkiDerivativeReportGainType";
import { EDavkiDerivativeReportSecurityLineGenericEventBought } from "@brrr/TaxAuthorities/Slovenia/Models/Ifi/EDavkiDerivativeReportSecurityLineGenericEventBought";
import { EDavkiDerivativeReportSecurityLineGenericEventSold } from "@brrr/TaxAuthorities/Slovenia/Models/Ifi/EDavkiDerivativeReportSecurityLineGenericEventSold";
import { EDavkiTradeReportGainType } from "@brrr/TaxAuthorities/Slovenia/Models/Kdvp/EDavkiTradeReportGainType";
import { EDavkiTradeReportSecurityLineGenericEventBought } from "@brrr/TaxAuthorities/Slovenia/Models/Kdvp/EDavkiTradeReportSecurityLineGenericEventBought";
import { EDavkiTradeReportSecurityLineGenericEventSold } from "@brrr/TaxAuthorities/Slovenia/Models/Kdvp/EDavkiTradeReportSecurityLineGenericEventSold";
import { ReportLineFields } from "@brrr/TaxAuthorities/Slovenia/Utils/ReportLineFields";

test("a KDVP bought line's fields are the values the form gets", () => {
	const line = new EDavkiTradeReportSecurityLineGenericEventBought({
		boughtOn: Scenario.build.date("2022-02-22"),
		gainType: EDavkiTradeReportGainType.BOUGHT,
		quantity: 5,
		pricePerUnit: 8.02,
		pricePerUnitInOriginalCurrency: 8.02,
		totalPrice: 40.099999999999994,
		totalPriceInOriginalCurrency: 40.099999999999994,
		commissions: -3,
		commissionsInOriginalCurrency: -3,
		inheritanceAndGiftTaxPaid: null,
		baseTaxReduction: null,
	});

	const fields = ReportLineFields.kdvpBought(line);

	expect(fields[EDavkiProvenanceField.BOUGHT_ON]).toEqual("2022-02-22");
	expect(fields[EDavkiProvenanceField.GAIN_TYPE]).toEqual("B");
	expect(fields[EDavkiProvenanceField.QUANTITY]).toEqual("5");
	expect(fields[EDavkiProvenanceField.PRICE_PER_UNIT]).toEqual("8.02");
	expect(fields[EDavkiProvenanceField.TOTAL_PRICE]).toEqual("40.099999999999994");
	expect(fields[EDavkiProvenanceField.COMMISSIONS]).toEqual("-3");
});

test("a KDVP sold line's fields are the values the form gets", () => {
	const line = new EDavkiTradeReportSecurityLineGenericEventSold({
		soldOn: Scenario.build.date("2022-03-24"),
		quantity: -5,
		totalPrice: -42.77,
		totalPriceInOriginalCurrency: -42.77,
		pricePerUnit: 8.554,
		pricePerUnitInOriginalCurrency: 8.554,
		commissions: -1.25,
		commissionsInOriginalCurrency: -1.25,
		satisfiesTaxBasisReduction: false,
	});

	const fields = ReportLineFields.kdvpSold(line);

	expect(fields[EDavkiProvenanceField.SOLD_ON]).toEqual("2022-03-24");
	expect(fields[EDavkiProvenanceField.QUANTITY]).toEqual("-5");
	expect(fields[EDavkiProvenanceField.PRICE_PER_UNIT]).toEqual("8.554");
	expect(fields[EDavkiProvenanceField.TOTAL_PRICE]).toEqual("-42.77");
	expect(fields[EDavkiProvenanceField.COMMISSIONS]).toEqual("-1.25");
});

test("an IFI bought line's fields are the values the form gets", () => {
	const line = new EDavkiDerivativeReportSecurityLineGenericEventBought({
		boughtOn: Scenario.build.date("2023-12-14"),
		gainType: EDavkiDerivativeReportGainType.BOUGHT,
		quantity: 1,
		pricePerUnit: 2.5,
		pricePerUnitInOriginalCurrency: 2.75,
		totalPrice: 2.5,
		totalPriceInOriginalCurrency: 2.75,
		commissions: -1,
		commissionsInOriginalCurrency: -1.1,
		leveraged: false,
	});

	const fields = ReportLineFields.ifiBought(line);

	expect(fields[EDavkiProvenanceField.BOUGHT_ON]).toEqual("2023-12-14");
	expect(fields[EDavkiProvenanceField.GAIN_TYPE]).toEqual("A");
	expect(fields[EDavkiProvenanceField.QUANTITY]).toEqual("1");
	expect(fields[EDavkiProvenanceField.PRICE_PER_UNIT]).toEqual("2.5");
	expect(fields[EDavkiProvenanceField.TOTAL_PRICE]).toEqual("2.5");
	expect(fields[EDavkiProvenanceField.COMMISSIONS]).toEqual("-1");
});

test("an IFI sold line's fields are the values the form gets", () => {
	const line = new EDavkiDerivativeReportSecurityLineGenericEventSold({
		soldOn: Scenario.build.date("2023-12-15"),
		quantity: -1,
		pricePerUnit: 3.5,
		pricePerUnitInOriginalCurrency: 3.85,
		totalPrice: -3.5,
		totalPriceInOriginalCurrency: -3.85,
		commissions: -1,
		commissionsInOriginalCurrency: -1.1,
		leveraged: false,
	});

	const fields = ReportLineFields.ifiSold(line);

	expect(fields[EDavkiProvenanceField.SOLD_ON]).toEqual("2023-12-15");
	expect(fields[EDavkiProvenanceField.QUANTITY]).toEqual("-1");
	expect(fields[EDavkiProvenanceField.PRICE_PER_UNIT]).toEqual("3.5");
	expect(fields[EDavkiProvenanceField.TOTAL_PRICE]).toEqual("-3.5");
	expect(fields[EDavkiProvenanceField.COMMISSIONS]).toEqual("-1");
});

test("a DIV line's fields are the values the form gets", () => {
	const line = new EDavkiDividendReportLine({
		dateReceived: Scenario.build.date("2022-04-02"),
		taxNumberForDividendPayer: EDavkiTaxNumber.Schema.parse(""),
		dividendPayerIdentificationNumber: EDavkiPayerIdentificationNumber.Schema.parse("FR0000120271"),
		dividendPayerTitle: "TotalEnergies SE",
		dividendPayerAddress: "2 Place Jean Millier, Courbevoie",
		dividendPayerCountryOfOrigin: EDavkiCountryCode.Schema.parse("FR"),
		dividendType: EDavkiDividendType.ORDINARY,
		countryOfOrigin: EDavkiCountryCode.Schema.parse("FR"),
		dividendIdentifierForTracking: EDavkiDividendTrackingId.Schema.parse("102869793"),
		taxReliefParagraphInInternationalTreaty: "Article 10",
		dividendAmount: 2.64,
		dividendAmountInOriginalCurrency: 2.64,
		foreignTaxPaid: 0.66,
		foreignTaxPaidInOriginalCurrency: 0.66,
	});

	const fields = ReportLineFields.divLine(line);

	expect(fields[EDavkiProvenanceField.DATE_RECEIVED]).toEqual("2022-04-02");
	expect(fields[EDavkiProvenanceField.PAYER_ID]).toEqual("FR0000120271");
	expect(fields[EDavkiProvenanceField.DIVIDEND_TYPE]).toEqual("1");
	expect(fields[EDavkiProvenanceField.TRACKING_ID]).toEqual("102869793");
	expect(fields[EDavkiProvenanceField.DIVIDEND_AMOUNT]).toEqual("2.64");
	expect(fields[EDavkiProvenanceField.FOREIGN_TAX_PAID]).toEqual("0.66");
});

test("a dividend sum's fields are its day, type, tracking id and unrounded amounts", () => {
	const fields = ReportLineFields.sum({
		dateReceived: Scenario.build.date("2022-04-02"),
		dividendType: EDavkiDividendType.ORDINARY,
		tracking: EDavkiDividendTrackingId.Schema.parse("102869793"),
		dividendAmount: 2.64,
		foreignTaxPaid: -0.6600000000000001,
	});

	expect(fields[EDavkiProvenanceField.DATE_RECEIVED]).toEqual("2022-04-02");
	expect(fields[EDavkiProvenanceField.DIVIDEND_TYPE]).toEqual("1");
	expect(fields[EDavkiProvenanceField.TRACKING_ID]).toEqual("102869793");
	expect(fields[EDavkiProvenanceField.DIVIDEND_AMOUNT]).toEqual("2.64");
	expect(fields[EDavkiProvenanceField.FOREIGN_TAX_PAID]).toEqual("-0.6600000000000001");
});
