import { ProvenanceEventKind, ProvenanceField } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import { ProvenanceFields } from "~/utils/provenanceFields";

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

		expect(ProvenanceFields.of(event, ProvenanceField.QUANTITY)).toEqual("10");
		expect(ProvenanceFields.of(event, ProvenanceField.DATE)).toEqual("2024-01-10");
	});

	test("a field the node lacks is null", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });

		const node = b.node(file);

		expect(ProvenanceFields.of(node, ProvenanceField.ISIN)).toBeNull();
	});
});

describe("numbers as a person reads them", () => {
	test("float noise from a rescaled price is rounded away", () => {
		expect(ProvenanceFields.formatNumber("60.00000000000001", "en")).toEqual("60");
	});

	test("the decimals a price really has are kept", () => {
		expect(ProvenanceFields.formatNumber("8.554", "en")).toEqual("8.554");
	});

	test("Slovenian writes a decimal comma", () => {
		expect(ProvenanceFields.formatNumber("8.554", "sl")).toEqual("8,554");
	});

	test("a sold quantity keeps its sign", () => {
		expect(ProvenanceFields.formatNumber("-45", "en")).toEqual("-45");
	});

	test("a value that isn't a number is shown as it was recorded", () => {
		expect(ProvenanceFields.formatNumber("n/a", "en")).toEqual("n/a");
	});
});

describe("a payment's amount", () => {
	test("a dividend recorded without a quantity is one unit of its price", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const tte = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const dividend = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-04-01",
			amount: "20.5",
			currency: "EUR",
			label: "dividend TTE",
		});

		expect(ProvenanceFields.cashAmountOf(b.node(dividend.event))).toEqual("20.5");
	});

	test("a payment recorded with a quantity is its price times the quantity", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const tte = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const tax = b.trade({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.WITHHOLDING_TAX,
			date: "2024-04-01",
			quantity: "2",
			price: "-1.5",
			currency: "EUR",
			label: "tax TTE",
		});

		expect(ProvenanceFields.cashAmountOf(b.node(tax.event))).toEqual("-3");
	});

	test("a node without a price has no amount", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });

		expect(ProvenanceFields.cashAmountOf(b.node(file))).toBeNull();
	});
});
