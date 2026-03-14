import {
	EDavkiDerivativeReportSecurityLineGenericEventBought,
	type EDavkiGenericDerivativeReportItem,
} from "@brrr/TaxAuthorities/Slovenia/Schemas/Schemas";
import { stringify } from "csv-stringify/sync";

export function generateCsvReport(convertedTrades: EDavkiGenericDerivativeReportItem[]): string {
	if (convertedTrades.length === 0) {
		return "";
	}

	const rows = [];

	for (const entry of convertedTrades) {
		for (const item of entry.items) {
			const isBuy = item instanceof EDavkiDerivativeReportSecurityLineGenericEventBought;
			const row = {
				Name: entry.name,
				BoughtOn: isBuy ? item.boughtOn.toISO() : null,
				GainType: isBuy ? item.gainType : null,
				SoldOn: isBuy ? null : item.soldOn.toISO(),
				Quantity: item.quantity,
				PricePerUnit: item.pricePerUnit,
				PricePerUnitInOriginalCurrency: item.pricePerUnitInOriginalCurrency,
				TotalPrice: item.totalPrice,
				TotalPriceInOriginalCurrency: item.totalPriceInOriginalCurrency,
				Commissions: item.commissions,
				CommissionsInOriginalCurrency: item.commissionsInOriginalCurrency,
				Leveraged: item.leveraged,
				ISIN: entry.isin,
				Ticker: entry.code,
				HasForeignTax: entry.hasForeignTax,
				ForeignTax: entry.foreignTax,
				ForeignTaxCountryID: entry.ftCountryId,
				ForeignTaxCountryName: entry.ftCountryName,
			};
			rows.push(row);
		}
	}

	return stringify(rows, { header: true, cast: { boolean: (v) => String(v) } });
}
