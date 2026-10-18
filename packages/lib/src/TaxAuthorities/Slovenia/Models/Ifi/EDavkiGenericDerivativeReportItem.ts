import type {
	EDavkiCountryCode,
	EDavkiIsin,
	EDavkiSecurityCode,
} from "@brrr/TaxAuthorities/Slovenia/Models/EDavkiIdentifiers";
import type { EDavkiDerivativeReportItemType } from "@brrr/TaxAuthorities/Slovenia/Models/Ifi/EDavkiDerivativeReportItemType";
import type { EDavkiDerivativeReportSecurityLines } from "@brrr/TaxAuthorities/Slovenia/Models/Ifi/EDavkiDerivativeReportSecurityLines";
import type { EDavkiDerivativeSecurityType } from "@brrr/TaxAuthorities/Slovenia/Models/Ifi/EDavkiDerivativeSecurityType";

export class EDavkiGenericDerivativeReportItem {
	public readonly inventoryListType: EDavkiDerivativeSecurityType;
	public readonly itemType: EDavkiDerivativeReportItemType;
	public readonly name: string | null;
	public readonly code: EDavkiSecurityCode | null;
	public readonly isin: EDavkiIsin | null;
	public readonly hasForeignTax: boolean;
	public readonly foreignTax: number | null;
	public readonly ftCountryId: EDavkiCountryCode | null;
	public readonly ftCountryName: string | null;
	public readonly items: EDavkiDerivativeReportSecurityLines[];

	public constructor(args: {
		inventoryListType: EDavkiDerivativeSecurityType;
		itemType: EDavkiDerivativeReportItemType;
		name: string | null;
		code: EDavkiSecurityCode | null;
		isin: EDavkiIsin | null;
		hasForeignTax: boolean;
		foreignTax: number | null;
		ftCountryId: EDavkiCountryCode | null;
		ftCountryName: string | null;
		items: EDavkiDerivativeReportSecurityLines[];
	}) {
		this.inventoryListType = args.inventoryListType;
		this.itemType = args.itemType;
		this.name = args.name;
		this.code = args.code;
		this.isin = args.isin;
		this.hasForeignTax = args.hasForeignTax;
		this.foreignTax = args.foreignTax;
		this.ftCountryId = args.ftCountryId;
		this.ftCountryName = args.ftCountryName;
		this.items = args.items;
	}
}
