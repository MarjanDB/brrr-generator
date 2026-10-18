export enum SplitFactorKind {
	MULTIPLY = "MULTIPLY",
	DIVIDE = "DIVIDE",
}

export type SplitFactorArgs = {
	kind: SplitFactorKind;
	amount: number;
};

// What a split did to a quantity: 4 before, 40 after is ×10; 10 before, 1 after is ÷10.
// The view formats it.
export class SplitFactor {
	public readonly kind: SplitFactorKind;
	public readonly amount: number;

	public constructor(args: SplitFactorArgs) {
		this.kind = args.kind;
		this.amount = args.amount;
	}

	public static of(before: string, after: string): SplitFactor | null {
		const quantityBefore = Number(before);
		const quantityAfter = Number(after);
		if (!(quantityBefore > 0) || !(quantityAfter > 0)) {
			return null;
		}
		if (quantityAfter >= quantityBefore) {
			return new SplitFactor({
				kind: SplitFactorKind.MULTIPLY,
				amount: quantityAfter / quantityBefore,
			});
		}
		return new SplitFactor({
			kind: SplitFactorKind.DIVIDE,
			amount: quantityBefore / quantityAfter,
		});
	}
}
