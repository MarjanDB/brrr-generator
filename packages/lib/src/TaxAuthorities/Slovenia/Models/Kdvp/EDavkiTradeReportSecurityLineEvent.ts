import type {
	EDavkiIsin,
	EDavkiSecurityCode,
} from "@brrr/TaxAuthorities/Slovenia/Models/EDavkiIdentifiers";
import type { EDavkiTradeReportSecurityLineGenericEventBought } from "@brrr/TaxAuthorities/Slovenia/Models/Kdvp/EDavkiTradeReportSecurityLineGenericEventBought";
import type { EDavkiTradeReportSecurityLineGenericEventSold } from "@brrr/TaxAuthorities/Slovenia/Models/Kdvp/EDavkiTradeReportSecurityLineGenericEventSold";
import type { DateTime } from "luxon";

export class EDavkiTradeReportSecurityLineEvent {
	public readonly isin: EDavkiIsin;
	public readonly code: EDavkiSecurityCode | null;
	public readonly name: string | null;
	public readonly isFund: boolean;
	public readonly resolution: string | null;
	public readonly resolutionDate: DateTime | null;
	public readonly events: (
		| EDavkiTradeReportSecurityLineGenericEventBought
		| EDavkiTradeReportSecurityLineGenericEventSold
	)[];

	public constructor(args: {
		isin: EDavkiIsin;
		code: EDavkiSecurityCode | null;
		name: string | null;
		isFund: boolean;
		resolution: string | null;
		resolutionDate: DateTime | null;
		events: (
			| EDavkiTradeReportSecurityLineGenericEventBought
			| EDavkiTradeReportSecurityLineGenericEventSold
		)[];
	}) {
		this.isin = args.isin;
		this.code = args.code;
		this.name = args.name;
		this.isFund = args.isFund;
		this.resolution = args.resolution;
		this.resolutionDate = args.resolutionDate;
		this.events = args.events;
	}
}
