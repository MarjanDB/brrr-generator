import {
	EDavkiProvenanceField,
	IdentifierChangeType,
	ProvenanceEventKind,
	ProvenanceField,
	ProvenanceLegSide,
	type ProvenanceNode,
} from "@brrr/lib";
import { DateTime } from "luxon";
import type { GraphNode } from "~/download/graph/GraphNode";
import { GraphNodeKind } from "~/download/graph/GraphNodeKind";
import { NodeValue } from "~/download/graph/view/NodeValue";
import { NodeValueKind } from "~/download/graph/view/NodeValueKind";
import { legSideKeys, nodeValueKeys, stackKindKeys } from "~/utils/i18nKeys";
import { splitRatioOf } from "~/utils/instrumentPanel";
import { fieldOf, formatNumber } from "~/utils/provenanceFields";

const cashKinds: ProvenanceEventKind[] = [
	ProvenanceEventKind.DIVIDEND,
	ProvenanceEventKind.PAYMENT_IN_LIEU,
	ProvenanceEventKind.WITHHOLDING_TAX,
	ProvenanceEventKind.WITHHOLDING_TAX_ON_PAYMENT_IN_LIEU,
];

function value(
	kind: NodeValueKind,
	params: Record<string, string>,
	keyParams: readonly string[] = [],
): NodeValue {
	return new NodeValue({ kind, params, keyParams });
}

// A day and a month, as the reader writes them. A value that isn't a date is shown as recorded.
function shortDate(iso: string | null, locale: string): string {
	if (iso === null) {
		return "";
	}
	const date = DateTime.fromISO(iso, { zone: "utc" });
	return date.isValid
		? date.setLocale(locale).toLocaleString({ day: "numeric", month: "short" })
		: iso;
}

function number(text: string | null, locale: string): string {
	return text === null ? "" : formatNumber(text, locale);
}

function eventValue(node: GraphNode, locale: string): NodeValue {
	const source = node.source;
	if (source === null) {
		return value(NodeValueKind.TEXT, { text: "" });
	}
	const currency = fieldOf(source, ProvenanceField.CURRENCY) ?? "";
	const price = fieldOf(source, ProvenanceField.PRICE);
	const kind = Object.values(ProvenanceEventKind).find(
		(candidate) => candidate === fieldOf(source, ProvenanceField.EVENT_KIND),
	);
	if (kind !== undefined && cashKinds.includes(kind)) {
		// A cash transaction is one unit of its amount, or a quantity of the amount each.
		const quantity = fieldOf(source, ProvenanceField.QUANTITY);
		const amount = price === null ? null : String(Number(price) * Number(quantity ?? "1"));
		return value(NodeValueKind.CASH, { amount: number(amount, locale), currency });
	}
	return value(NodeValueKind.TRADE, {
		quantity: number(fieldOf(source, ProvenanceField.QUANTITY), locale),
		price: number(price, locale),
		currency,
	});
}

function corporateActionValue(node: GraphNode, locale: string): NodeValue {
	const source = node.source;
	if (source === null) {
		return value(NodeValueKind.TEXT, { text: "" });
	}
	const kind = Object.values(IdentifierChangeType).find(
		(candidate) => candidate === fieldOf(source, ProvenanceField.CORPORATE_ACTION_KIND),
	);
	switch (kind) {
		case IdentifierChangeType.SPLIT:
		case IdentifierChangeType.REVERSE_SPLIT: {
			const ratio = splitRatioOf(
				{
					kind,
					before: fieldOf(source, ProvenanceField.SPLIT_BEFORE),
					after: fieldOf(source, ProvenanceField.SPLIT_AFTER),
					fromIsin: null,
					fromTicker: null,
				},
				locale,
			);
			return value(
				kind === IdentifierChangeType.SPLIT ? NodeValueKind.SPLIT : NodeValueKind.REVERSE_SPLIT,
				{ before: ratio?.before ?? "", after: ratio?.after ?? "" },
			);
		}
		case IdentifierChangeType.RENAME:
			return value(NodeValueKind.RENAME, {
				from: fieldOf(source, ProvenanceField.FROM_TICKER) ?? "",
				to: fieldOf(source, ProvenanceField.TO_TICKER) ?? "",
			});
		case undefined:
			return value(NodeValueKind.TEXT, { text: source.label });
	}
}

function legValue(node: GraphNode, locale: string): NodeValue {
	const source = node.source;
	const recorded = source === null ? null : fieldOf(source, ProvenanceField.LEG_SIDE);
	const side = Object.values(ProvenanceLegSide).find((candidate) => candidate === recorded);
	if (source === null || side === undefined) {
		return value(NodeValueKind.STEP, { kind: stackKindKeys[GraphNodeKind.LEG] }, ["kind"]);
	}
	return value(
		NodeValueKind.LEG,
		{
			side: legSideKeys[side],
			quantity: number(fieldOf(source, ProvenanceField.QUANTITY), locale),
		},
		["side"],
	);
}

