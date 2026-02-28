import type { DateTime } from "luxon";
import type { FinancialIdentifier } from "./FinancialIdentifier.ts";
import type { IdentifierChangeType } from "./IdentifierRelationship.ts";
import type { GenericMonetaryExchangeInformation } from "./CommonFormats.ts";

export type ProvenanceStep = {
	kind: "rename" | "split";
	fromIdentifier: FinancialIdentifier;
	toIdentifier: FinancialIdentifier;
	changeType: IdentifierChangeType;
	effectiveDate: DateTime;
};

export type RenameProvenanceStep = ProvenanceStep & {
	kind: "rename";
};

export type SplitProvenanceStep = ProvenanceStep & {
	kind: "split";
	quantityBefore?: number | null;
	quantityAfter?: number | null;
	beforeQuantity?: number | null;
	beforeTradePrice?: number | null;
	beforeExchangedMoney?: GenericMonetaryExchangeInformation | null;
};

export type AnyProvenanceStep = RenameProvenanceStep | SplitProvenanceStep;
