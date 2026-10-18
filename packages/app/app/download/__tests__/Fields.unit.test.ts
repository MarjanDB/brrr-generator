import { ProvenanceEventKind, ProvenanceField } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { fieldOf } from "~/download/fields";
import { GraphBuilder } from "~/download/graph/__tests__/support/GraphBuilder";

describe("a node's fields", () => {
	test("a field the node has comes back as it was recorded", () => {
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

		const event = b.node(buy.event);

		expect(fieldOf(event, ProvenanceField.QUANTITY)).toEqual("10");
		expect(fieldOf(event, ProvenanceField.DATE)).toEqual("2024-01-10");
	});

	test("a field the node lacks is null", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });

		const node = b.node(file);

		expect(fieldOf(node, ProvenanceField.ISIN)).toBeNull();
	});
});
