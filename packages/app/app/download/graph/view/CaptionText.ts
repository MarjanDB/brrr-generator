import type { ProvenanceDrop } from "@brrr/lib";
import type { GraphLayoutNode } from "~/download/graph/GraphLayoutNode";

export type CaptionTextArgs = {
	key: string;
	params: Record<string, string>;
	keyParams: readonly string[];
	node: GraphLayoutNode | null;
	drop: ProvenanceDrop | null;
};

// One caption segment as an i18n key with its params. The view translates it.
export class CaptionText {
	public readonly key: string;
	public readonly params: Record<string, string>;
	// The params whose value is itself an i18n key, to be translated first.
	public readonly keyParams: readonly string[];
	// The node it is about: the view draws its icon.
	public readonly node: GraphLayoutNode | null;
	// For a left-out node: the view writes the drop's sentence instead of the key's text.
	public readonly drop: ProvenanceDrop | null;

	public constructor(args: CaptionTextArgs) {
		this.key = args.key;
		this.params = args.params;
		this.keyParams = args.keyParams;
		this.node = args.node;
		this.drop = args.drop;
	}
}
