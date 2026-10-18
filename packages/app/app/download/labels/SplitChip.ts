import type { IdentifierChangeType } from "@brrr/lib";

export type SplitChipArgs = {
	kind: IdentifierChangeType;
	before: string | null;
	after: string | null;
	fromIsin: string | null;
	fromTicker: string | null;
};

// What a corporate action chip in the instrument header says, as the action recorded it.
export class SplitChip {
	public readonly kind: IdentifierChangeType;
	public readonly before: string | null;
	public readonly after: string | null;
	public readonly fromIsin: string | null;
	public readonly fromTicker: string | null;

	public constructor(args: SplitChipArgs) {
		this.kind = args.kind;
		this.before = args.before;
		this.after = args.after;
		this.fromIsin = args.fromIsin;
		this.fromTicker = args.fromTicker;
	}
}
