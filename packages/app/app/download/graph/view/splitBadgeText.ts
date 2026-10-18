import { type SplitFactor, SplitFactorKind } from "~/download/graph/SplitFactor";
import { formatNumber } from "~/utils/provenanceFields";

// The multiplier on a split badge: ×10 when the quantity grew tenfold, ÷4 when it shrank by four.
export function splitBadgeText(factor: SplitFactor, locale: string): string {
	const sign = factor.kind === SplitFactorKind.MULTIPLY ? "×" : "÷";
	return `${sign}${formatNumber(String(factor.amount), locale)}`;
}
