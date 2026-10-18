import { z } from "zod/v4";
import type { GraphDirection } from "~/download/graph/GraphDirection";
import type { GraphNodeKind } from "~/download/graph/GraphNodeKind";

// Mirrors lib's Nominal: the same idea, kept here because the app never builds lib's own ids.
export type Nominal<Value, Brand extends string> = Value & { readonly __brand: Brand };

// A node of the visible graph: a recorded node's id, or "pair:<lot id>" for a matched-lot card.
export type GraphNodeKey = Nominal<string, "Download.GraphNodeKey">;
export const GraphNodeKey = {
	Schema: z.string().transform((value) => value as GraphNodeKey),
};

// A folded stack: the node it hangs on, which side, and what kind its members are.
export type StackKey = Nominal<string, "Download.StackKey">;
export const StackKey = {
	Schema: z.string().transform((value) => value as StackKey),
	of(owner: GraphNodeKey, direction: GraphDirection, kind: GraphNodeKind): StackKey {
		return StackKey.Schema.parse(`${owner}:${direction}:${kind}`);
	},
};
