import { IdentifierChangeType } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { formatNumber } from "~/download/labels/formatNumber";
import { splitRatioOf } from "~/download/labels/instrumentLabels";
import { SplitChip } from "~/download/labels/SplitChip";

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

describe("a split chip's ratio", () => {
	test("a split of 4 shares into 40 reads 10 : 1", () => {
		const chip = new SplitChip({
			kind: IdentifierChangeType.SPLIT,
			before: "4",
			after: "40",
			fromIsin: "US86800U1043",
			fromTicker: "SMCI.OLD",
		});

		const ratio = splitRatioOf(chip, "en");

		expect(ratio?.before).toEqual("10");
		expect(ratio?.after).toEqual("1");
	});

	test("a reverse split of 10 shares into 1 reads 1 : 10", () => {
		const chip = new SplitChip({
			kind: IdentifierChangeType.REVERSE_SPLIT,
			before: "10",
			after: "1",
			fromIsin: "US0000000001",
			fromTicker: "ACME.OLD",
		});

		const ratio = splitRatioOf(chip, "en");

		expect(ratio?.before).toEqual("1");
		expect(ratio?.after).toEqual("10");
	});

	test("a rename has no ratio", () => {
		const chip = new SplitChip({
			kind: IdentifierChangeType.RENAME,
			before: null,
			after: null,
			fromIsin: "US0000000001",
			fromTicker: "OLD",
		});

		expect(splitRatioOf(chip, "en")).toBeNull();
	});
});
