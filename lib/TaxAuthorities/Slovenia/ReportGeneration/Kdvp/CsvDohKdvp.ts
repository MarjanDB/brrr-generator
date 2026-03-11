import { stringify } from "csv-stringify/sync";
import {
	EDavkiTradeReportSecurityLineGenericEventBought,
	type EDavkiGenericTradeReportItem,
} from "@brrr/TaxAuthorities/Slovenia/Schemas/Schemas.ts";

export function generateCsvReport(convertedTrades: EDavkiGenericTradeReportItem[]): string {
	const rows = [];

	for (const entry of convertedTrades) {
		for (const secLine of entry.items) {
			for (const event of secLine.events) {
				const isBuy = event instanceof EDavkiTradeReportSecurityLineGenericEventBought;
				const row = {
					Ticker: secLine.code,
					BoughtOn: isBuy ? event.boughtOn.toISO() : null,
					GainType: isBuy ? event.gainType : null,
					Quantity: event.quantity,
					PricePerUnit: event.pricePerUnit,
					PricePerUnitInOriginalCurrency: event.pricePerUnitInOriginalCurrency,
					TotalPrice: event.totalPrice,
					TotalPriceInOriginalCurrency: event.totalPriceInOriginalCurrency,
					Commissions: event.commissions,
					CommissionsInOriginalCurrency: event.commissionsInOriginalCurrency,
					InheritanceAndGiftTaxPaid: isBuy ? event.inheritanceAndGiftTaxPaid : null,
					BaseTaxReduction: isBuy ? event.baseTaxReduction : null,
					SoldOn: isBuy ? null : event.soldOn.toISO(),
					SatisfiesTaxBasisReduction: isBuy ? null : event.satisfiesTaxBasisReduction,
					ISIN: secLine.isin,
					HasForeignTax: entry.hasForeignTax,
					ForeignTax: entry.foreignTax,
					ForeignTaxCountryID: entry.ftCountryId,
					ForeignTaxCountryName: entry.ftCountryName,
				};
				rows.push(row);
			}
		}
	}

	return stringify(rows, { header: true, cast: { boolean: (v) => String(v) } });
}
