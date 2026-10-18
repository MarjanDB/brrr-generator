import {
	EDavkiProvenanceField,
	ProvenanceEventKind,
	ProvenanceField,
	type ProvenanceNode,
	type TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";
import type { CaptionSegment } from "~/download/graph/CaptionSegment";
import { CaptionSegmentKind } from "~/download/graph/CaptionSegmentKind";
import type { GraphLayoutNode } from "~/download/graph/GraphLayoutNode";
import { GraphNodeKind } from "~/download/graph/GraphNodeKind";
import { CaptionText } from "~/download/graph/view/CaptionText";
import { NodeValueKind } from "~/download/graph/view/NodeValueKind";
import { nodeValueOf } from "~/download/graph/view/nodeValueOf";
import { eventKindKeys, lotMatchingKeys, nodeValueKeys, stackKindKeys } from "~/utils/i18nKeys";
import { fieldOf, formatNumber } from "~/utils/provenanceFields";

export type CaptionContext = {
	ticker: string;
	lotMatchingMethod: TaxAuthorityLotMatchingMethod;
	locale: string;
};

// A line in a pair's card whose side was left out has no quantity to show.
const noQuantity = "—";

function text(
	key: string,
	params: Record<string, string>,
	node: GraphLayoutNode | null,
	keyParams: readonly string[] = [],
): CaptionText {
	return new CaptionText({ key, params, keyParams, node, drop: null });
}

function unsigned(quantity: string | null | undefined, locale: string): string {
	if (quantity === null || quantity === undefined || quantity.trim() === "") {
		return "";
	}
	const number = Number(quantity);
	return Number.isFinite(number) ? formatNumber(String(Math.abs(number)), locale) : quantity;
}

function focusText(node: GraphLayoutNode, context: CaptionContext): CaptionText {
	const graphNode = node.node;
	if (graphNode.pair !== null) {
		return text(
			nodeValueKeys[NodeValueKind.MATCHED],
			{ quantity: unsigned(fieldOf(graphNode.pair.lot, ProvenanceField.QUANTITY), context.locale) },
			node,
		);
	}
	const kind = Object.values(ProvenanceEventKind).find(
		(candidate) => candidate === graphNode.source?.fields[ProvenanceField.EVENT_KIND],
	);
	if (graphNode.kind === GraphNodeKind.EVENT && kind !== undefined) {
		const value = nodeValueOf(graphNode, context.locale);
		if (value.kind === NodeValueKind.CASH) {
			return text(
				"download_caption_cash",
				{
					kind: eventKindKeys[kind],
					amount: value.params.amount ?? "",
					currency: value.params.currency ?? "",
				},
				node,
				["kind"],
			);
		}
		return text(
			"download_caption_trade",
			{
				kind: eventKindKeys[kind],
				quantity: unsigned(graphNode.source?.fields[ProvenanceField.QUANTITY], context.locale),
				ticker: context.ticker,
			},
			node,
			["kind"],
		);
	}
	const value = nodeValueOf(graphNode, context.locale);
	return text(nodeValueKeys[value.kind], value.params, node, value.keyParams);
}

function boughtAndSoldText(node: GraphLayoutNode, context: CaptionContext): CaptionText {
	const pair = node.node.pair;
	return text(
		"download_caption_bought_sold",
		{
			bought: lineQuantity(pair?.acquired.line, context.locale),
			sold: lineQuantity(pair?.sold.line, context.locale),
		},
		node,
	);
}

function lineQuantity(line: ProvenanceNode | null | undefined, locale: string): string {
	return line === null || line === undefined
		? noQuantity
		: unsigned(line.fields[EDavkiProvenanceField.QUANTITY], locale);
}

// The words of one part of the caption, as an i18n key with its params. Nothing here translates:
// a param named in keyParams holds a key, and the view translates it before filling the text in.
export function captionTextOf(segment: CaptionSegment, context: CaptionContext): CaptionText {
	const node = segment.node;
	const count = String(segment.count ?? 0);
	switch (segment.kind) {
		case CaptionSegmentKind.FOCUS:
			return node === null
				? text("download_node_text", { text: "" }, null)
				: focusText(node, context);
		case CaptionSegmentKind.SPLIT_INTO:
			return text(
				"download_caption_split_into",
				{ quantity: unsigned(node?.node.source?.fields[ProvenanceField.QUANTITY], context.locale) },
				node,
			);
		case CaptionSegmentKind.MATCHED_WITH:
			return text(
				segment.opposite === ProvenanceEventKind.ACQUIRED
					? "download_caption_matched_buys"
					: "download_caption_matched_sells",
				{ count, method: lotMatchingKeys[context.lotMatchingMethod] },
				node,
				["method"],
			);
		case CaptionSegmentKind.REPORT_LINES:
			return text("download_badge_lines", { n: count }, node);
		case CaptionSegmentKind.SUMMED_INTO:
			return text("download_caption_summed_into", { n: count }, node);
		case CaptionSegmentKind.BOUGHT_AND_SOLD:
			return node === null
				? text("download_caption_bought_sold", { bought: noQuantity, sold: noQuantity }, null)
				: boughtAndSoldText(node, context);
		case CaptionSegmentKind.ADJUSTED:
			return text("download_caption_adjusted", { n: count }, node);
		case CaptionSegmentKind.LEFT_OUT:
			return new CaptionText({
				key: stackKindKeys[GraphNodeKind.DROP],
				params: {},
				keyParams: [],
				node,
				drop: segment.drop,
			});
	}
}
