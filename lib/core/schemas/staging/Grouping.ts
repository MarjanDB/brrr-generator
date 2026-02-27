import type { GenericCategory } from "@brrr/core/schemas/CommonFormats.ts";
import type { StagingFinancialIdentifier } from "./StagingFinancialIdentifier.ts";
import type {
  StagingTradeEventDerivative,
  StagingTradeEventStock,
  StagingTransactionCash,
} from "./Events.ts";
import type { StagingTaxLot } from "./Lots.ts";

export type StagingFinancialGrouping = {
  financialIdentifier: StagingFinancialIdentifier;
  countryOfOrigin: string | null;

  underlyingCategory: GenericCategory;

  stockTrades: StagingTradeEventStock[];
  stockTaxLots: StagingTaxLot[];

  derivativeTrades: StagingTradeEventDerivative[];
  derivativeTaxLots: StagingTaxLot[];

  cashTransactions: StagingTransactionCash[];
};
