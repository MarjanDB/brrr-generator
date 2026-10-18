import {
	DropReason,
	IdentifierChangeType,
	ProvenanceDetail,
	ProvenanceDetailKind,
	ProvenanceDetailValue,
	ProvenanceNodeKind,
	ProvenanceStage,
	TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { mountComposable } from "~/composables/__tests__/support/mountComposable";
import { useProvenanceText } from "~/composables/useProvenanceText";
import { GraphBuilder } from "~/download/graph/__tests__/support/GraphBuilder";
import type { SplitChip } from "~/types/instrumentPanel";

const stage = ProvenanceStage.Schema.parse("Test");

// The text composable and the i18n locale it reads, so a test can switch the language. The app is
// shared between tests, so each starts in English.
async function mountText() {
	const mounted = await mountComposable(() => ({ text: useProvenanceText(), i18n: useI18n() }));
	await mounted.i18n.setLocale("en");
	return mounted;
}

describe("the sentence about something the report left out", () => {
	test("a drop with a detail says what the detail says, with its values", async () => {
		const { text } = await mountText();
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

		const sentence = text.dropSentence(drop);

		expect(sentence).toEqual("Closed on Mar 10, 2022, outside the reporting period.");
	});

	test("a drop with no detail says its reason", async () => {
		const { text } = await mountText();
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		b.graph.drop(file, DropReason.POSITION_OPEN, stage, null);
		const [drop] = b.graph.drops();
		assert(drop !== undefined);

		const sentence = text.dropSentence(drop);

		expect(sentence).toEqual("The position is still open.");
	});

	test("a detail whose value was not recorded passes no param for it", async () => {
		const { text } = await mountText();
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

		const sentence = text.dropSentence(drop);

		expect(sentence).toEqual("Paid on , outside the reporting period.");
	});

	test("a lot-matching detail names the method", async () => {
		const { text } = await mountText();
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

		const sentence = text.dropSentence(drop);

		expect(sentence).toEqual("Not used: FIFO lot matching ignores the broker's lots.");
	});

	test("a detail with no values has no params", async () => {
		const { text } = await mountText();
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

		const sentence = text.dropSentence(drop);

		expect(sentence).toEqual(
			"Not used: this form matches derivative trades without the broker's lots.",
		);
	});

	test("a file error keeps the parser's message verbatim", async () => {
		const { text } = await mountText();
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

		const sentence = text.dropSentence(drop);

		expect(sentence).toEqual('This file could not be read: Unexpected "type" at 3');
	});

	test("an asset class that is not supported names the asset class", async () => {
		const { text } = await mountText();
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

		const sentence = text.dropSentence(drop);

		expect(sentence).toEqual("Asset class BOND is not supported yet.");
	});

	test("the sentence is written in the language the reader switched to", async () => {
		const { text, i18n } = await mountText();
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
		await i18n.setLocale("sl");

		const sentence = text.dropSentence(drop);

		expect(sentence).toEqual("Vrsta sredstva BOND še ni podprta.");
	});
});

describe("the sentence about a warning", () => {
	test("a warning says what its detail says, with the values in the order they were recorded", async () => {
		const { text } = await mountText();
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

		const sentence = text.warningSentence(warning);

		expect(sentence).toEqual("Looking up US1 failed: offline");
	});

	test("a company that was not found names its ISIN", async () => {
		const { text } = await mountText();
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

		const sentence = text.warningSentence(warning);

		expect(sentence).toEqual("No company was found for US1; fill in the payer by hand.");
	});
});

describe("a split chip's ratio", () => {
	test("a split of 4 shares into 40 reads 10 : 1", async () => {
		const { text } = await mountText();
		const chip: SplitChip = {
			kind: IdentifierChangeType.SPLIT,
			before: "4",
			after: "40",
			fromIsin: "US86800U1043",
			fromTicker: "SMCI.OLD",
		};

		const ratio = text.splitRatio(chip);

		expect(ratio?.before).toEqual("10");
		expect(ratio?.after).toEqual("1");
	});

	test("a reverse split of 10 shares into 1 reads 1 : 10", async () => {
		const { text } = await mountText();
		const chip: SplitChip = {
			kind: IdentifierChangeType.REVERSE_SPLIT,
			before: "10",
			after: "1",
			fromIsin: "US0000000001",
			fromTicker: "ACME.OLD",
		};

		const ratio = text.splitRatio(chip);

		expect(ratio?.before).toEqual("1");
		expect(ratio?.after).toEqual("10");
	});

	test("a rename has no ratio", async () => {
		const { text } = await mountText();
		const chip: SplitChip = {
			kind: IdentifierChangeType.RENAME,
			before: null,
			after: null,
			fromIsin: "US0000000001",
			fromTicker: "OLD",
		};

		expect(text.splitRatio(chip)).toBeNull();
	});

	test("the numbers of the ratio follow the language", async () => {
		const { text, i18n } = await mountText();
		const chip: SplitChip = {
			kind: IdentifierChangeType.SPLIT,
			before: "2",
			after: "5",
			fromIsin: "US0000000001",
			fromTicker: "ACME.OLD",
		};
		await i18n.setLocale("sl");

		const ratio = text.splitRatio(chip);

		expect(ratio?.before).toEqual("2,5");
		expect(ratio?.after).toEqual("1");
	});
});
