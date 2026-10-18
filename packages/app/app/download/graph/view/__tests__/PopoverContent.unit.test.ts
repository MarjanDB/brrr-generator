import {
	EDavkiProvenanceField,
	ProvenanceChange,
	ProvenanceEventKind,
	ProvenanceNodeKind,
	ProvenanceStage,
	ProvenanceWalker,
} from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { PopoverKind } from "~/download/graph/view/PopoverKind";
import { popoverContentOf } from "~/download/graph/view/popoverContentOf";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import { graphModelOf, modelNodeFor } from "~/utils/graphModel";
import { edavkiFieldKeys } from "~/utils/i18nKeys";

describe("what a popover shows", () => {
	test("a broker row shows its attributes by name, with the file it came from", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const row = {};
		b.graph.node(row, ProvenanceNodeKind.ROW, "Trade ACME", { zeta: "1", alpha: "2" });
		b.graph.derive(
			[file],
			row,
			ProvenanceChange.CONTAINS,
			ProvenanceStage.Schema.parse("Test"),
			null,
		);
		const model = graphModelOf(b.graph, b.reading(), false);
		const node = modelNodeFor(model, b.node(row));

		const content = popoverContentOf(node, new ProvenanceWalker(b.graph));

		expect(content?.kind).toEqual(PopoverKind.ROW_ATTRIBUTES);
		expect(content?.title).toBe(node);
		expect(content?.rows).toHaveLength(2);
		expect(content?.rows[0]?.name).toEqual("alpha");
		expect(content?.rows[0]?.value).toEqual("2");
		expect(content?.rows[0]?.nameKey).toEqual(null);
		expect(content?.rows[1]?.name).toEqual("zeta");
		expect(content?.rows[1]?.value).toEqual("1");
		expect(content?.fromFile).toEqual("U1.xml");
	});

	test("a report line shows the values the form gets, named as the form names them", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		const match = b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const model = graphModelOf(b.graph, b.reading(), true);
		const node = modelNodeFor(model, b.node(match.acquiredLine));

		const content = popoverContentOf(node, new ProvenanceWalker(b.graph));

		expect(content?.kind).toEqual(PopoverKind.LINE_VALUES);
		expect(content?.rows).toHaveLength(2);
		expect(content?.rows[0]?.nameKey).toEqual(edavkiFieldKeys[EDavkiProvenanceField.BOUGHT_ON]);
		expect(content?.rows[0]?.value).toEqual("2024-01-10");
		expect(content?.rows[1]?.nameKey).toEqual(edavkiFieldKeys[EDavkiProvenanceField.QUANTITY]);
		expect(content?.rows[1]?.value).toEqual("10");
		expect(content?.fromFile).toEqual(null);
	});

	test("a trade has no popover", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const model = graphModelOf(b.graph, b.reading(), false);

		const content = popoverContentOf(
			modelNodeFor(model, b.node(buy.event)),
			new ProvenanceWalker(b.graph),
		);

		expect(content).toEqual(null);
	});
});
