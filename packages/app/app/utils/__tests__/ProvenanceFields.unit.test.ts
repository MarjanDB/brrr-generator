import { ProvenanceEventKind, ProvenanceField } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import { fieldOf, formatNumber } from "~/utils/provenanceFields";

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

describe("numbers as a person reads them", () => {
	test("float noise from a rescaled price is rounded away", () => {
		expect(formatNumber("60.00000000000001", "en")).toEqual("60");
	});

	test("the decimals a price really has are kept", () => {
		expect(formatNumber("8.554", "en")).toEqual("8.554");
	});

	test("Slovenian writes a decimal comma", () => {
		expect(formatNumber("8.554", "sl")).toEqual("8,554");
	});

	test("a sold quantity keeps its sign", () => {
		expect(formatNumber("-45", "en")).toEqual("-45");
	});

	test("a value that isn't a number is shown as it was recorded", () => {
		expect(formatNumber("n/a", "en")).toEqual("n/a");
	});
});
