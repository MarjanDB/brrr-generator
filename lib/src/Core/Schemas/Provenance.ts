import type { GenericMonetaryExchangeInformation } from "@brrr/Core/Schemas/CommonFormats";
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

	copy(overrides: Partial<ConstructorParameters<typeof RenameProvenanceStep>[0]>): RenameProvenanceStep {
		return new RenameProvenanceStep({
			fromIdentifier: this.fromIdentifier,
			toIdentifier: this.toIdentifier,
			changeType: this.changeType,
			effectiveDate: this.effectiveDate,
			...overrides,
		});
	}
}

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
	public readonly beforeExchangedMoney?: GenericMonetaryExchangeInformation | null;

	constructor(
		args: ProvenanceStepArgs & {
			quantityBefore?: number | null;
			quantityAfter?: number | null;
			beforeQuantity?: number | null;
			beforeTradePrice?: number | null;
			beforeExchangedMoney?: GenericMonetaryExchangeInformation | null;
		},
	) {
		this.fromIdentifier = args.fromIdentifier;
		this.toIdentifier = args.toIdentifier;
		this.changeType = args.changeType;
		this.effectiveDate = args.effectiveDate;
		this.quantityBefore = args.quantityBefore;
		this.quantityAfter = args.quantityAfter;
		this.beforeQuantity = args.beforeQuantity;
		this.beforeTradePrice = args.beforeTradePrice;
		this.beforeExchangedMoney = args.beforeExchangedMoney;
	}

	copy(overrides: Partial<ConstructorParameters<typeof SplitProvenanceStep>[0]>): SplitProvenanceStep {
		return new SplitProvenanceStep({
			fromIdentifier: this.fromIdentifier,
			toIdentifier: this.toIdentifier,
			changeType: this.changeType,
			effectiveDate: this.effectiveDate,
			quantityBefore: this.quantityBefore,
			quantityAfter: this.quantityAfter,
			beforeQuantity: this.beforeQuantity,
			beforeTradePrice: this.beforeTradePrice,
			beforeExchangedMoney: this.beforeExchangedMoney,
			...overrides,
		});
	}
}

export type AnyProvenanceStep = RenameProvenanceStep | SplitProvenanceStep;
