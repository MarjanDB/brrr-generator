import { DropCategory, dropCategoryOf, ProvenanceEventKind, ProvenanceField } from "@brrr/lib";
import { type GraphNode, GraphNodeKind } from "~/types/provenanceGraph";
import { ColorIntent } from "~/types/ui";

const intents: ColorIntent[] = [
	ColorIntent.ACTION,
	ColorIntent.ACCENT,
	ColorIntent.SUCCESS,
	ColorIntent.WARNING,
	ColorIntent.DANGER,
	ColorIntent.INFO,
];

// A ticker's colour: a stable hash of it into the intents that read as colours (never NEUTRAL).
export function monogramIntent(ticker: string): ColorIntent {
	let hash = 0;
	for (const character of ticker) {
		hash = (hash * 31 + character.charCodeAt(0)) % 997;
	}
	return intents[hash % intents.length] ?? ColorIntent.ACTION;
}

// The letters in the monogram: a short ticker as it is, a longer one cut to its first three.
export function monogramText(ticker: string): string {
	return ticker.length <= 4 ? ticker : ticker.slice(0, 3);
}

export type NodeLook = {
	icon: string;
	tint: string;
};

// UnoCSS only sees class strings written out in full, so every icon and tint is a literal.
const neutral = "bg-neutral-soft text-neutral-ink";
const action = "bg-action-soft text-action-ink";
const accent = "bg-accent-soft text-accent-ink";
const success = "bg-success-soft text-success-ink";
const danger = "bg-danger-soft text-danger-ink";
const info = "bg-info-soft text-info-ink";
const warning = "bg-warning-soft text-warning-ink";

function eventLook(node: GraphNode): NodeLook {
	switch (node.source?.fields[ProvenanceField.EVENT_KIND]) {
		case ProvenanceEventKind.ACQUIRED:
			return { icon: "i-mdi-triangle", tint: success };
		case ProvenanceEventKind.SOLD:
			return { icon: "i-mdi-triangle-down", tint: danger };
		case ProvenanceEventKind.DIVIDEND:
		case ProvenanceEventKind.PAYMENT_IN_LIEU:
			return { icon: "i-mdi-circle", tint: info };
		case ProvenanceEventKind.WITHHOLDING_TAX:
		case ProvenanceEventKind.WITHHOLDING_TAX_ON_PAYMENT_IN_LIEU:
			return { icon: "i-mdi-circle-small", tint: warning };
		default:
			return { icon: "i-mdi-circle-outline", tint: neutral };
	}
}

// The icon and the colour of a node, from its kind (and for a trade, what it is).
export function nodeLookOf(node: GraphNode): NodeLook {
	switch (node.kind) {
		case GraphNodeKind.FILE:
			return { icon: "i-mdi-file-xml-box", tint: neutral };
		case GraphNodeKind.ROW:
			return { icon: "i-mdi-table-row", tint: neutral };
		case GraphNodeKind.RECORD:
			return { icon: "i-mdi-code-braces", tint: neutral };
		case GraphNodeKind.STAGING_EVENT:
		case GraphNodeKind.STAGING_LOT:
		case GraphNodeKind.STAGING_CORPORATE_ACTION:
			return { icon: "i-mdi-layers-outline", tint: neutral };
		case GraphNodeKind.EVENT:
			return eventLook(node);
		case GraphNodeKind.LOT:
			return { icon: "i-mdi-circle-outline", tint: action };
		case GraphNodeKind.CORPORATE_ACTION:
			return { icon: "i-mdi-call-split", tint: accent };
		case GraphNodeKind.MATCHED_LOT:
		case GraphNodeKind.PAIR:
			return { icon: "i-mdi-link-variant", tint: action };
		case GraphNodeKind.SUM:
			return { icon: "i-mdi-sigma", tint: info };
		case GraphNodeKind.LEG:
			return { icon: "i-mdi-source-branch", tint: neutral };
		case GraphNodeKind.REPORT_LINE:
			return { icon: "i-mdi-file-document-outline", tint: success };
		case GraphNodeKind.DROP:
			return node.drop !== null && dropCategoryOf(node.drop.reason) === DropCategory.NEEDS_A_LOOK
				? { icon: "i-mdi-alert-circle-outline", tint: warning }
				: { icon: "i-mdi-cancel", tint: neutral };
		case GraphNodeKind.STACK:
			return { icon: "i-mdi-layers", tint: neutral };
	}
}
