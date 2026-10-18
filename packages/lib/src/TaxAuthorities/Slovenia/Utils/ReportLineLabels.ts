import type { CashActionId } from "@brrr/Core/Models/Identifiers";
import type { EDavkiDividendType } from "@brrr/TaxAuthorities/Slovenia/Models/Div/EDavkiDividendType";
import type {
	EDavkiIsin,
	EDavkiPayerIdentificationNumber,
	EDavkiSecurityCode,
} from "@brrr/TaxAuthorities/Slovenia/Models/EDavkiIdentifiers";
import type { DateTime } from "luxon";

function day(date: DateTime): string {
	return date.toFormat("yyyy-MM-dd");
}

// The labels the Slovenian report side gives its provenance nodes: the lines of each form, and the
// sums DOH_DIV makes on the way to them.
export const ReportLineLabels = {
	kdvpLine(bought: boolean, date: DateTime, quantity: number, isin: EDavkiIsin): string {
		return `DOH_KDVP ${bought ? "bought" : "sold"} ${day(date)} · ${quantity} ${isin}`;
	},

	ifiLine(
		bought: boolean,
		date: DateTime,
		quantity: number,
		code: EDavkiSecurityCode | null,
	): string {
		return `D_IFI ${bought ? "bought" : "sold"} ${day(date)} · ${quantity} ${code ?? "-"}`;
	},

	actionSum(actionId: CashActionId): string {
		return `action sum ${actionId}`;
	},

	daySum(date: DateTime, dividendType: EDavkiDividendType): string {
		return `day sum ${day(date)} · ${dividendType}`;
	},

	divLine(
		dateReceived: DateTime,
		payer: EDavkiPayerIdentificationNumber,
		dividendAmount: number,
	): string {
		return `DOH_DIV ${day(dateReceived)} · ${payer} · ${dividendAmount}`;
	},
};
