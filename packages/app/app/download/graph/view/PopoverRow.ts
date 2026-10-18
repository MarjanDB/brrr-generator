export type PopoverRowArgs = {
	name: string;
	nameKey: string | null;
	value: string;
};

export class PopoverRow {
	// The broker's own name for an attribute; for a report line, the name to fall back on.
	public readonly name: string;
	// The i18n key of a report line's field name; null for a broker attribute, which keeps its own.
	public readonly nameKey: string | null;
	public readonly value: string;

	public constructor(args: PopoverRowArgs) {
		this.name = args.name;
		this.nameKey = args.nameKey;
		this.value = args.value;
	}
}