// What a report line says. A pair card shows its two lines this way too.
export function reportLineValueOf(source: ProvenanceNode, locale: string): NodeValue {
	const boughtOn = source.fields[EDavkiProvenanceField.BOUGHT_ON];
	const soldOn = source.fields[EDavkiProvenanceField.SOLD_ON];
	const dateReceived = source.fields[EDavkiProvenanceField.DATE_RECEIVED];
	const quantity = number(source.fields[EDavkiProvenanceField.QUANTITY] ?? null, locale);
	if (boughtOn !== undefined) {
		return value(NodeValueKind.LINE_BOUGHT, { quantity, date: shortDate(boughtOn, locale) });
	}
	if (soldOn !== undefined) {
		return value(NodeValueKind.LINE_SOLD, { quantity, date: shortDate(soldOn, locale) });
	}
	if (dateReceived !== undefined) {
		return value(NodeValueKind.LINE_DIVIDEND, {
			date: shortDate(dateReceived, locale),
			amount: number(source.fields[EDavkiProvenanceField.DIVIDEND_AMOUNT] ?? null, locale),
		});
	}
	return value(NodeValueKind.LINE_OTHER, { text: stackKindKeys[GraphNodeKind.REPORT_LINE] }, [
		"text",
	]);
}

// What a node says, from the facts the stage recorded on it and never from its label (the label is
// the broker's or lib's own wording and is used only for files and rows). A drop says its sentence
// and a pair is drawn as a card, so neither has a value.
export function nodeValueOf(node: GraphNode, locale: string): NodeValue {
	const source = node.source;
	switch (node.kind) {
		case GraphNodeKind.FILE:
		case GraphNodeKind.ROW:
			return value(NodeValueKind.TEXT, { text: source?.label ?? "" });
		case GraphNodeKind.RECORD:
		case GraphNodeKind.STAGING_EVENT:
		case GraphNodeKind.STAGING_LOT:
		case GraphNodeKind.STAGING_CORPORATE_ACTION:
			// These carry no facts of their own (their core twin does), so they say what step they are.
			return value(NodeValueKind.STEP, { kind: stackKindKeys[node.kind] }, ["kind"]);
		case GraphNodeKind.LEG:
			return legValue(node, locale);
		case GraphNodeKind.EVENT:
			return eventValue(node, locale);
		case GraphNodeKind.LOT:
			return value(NodeValueKind.LOT, {
				quantity: number(
					source === null ? null : fieldOf(source, ProvenanceField.QUANTITY),
					locale,
				),
				date: shortDate(
					source === null ? null : fieldOf(source, ProvenanceField.ACQUIRED_DATE),
					locale,
				),
			});
		case GraphNodeKind.CORPORATE_ACTION:
			return corporateActionValue(node, locale);
		case GraphNodeKind.MATCHED_LOT:
			return value(NodeValueKind.MATCHED, {
				quantity: number(
					source === null ? null : fieldOf(source, ProvenanceField.QUANTITY),
					locale,
				),
			});
		case GraphNodeKind.SUM:
			return value(NodeValueKind.SUM, {
				date: shortDate(source?.fields[EDavkiProvenanceField.DATE_RECEIVED] ?? null, locale),
				amount: number(source?.fields[EDavkiProvenanceField.DIVIDEND_AMOUNT] ?? null, locale),
			});
		case GraphNodeKind.REPORT_LINE:
			return source === null
				? value(NodeValueKind.TEXT, { text: "" })
				: reportLineValueOf(source, locale);
		case GraphNodeKind.STACK:
			return value(
				NodeValueKind.STACK,
				{
					count: String(node.stack?.members.length ?? 0),
					kind: stackKindKeys[node.stack?.memberKind ?? GraphNodeKind.ROW],
				},
				["kind"],
			);
		case GraphNodeKind.PAIR:
		case GraphNodeKind.DROP:
			throw new Error(`A ${node.kind} node is drawn by its own card and has no value`);
	}
}

// The text of a node value: its i18n text, with the params that are keys translated first.
export function nodeTextOf(
	nodeValue: NodeValue,
	translate: (key: string, params: Record<string, string>) => string,
): string {
	const params: Record<string, string> = {};
	for (const [name, text] of Object.entries(nodeValue.params)) {
		params[name] = nodeValue.keyParams.includes(name) ? translate(text, {}) : text;
	}
	return translate(nodeValueKeys[nodeValue.kind], params);
}
