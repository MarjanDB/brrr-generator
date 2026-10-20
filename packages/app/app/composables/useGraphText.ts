import {
	EDavkiProvenanceField,
	IdentifierChangeType,
	ProvenanceEventKind,
	ProvenanceField,
	ProvenanceLegSide,
	type ProvenanceNode,
	ProvenanceNodeKind,
	type ProvenanceWalker,
	type TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";
import { DateTime } from "luxon";
import {
	type CaptionSegment,
	CaptionSegmentKind,
	type GraphLayoutNode,
	type GraphNode,
	GraphNodeKind,
	NodeValueKind,
	type SplitFactor,
	SplitFactorKind,
} from "~/types/provenanceGraph";
import { I18nKeys } from "~/utils/i18nKeys";
import { ProvenanceFields } from "~/utils/provenanceFields";
import { ReportInstruments } from "~/utils/reportInstruments";

export type CaptionContext = {
	ticker: string;
	lotMatchingMethod: TaxAuthorityLotMatchingMethod;
};

// What a popover lists, finished: a title, the name and value of each row, and a foot line.
export type GraphPopoverText = {
	title: string;
	rows: { name: string; value: string }[];
	foot: string;
};

// A text as an i18n key with its params; a param named in keyParams holds a key, translated
// before the text is filled in.
type KeyedText = {
	key: string;
	params: Record<string, string>;
	keyParams: readonly string[];
};

type NodeValue = KeyedText & { kind: NodeValueKind };

const cashKinds: ProvenanceEventKind[] = [
	ProvenanceEventKind.DIVIDEND,
	ProvenanceEventKind.PAYMENT_IN_LIEU,
	ProvenanceEventKind.WITHHOLDING_TAX,
	ProvenanceEventKind.WITHHOLDING_TAX_ON_PAYMENT_IN_LIEU,
];

// The report-line fields that are amounts or quantities. Dates, ids and codes are shown unchanged,
// so a tracking id never gets thousands separators.
const numericFields: string[] = [
	EDavkiProvenanceField.QUANTITY,
	EDavkiProvenanceField.PRICE_PER_UNIT,
	EDavkiProvenanceField.TOTAL_PRICE,
	EDavkiProvenanceField.COMMISSIONS,
	EDavkiProvenanceField.DIVIDEND_AMOUNT,
	EDavkiProvenanceField.FOREIGN_TAX_PAID,
];

// A line in a pair's card whose side was left out has no quantity to show.
const noQuantity = "—";

function value(
	kind: NodeValueKind,
	params: Record<string, string>,
	keyParams: readonly string[] = [],
): NodeValue {
	return { kind, key: I18nKeys.nodeValue[kind], params, keyParams };
}

function keyed(
	key: string,
	params: Record<string, string>,
	keyParams: readonly string[] = [],
): KeyedText {
	return { key, params, keyParams };
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
	return text === null ? "" : ProvenanceFields.formatNumber(text, locale);
}

function unsigned(quantity: string | null | undefined, locale: string): string {
	if (quantity === null || quantity === undefined || quantity.trim() === "") {
		return "";
	}
	const parsed = Number(quantity);
	return Number.isFinite(parsed)
		? ProvenanceFields.formatNumber(String(Math.abs(parsed)), locale)
		: quantity;
}

function eventValue(node: GraphNode, locale: string): NodeValue {
	const source = node.source;
	if (source === null) {
		return value(NodeValueKind.TEXT, { text: "" });
	}
	const currency = ProvenanceFields.of(source, ProvenanceField.CURRENCY) ?? "";
	const price = ProvenanceFields.of(source, ProvenanceField.PRICE);
	const kind = Object.values(ProvenanceEventKind).find(
		(candidate) => candidate === ProvenanceFields.of(source, ProvenanceField.EVENT_KIND),
	);
	if (kind !== undefined && cashKinds.includes(kind)) {
		// A cash transaction is one unit of its amount, or a quantity of the amount each.
		const quantity = ProvenanceFields.of(source, ProvenanceField.QUANTITY);
		const amount = price === null ? null : String(Number(price) * Number(quantity ?? "1"));
		return value(NodeValueKind.CASH, { amount: number(amount, locale), currency });
	}
	return value(NodeValueKind.TRADE, {
		quantity: number(ProvenanceFields.of(source, ProvenanceField.QUANTITY), locale),
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
		(candidate) => candidate === ProvenanceFields.of(source, ProvenanceField.CORPORATE_ACTION_KIND),
	);
	switch (kind) {
		case IdentifierChangeType.SPLIT:
		case IdentifierChangeType.REVERSE_SPLIT: {
			const ratio = ReportInstruments.splitRatioOf(
				{
					kind,
					before: ProvenanceFields.of(source, ProvenanceField.SPLIT_BEFORE),
					after: ProvenanceFields.of(source, ProvenanceField.SPLIT_AFTER),
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
				from: ProvenanceFields.of(source, ProvenanceField.FROM_TICKER) ?? "",
				to: ProvenanceFields.of(source, ProvenanceField.TO_TICKER) ?? "",
			});
		case undefined:
			return value(NodeValueKind.TEXT, { text: source.label });
	}
}

function legValue(node: GraphNode, locale: string): NodeValue {
	const source = node.source;
	const recorded = source === null ? null : ProvenanceFields.of(source, ProvenanceField.LEG_SIDE);
	const side = Object.values(ProvenanceLegSide).find((candidate) => candidate === recorded);
	if (source === null || side === undefined) {
		return value(NodeValueKind.STEP, { kind: I18nKeys.stackKind[GraphNodeKind.LEG] }, ["kind"]);
	}
	return value(
		NodeValueKind.LEG,
		{
			side: I18nKeys.legSide[side],
			quantity: number(ProvenanceFields.of(source, ProvenanceField.QUANTITY), locale),
		},
		["side"],
	);
}

// What a report line says. A pair card shows its two lines this way too.
function reportLineValue(source: ProvenanceNode, locale: string): NodeValue {
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
	return value(NodeValueKind.LINE_OTHER, { text: I18nKeys.stackKind[GraphNodeKind.REPORT_LINE] }, [
		"text",
	]);
}

// What a node says, from the facts the stage recorded on it and never from its label (the label is
// the broker's or lib's own wording and is used only for files and rows). A drop says its sentence
// and a pair is drawn as a card, so neither has a value.
function nodeValueOf(node: GraphNode, locale: string): NodeValue {
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
			return value(NodeValueKind.STEP, { kind: I18nKeys.stackKind[node.kind] }, ["kind"]);
		case GraphNodeKind.LEG:
			return legValue(node, locale);
		case GraphNodeKind.EVENT:
			return eventValue(node, locale);
		case GraphNodeKind.LOT:
			return value(NodeValueKind.LOT, {
				quantity: number(
					source === null ? null : ProvenanceFields.of(source, ProvenanceField.QUANTITY),
					locale,
				),
				date: shortDate(
					source === null ? null : ProvenanceFields.of(source, ProvenanceField.ACQUIRED_DATE),
					locale,
				),
			});
		case GraphNodeKind.CORPORATE_ACTION:
			return corporateActionValue(node, locale);
		case GraphNodeKind.MATCHED_LOT:
			return value(NodeValueKind.MATCHED, {
				quantity: number(
					source === null ? null : ProvenanceFields.of(source, ProvenanceField.QUANTITY),
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
				: reportLineValue(source, locale);
		case GraphNodeKind.STACK:
			return value(
				NodeValueKind.STACK,
				{
					count: String(node.stack?.members.length ?? 0),
					kind: I18nKeys.stackKind[node.stack?.memberKind ?? GraphNodeKind.ROW],
				},
				["kind"],
			);
		case GraphNodeKind.PAIR:
		case GraphNodeKind.DROP:
			throw new Error(`A ${node.kind} node is drawn by its own card and has no value`);
	}
}

function lineQuantity(line: ProvenanceNode | null | undefined, locale: string): string {
	return line === null || line === undefined
		? noQuantity
		: unsigned(line.fields[EDavkiProvenanceField.QUANTITY], locale);
}

function focusText(node: GraphLayoutNode, context: CaptionContext, locale: string): KeyedText {
	const graphNode = node.node;
	if (graphNode.pair !== null) {
		return keyed(I18nKeys.nodeValue[NodeValueKind.MATCHED], {
			quantity: unsigned(ProvenanceFields.of(graphNode.pair.lot, ProvenanceField.QUANTITY), locale),
		});
	}
	const kind = Object.values(ProvenanceEventKind).find(
		(candidate) => candidate === graphNode.source?.fields[ProvenanceField.EVENT_KIND],
	);
	if (graphNode.kind === GraphNodeKind.EVENT && kind !== undefined) {
		const nodeValue = nodeValueOf(graphNode, locale);
		if (nodeValue.kind === NodeValueKind.CASH) {
			return keyed(
				"download_caption_cash",
				{
					kind: I18nKeys.eventKind[kind],
					amount: nodeValue.params.amount ?? "",
					currency: nodeValue.params.currency ?? "",
				},
				["kind"],
			);
		}
		return keyed(
			"download_caption_trade",
			{
				kind: I18nKeys.eventKind[kind],
				quantity: unsigned(graphNode.source?.fields[ProvenanceField.QUANTITY], locale),
				ticker: context.ticker,
			},
			["kind"],
		);
	}
	return nodeValueOf(graphNode, locale);
}

// The words of one part of the caption as a key with its params. A left-out node has none: its
// sentence comes from the drop.
function captionKeyed(
	segment: CaptionSegment,
	context: CaptionContext,
	locale: string,
): KeyedText | null {
	const node = segment.node;
	const count = String(segment.count ?? 0);
	switch (segment.kind) {
		case CaptionSegmentKind.FOCUS:
			return node === null
				? keyed(I18nKeys.nodeValue[NodeValueKind.TEXT], { text: "" })
				: focusText(node, context, locale);
		case CaptionSegmentKind.SPLIT_INTO:
			return keyed("download_caption_split_into", {
				quantity: unsigned(node?.node.source?.fields[ProvenanceField.QUANTITY], locale),
			});
		case CaptionSegmentKind.MATCHED_WITH:
			return keyed(
				segment.opposite === ProvenanceEventKind.ACQUIRED
					? "download_caption_matched_buys"
					: "download_caption_matched_sells",
				{ count, method: I18nKeys.lotMatching[context.lotMatchingMethod] },
				["method"],
			);
		case CaptionSegmentKind.REPORT_LINES:
			return keyed("download_badge_lines", { n: count });
		case CaptionSegmentKind.SUMMED_INTO:
			return keyed("download_caption_summed_into", { n: count });
		case CaptionSegmentKind.BOUGHT_AND_SOLD:
			return keyed("download_caption_bought_sold", {
				bought: node === null ? noQuantity : lineQuantity(node.node.pair?.acquired.line, locale),
				sold: node === null ? noQuantity : lineQuantity(node.node.pair?.sold.line, locale),
			});
		case CaptionSegmentKind.ADJUSTED:
			return keyed("download_caption_adjusted", { n: count });
		case CaptionSegmentKind.LEFT_OUT:
			return null;
	}
}

// The graph's text, finished and in the reader's locale: the cards, the caption, the split badge
// and the popovers. It is written when asked for, so a language switch redraws it.
export function useGraphText() {
	const { t, locale } = useI18n();
	const { dropSentence } = useProvenanceText();

	function write(text: KeyedText): string {
		const params: Record<string, string> = {};
		for (const [name, param] of Object.entries(text.params)) {
			params[name] = text.keyParams.includes(name) ? t(param, {}) : param;
		}
		return t(text.key, params);
	}

	// What a node says: a left-out node its sentence, anything else its value.
	function nodeText(node: GraphNode): string {
		return node.drop !== null ? dropSentence(node.drop) : write(nodeValueOf(node, locale.value));
	}

	function reportLineText(source: ProvenanceNode): string {
		return write(reportLineValue(source, locale.value));
	}

	// One part of the caption: a left-out node says why it was left out, anything else its text.
	function captionText(segment: CaptionSegment, context: CaptionContext): string {
		const text = captionKeyed(segment, context, locale.value);
		if (text === null) {
			return segment.drop === null ? "" : dropSentence(segment.drop);
		}
		return write(text);
	}

	// The multiplier on a split badge: ×10 when the quantity grew tenfold, ÷4 when it shrank by four.
	function splitBadge(factor: SplitFactor): string {
		const sign = factor.kind === SplitFactorKind.MULTIPLY ? "×" : "÷";
		return `${sign}${ProvenanceFields.formatNumber(String(factor.amount), locale.value)}`;
	}

	// What the popover of a node lists: a broker row's attributes, exactly as in the export, or a
	// report line's values with the numbers written the locale's way. Every other node has none.
	function popoverOf(
		node: GraphNode,
		walker: ProvenanceWalker,
		formName: string,
	): GraphPopoverText | null {
		const source = node.source;
		if (source === null) {
			return null;
		}
		switch (node.kind) {
			case GraphNodeKind.ROW: {
				const file = walker
					.up(source)
					.nodes.find((ancestor) => ancestor.kind === ProvenanceNodeKind.FILE);
				return {
					title: t("download_popover_row_title"),
					rows: Object.entries(source.fields)
						.sort(([first], [second]) => first.localeCompare(second))
						.map(([name, attribute]) => ({ name, value: attribute })),
					foot:
						file === undefined
							? t("download_popover_line_foot", { form: formName })
							: t("download_popover_from_file", { file: file.label }),
				};
			}
			case GraphNodeKind.REPORT_LINE:
				return {
					title: t("download_popover_line_title"),
					rows: Object.values(EDavkiProvenanceField).flatMap((field) => {
						const recorded = source.fields[field];
						if (recorded === undefined) {
							return [];
						}
						return [
							{
								name: t(I18nKeys.edavkiField[field]),
								value: numericFields.includes(field)
									? ProvenanceFields.formatNumber(recorded, locale.value)
									: recorded,
							},
						];
					}),
					foot: t("download_popover_line_foot", { form: formName }),
				};
			default:
				return null;
		}
	}

	return { nodeText, reportLineText, captionText, splitBadge, popoverOf };
}
