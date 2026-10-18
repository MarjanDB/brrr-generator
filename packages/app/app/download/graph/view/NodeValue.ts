import type { NodeValueKind } from "~/download/graph/view/NodeValueKind";

export type NodeValueArgs = {
	kind: NodeValueKind;
	params: Record<string, string>;
	// The params whose value is an i18n key, to be translated before the text is written.
	keyParams: readonly string[];
};

// What a node says, as a kind and the values for its i18n text. The view writes the text.
export class NodeValue {
	public readonly kind: NodeValueKind;
	public readonly params: Record<string, string>;
	public readonly keyParams: readonly string[];

	public constructor(args: NodeValueArgs) {
		this.kind = args.kind;
		this.params = args.params;
		this.keyParams = args.keyParams;
	}
}
