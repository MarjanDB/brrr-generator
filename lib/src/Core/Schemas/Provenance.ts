import type { FinancialIdentifier } from "@brrr/Core/Schemas/FinancialIdentifier";
import type { IdentifierChangeType } from "@brrr/Core/Schemas/IdentifierRelationship";
import type { ValidDateTime } from "@brrr/Utils/DateTime";

type ProvenanceStepArgs = {
	fromIdentifier: FinancialIdentifier;
	toIdentifier: FinancialIdentifier;
	changeType: IdentifierChangeType;
	effectiveDate: ValidDateTime;
};

export class RenameProvenanceStep {
	public readonly kind = "rename" as const;
	public readonly fromIdentifier: FinancialIdentifier;
	public readonly toIdentifier: FinancialIdentifier;
	public readonly changeType: IdentifierChangeType;
	public readonly effectiveDate: ValidDateTime;

	constructor(args: ProvenanceStepArgs) {
		this.fromIdentifier = args.fromIdentifier;
		this.toIdentifier = args.toIdentifier;
		this.changeType = args.changeType;
		this.effectiveDate = args.effectiveDate;
	}
}

type SplitProvenanceStepArgs = ProvenanceStepArgs & {
	quantityBefore?: number | null;
	quantityAfter?: number | null;
	beforeQuantity?: number | null;
	beforeTradePrice?: number | null;
};

export class SplitProvenanceStep {
	public readonly kind = "split" as const;
	public readonly fromIdentifier: FinancialIdentifier;
	public readonly toIdentifier: FinancialIdentifier;
	public readonly changeType: IdentifierChangeType;
	public readonly effectiveDate: ValidDateTime;
	public readonly quantityBefore?: number | null;
	public readonly quantityAfter?: number | null;
	public readonly beforeQuantity?: number | null;
	public readonly beforeTradePrice?: number | null;

	constructor(args: SplitProvenanceStepArgs) {
		this.fromIdentifier = args.fromIdentifier;
		this.toIdentifier = args.toIdentifier;
		this.changeType = args.changeType;
		this.effectiveDate = args.effectiveDate;
		this.quantityBefore = args.quantityBefore;
		this.quantityAfter = args.quantityAfter;
		this.beforeQuantity = args.beforeQuantity;
		this.beforeTradePrice = args.beforeTradePrice;
	}
}

export type AnyProvenanceStep = RenameProvenanceStep | SplitProvenanceStep;
