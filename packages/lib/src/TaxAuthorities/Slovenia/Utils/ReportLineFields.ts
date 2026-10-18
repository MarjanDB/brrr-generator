import type { EDavkiDividendReportLine } from "@brrr/TaxAuthorities/Slovenia/Models/Div/EDavkiDividendReportLine";
import type { EDavkiDividendType } from "@brrr/TaxAuthorities/Slovenia/Models/Div/EDavkiDividendType";
import type { EDavkiDividendTrackingId } from "@brrr/TaxAuthorities/Slovenia/Models/EDavkiIdentifiers";
import { EDavkiProvenanceField } from "@brrr/TaxAuthorities/Slovenia/Models/EDavkiProvenanceField";
import type { EDavkiDerivativeReportSecurityLineGenericEventBought } from "@brrr/TaxAuthorities/Slovenia/Models/Ifi/EDavkiDerivativeReportSecurityLineGenericEventBought";
import type { EDavkiDerivativeReportSecurityLineGenericEventSold } from "@brrr/TaxAuthorities/Slovenia/Models/Ifi/EDavkiDerivativeReportSecurityLineGenericEventSold";
import type { EDavkiTradeReportSecurityLineGenericEventBought } from "@brrr/TaxAuthorities/Slovenia/Models/Kdvp/EDavkiTradeReportSecurityLineGenericEventBought";
import type { EDavkiTradeReportSecurityLineGenericEventSold } from "@brrr/TaxAuthorities/Slovenia/Models/Kdvp/EDavkiTradeReportSecurityLineGenericEventSold";
import type { DateTime } from "luxon";

function day(date: DateTime): string {
	return date.toFormat("yyyy-MM-dd");
}

type Bought =
	| EDavkiTradeReportSecurityLineGenericEventBought
	| EDavkiDerivativeReportSecurityLineGenericEventBought;
type Sold =
	| EDavkiTradeReportSecurityLineGenericEventSold
	| EDavkiDerivativeReportSecurityLineGenericEventSold;

function boughtFields(line: Bought): Record<string, string> {
	return {
		[EDavkiProvenanceField.BOUGHT_ON]: day(line.boughtOn),
		[EDavkiProvenanceField.GAIN_TYPE]: line.gainType,
		[EDavkiProvenanceField.QUANTITY]: String(line.quantity),
		[EDavkiProvenanceField.PRICE_PER_UNIT]: String(line.pricePerUnit),
		[EDavkiProvenanceField.TOTAL_PRICE]: String(line.totalPrice),
		[EDavkiProvenanceField.COMMISSIONS]: String(line.commissions),
	};
}

function soldFields(line: Sold): Record<string, string> {
	return {
		[EDavkiProvenanceField.SOLD_ON]: day(line.soldOn),
		[EDavkiProvenanceField.QUANTITY]: String(line.quantity),
		[EDavkiProvenanceField.PRICE_PER_UNIT]: String(line.pricePerUnit),
		[EDavkiProvenanceField.TOTAL_PRICE]: String(line.totalPrice),
		[EDavkiProvenanceField.COMMISSIONS]: String(line.commissions),
	};
}

// The facts the Slovenian report side puts on its provenance nodes, keyed by EDavkiProvenanceField.
// Values are what the form holds, written with String(value); dates are yyyy-MM-dd.
export const ReportLineFields = {
	kdvpBought(line: EDavkiTradeReportSecurityLineGenericEventBought): Record<string, string> {
		return boughtFields(line);
	},

	kdvpSold(line: EDavkiTradeReportSecurityLineGenericEventSold): Record<string, string> {
		return soldFields(line);
	},

	ifiBought(line: EDavkiDerivativeReportSecurityLineGenericEventBought): Record<string, string> {
		return boughtFields(line);
	},

	ifiSold(line: EDavkiDerivativeReportSecurityLineGenericEventSold): Record<string, string> {
		return soldFields(line);
	},

	divLine(line: EDavkiDividendReportLine): Record<string, string> {
		return {
			[EDavkiProvenanceField.DATE_RECEIVED]: day(line.dateReceived),
			[EDavkiProvenanceField.PAYER_ID]: line.dividendPayerIdentificationNumber,
			[EDavkiProvenanceField.DIVIDEND_TYPE]: line.dividendType,
			[EDavkiProvenanceField.TRACKING_ID]: line.dividendIdentifierForTracking,
			[EDavkiProvenanceField.DIVIDEND_AMOUNT]: String(line.dividendAmount),
			[EDavkiProvenanceField.FOREIGN_TAX_PAID]: String(line.foreignTaxPaid),
		};
	},

	sum(totals: {
		dateReceived: DateTime;
		dividendType: EDavkiDividendType;
		tracking: EDavkiDividendTrackingId;
		dividendAmount: number;
		foreignTaxPaid: number;
	}): Record<string, string> {
		return {
			[EDavkiProvenanceField.DATE_RECEIVED]: day(totals.dateReceived),
			[EDavkiProvenanceField.DIVIDEND_TYPE]: totals.dividendType,
			[EDavkiProvenanceField.TRACKING_ID]: totals.tracking,
			[EDavkiProvenanceField.DIVIDEND_AMOUNT]: String(totals.dividendAmount),
			[EDavkiProvenanceField.FOREIGN_TAX_PAID]: String(totals.foreignTaxPaid),
		};
	},
};
