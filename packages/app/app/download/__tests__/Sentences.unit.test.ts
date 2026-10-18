import {
	DropReason,
	ProvenanceDetail,
	ProvenanceDetailKind,
	ProvenanceDetailValue,
	ProvenanceNodeKind,
	ProvenanceStage,
	TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { GraphBuilder } from "~/download/graph/__tests__/support/GraphBuilder";
import { dropSentence } from "~/download/sentences/dropSentence";
import type { SentenceFormat, Translate } from "~/download/sentences/Translate";
import { warningSentence } from "~/download/sentences/warningSentence";

const stage = ProvenanceStage.Schema.parse("Test");

// Wiring, not data: it prints the key and the params it was given, so a sentence can be compared.
const translate: Translate = (key, params) =>
	`${key}|${Object.entries(params)
		.map(([name, value]) => `${name}=${value}`)
		.join(",")}`;
const format: SentenceFormat = {
	date: (iso) => `<${iso}>`,
	method: (method) => `[${method}]`,
};

describe("the sentence about something the report left out", () => {
	test("a drop with a detail says what the detail says, with its values", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		b.graph.drop(
			file,
			DropReason.OUTSIDE_PERIOD,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.CLOSED_OUTSIDE_PERIOD,
				values: { [ProvenanceDetailValue.DATE]: "2022-03-10" },
			}),
		);
		const [drop] = b.graph.drops();
		assert(drop !== undefined);

		const sentence = dropSentence(drop, translate, format);

		expect(sentence).toEqual("download_detail_closed_outside_period|date=<2022-03-10>");
	});

	test("a drop with no detail says its reason", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		b.graph.drop(file, DropReason.POSITION_OPEN, stage, null);
		const [drop] = b.graph.drops();
		assert(drop !== undefined);

		const sentence = dropSentence(drop, translate, format);

		expect(sentence).toEqual("download_drop_position_open|");
	});

	test("a detail whose value was not recorded passes no param for it", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		b.graph.drop(
			file,
			DropReason.OUTSIDE_PERIOD,
			stage,
			new ProvenanceDetail({ kind: ProvenanceDetailKind.PAID_OUTSIDE_PERIOD, values: {} }),
		);
		const [drop] = b.graph.drops();
		assert(drop !== undefined);

		const sentence = dropSentence(drop, translate, format);

		expect(sentence).toEqual("download_detail_paid_outside_period|");
	});

	test("a lot-matching detail names the method", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		b.graph.drop(
			file,
			DropReason.NOT_USED,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.LOT_MATCHING_IGNORES_BROKER_LOTS,
				values: { [ProvenanceDetailValue.LOT_MATCHING_METHOD]: TaxAuthorityLotMatchingMethod.FIFO },
			}),
		);
		const [drop] = b.graph.drops();
		assert(drop !== undefined);

		const sentence = dropSentence(drop, translate, format);

		expect(sentence).toEqual("download_detail_lot_matching_ignores_broker_lots|method=[FIFO]");
	});

	test("a detail with no values has no params", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		b.graph.drop(
			file,
			DropReason.NOT_USED,
			stage,
			new ProvenanceDetail({ kind: ProvenanceDetailKind.FORM_IGNORES_BROKER_LOTS, values: {} }),
		);
		const [drop] = b.graph.drops();
		assert(drop !== undefined);

		const sentence = dropSentence(drop, translate, format);

		expect(sentence).toEqual("download_detail_form_ignores_broker_lots|");
	});

	test("a file error keeps the parser's message verbatim", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		b.graph.drop(
			file,
			DropReason.UNREADABLE,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.FILE_ERROR,
				values: { [ProvenanceDetailValue.ERROR]: 'Unexpected "type" at 3' },
			}),
		);
		const [drop] = b.graph.drops();
		assert(drop !== undefined);

		const sentence = dropSentence(drop, translate, format);

		expect(sentence).toEqual('download_detail_file_error|error=Unexpected "type" at 3');
	});

	test("an asset class that is not supported names the asset class", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		b.graph.drop(
			file,
			DropReason.NOT_SUPPORTED,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.ASSET_CLASS_NOT_SUPPORTED,
				values: { [ProvenanceDetailValue.ASSET_CLASS]: "BOND" },
			}),
		);
		const [drop] = b.graph.drops();
		assert(drop !== undefined);

		const sentence = dropSentence(drop, translate, format);

		expect(sentence).toEqual("download_detail_asset_class_not_supported|assetClass=BOND");
	});
});

describe("the sentence about a warning", () => {
	test("a warning says what its detail says, with the values in the order they were recorded", () => {
		const b = new GraphBuilder();
		const node = {};
		b.graph.node(node, ProvenanceNodeKind.REPORT_LINE, "line", {});
		b.graph.warn(
			node,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.COMPANY_LOOKUP_FAILED,
				values: {
					[ProvenanceDetailValue.ISIN]: "US1",
					[ProvenanceDetailValue.ERROR]: "offline",
				},
			}),
		);
		const [warning] = b.graph.warnings();
		assert(warning !== undefined);

		const sentence = warningSentence(warning, translate, format);

		expect(sentence).toEqual("download_detail_company_lookup_failed|isin=US1,error=offline");
	});

	test("a company that was not found names its ISIN", () => {
		const b = new GraphBuilder();
		const node = {};
		b.graph.node(node, ProvenanceNodeKind.REPORT_LINE, "line", {});
		b.graph.warn(
			node,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.COMPANY_NOT_FOUND,
				values: { [ProvenanceDetailValue.ISIN]: "US1" },
			}),
		);
		const [warning] = b.graph.warnings();
		assert(warning !== undefined);

		const sentence = warningSentence(warning, translate, format);

		expect(sentence).toEqual("download_detail_company_not_found|isin=US1");
	});
});
