import {
	type ProvenanceStepArgs,
	ProvenanceStepBase,
} from "@brrr/Core/Models/Provenance/ProvenanceStepBase";

type SplitProvenanceStepArgs = ProvenanceStepArgs & {
	quantityBefore?: number | null;
	quantityAfter?: number | null;
	beforeQuantity?: number | null;
	beforeTradePrice?: number | null;
};

export class SplitProvenanceStep extends ProvenanceStepBase {
	public readonly quantityBefore?: number | null;
	public readonly quantityAfter?: number | null;
	public readonly beforeQuantity?: number | null;
	public readonly beforeTradePrice?: number | null;

	public constructor(args: SplitProvenanceStepArgs) {
		super(args);
		this.quantityBefore = args.quantityBefore;
		this.quantityAfter = args.quantityAfter;
		this.beforeQuantity = args.beforeQuantity;
		this.beforeTradePrice = args.beforeTradePrice;
	}
}
