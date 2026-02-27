import type { DateTime } from "luxon";
import type { FinancialGrouping } from "./Grouping.ts";

// Forward declaration - LotMatchingMethod is defined in lotMatching
export interface LotMatchingMethodContract {
  performMatching(events: unknown[]): unknown[];
}

export type LotMatchingConfiguration = {
  fromDate: DateTime;
  toDate: DateTime;
  forStocks: (grouping: FinancialGrouping) => LotMatchingMethodContract;
  forDerivatives: (grouping: FinancialGrouping) => LotMatchingMethodContract;
};
