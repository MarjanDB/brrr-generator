import { describe, expect, test } from "vitest";
import { SplitFactor, SplitFactorKind } from "~/download/graph/SplitFactor";
import { splitBadgeText } from "~/download/graph/view/splitBadgeText";

describe("the text on a split badge", () => {
	test("a split that multiplies says ×10", () => {
		const factor = new SplitFactor({ kind: SplitFactorKind.MULTIPLY, amount: 10 });

		expect(splitBadgeText(factor, "en")).toEqual("×10");
	});

	test("a reverse split says ÷4", () => {
		const factor = new SplitFactor({ kind: SplitFactorKind.DIVIDE, amount: 4 });

		expect(splitBadgeText(factor, "en")).toEqual("÷4");
	});

	test("a fractional factor uses the English decimal point", () => {
		const factor = new SplitFactor({ kind: SplitFactorKind.MULTIPLY, amount: 1.5 });

		expect(splitBadgeText(factor, "en")).toEqual("×1.5");
	});

	test("a fractional factor uses the Slovenian decimal comma", () => {
		const factor = new SplitFactor({ kind: SplitFactorKind.MULTIPLY, amount: 1.5 });

		expect(splitBadgeText(factor, "sl")).toEqual("×1,5");
	});
});
