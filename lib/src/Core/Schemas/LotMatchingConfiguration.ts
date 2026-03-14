import type { FinancialGrouping } from "@brrr/Core/Schemas/Grouping";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

// Forward declaration - LotMatchingMethod is defined in lotMatching
export interface LotMatchingMethodContract {
	performMatching(events: unknown[]): unknown[];
}

export type LotMatchingConfiguration = {
	fromDate: ValidDateTime;
	toDate: ValidDateTime;
	forStocks: (grouping: FinancialGrouping) => LotMatchingMethodContract;
	forDerivatives: (grouping: FinancialGrouping) => LotMatchingMethodContract;
};
