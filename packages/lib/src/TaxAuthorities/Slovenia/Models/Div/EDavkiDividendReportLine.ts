import type { EDavkiDividendType } from "@brrr/TaxAuthorities/Slovenia/Models/Div/EDavkiDividendType";
import type {
	EDavkiCountryCode,
	EDavkiDividendTrackingId,
	EDavkiPayerIdentificationNumber,
	EDavkiTaxNumber,
} from "@brrr/TaxAuthorities/Slovenia/Models/EDavkiIdentifiers";
import type { DateTime } from "luxon";

type EDavkiDividendReportLineArgs = {
	dateReceived: DateTime;
	taxNumberForDividendPayer: EDavkiTaxNumber;
	dividendPayerIdentificationNumber: EDavkiPayerIdentificationNumber;
	dividendPayerTitle: string;
	dividendPayerAddress: string | null;
	dividendPayerCountryOfOrigin: EDavkiCountryCode;
	dividendType: EDavkiDividendType;
	countryOfOrigin: EDavkiCountryCode;
	dividendIdentifierForTracking: EDavkiDividendTrackingId;
	taxReliefParagraphInInternationalTreaty: string | null;
	dividendAmount: number;
	dividendAmountInOriginalCurrency: number;
	foreignTaxPaid: number;
	foreignTaxPaidInOriginalCurrency: number;
};

export class EDavkiDividendReportLine {
	public readonly dateReceived: DateTime;
	public readonly taxNumberForDividendPayer: EDavkiTaxNumber;
	public readonly dividendPayerIdentificationNumber: EDavkiPayerIdentificationNumber;
	public readonly dividendPayerTitle: string;
	public readonly dividendPayerAddress: string | null;
	public readonly dividendPayerCountryOfOrigin: EDavkiCountryCode;
	public readonly dividendType: EDavkiDividendType;
	public readonly countryOfOrigin: EDavkiCountryCode;
	public readonly dividendIdentifierForTracking: EDavkiDividendTrackingId;
	public readonly taxReliefParagraphInInternationalTreaty: string | null;
	public readonly dividendAmount: number;
	public readonly dividendAmountInOriginalCurrency: number;
	public readonly foreignTaxPaid: number;
	public readonly foreignTaxPaidInOriginalCurrency: number;

	public constructor(args: EDavkiDividendReportLineArgs) {
		this.dateReceived = args.dateReceived;
		this.taxNumberForDividendPayer = args.taxNumberForDividendPayer;
		this.dividendPayerIdentificationNumber = args.dividendPayerIdentificationNumber;
		this.dividendPayerTitle = args.dividendPayerTitle;
		this.dividendPayerAddress = args.dividendPayerAddress;
		this.dividendPayerCountryOfOrigin = args.dividendPayerCountryOfOrigin;
		this.dividendType = args.dividendType;
		this.countryOfOrigin = args.countryOfOrigin;
		this.dividendIdentifierForTracking = args.dividendIdentifierForTracking;
		this.taxReliefParagraphInInternationalTreaty = args.taxReliefParagraphInInternationalTreaty;
		this.dividendAmount = args.dividendAmount;
		this.dividendAmountInOriginalCurrency = args.dividendAmountInOriginalCurrency;
		this.foreignTaxPaid = args.foreignTaxPaid;
		this.foreignTaxPaidInOriginalCurrency = args.foreignTaxPaidInOriginalCurrency;
	}
}
