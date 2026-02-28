import type { DateTime } from "luxon";
import type { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier.ts";
import type { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationship.ts";
import type { GenericMonetaryExchangeInformation } from "@brrr/Core/Schemas/CommonFormats.ts";

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
