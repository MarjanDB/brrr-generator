import type { ProvenanceField, ProvenanceNode } from "@brrr/lib";

// A fact a stage recorded on a node, or null when that node has none of it.
export function fieldOf(node: ProvenanceNode, field: ProvenanceField): string | null {
	return node.fields[field] ?? null;
}

// A number field holds String(value) of a float, so a rescaled price can read 60.00000000000001.
// Shown in the locale's format, rounded to six decimals; anything else is shown unchanged.
export function formatNumber(value: string, locale: string): string {
	const number = Number(value);
	if (value.trim() === "" || !Number.isFinite(number)) {
		return value;
	}
	return new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(number);
}
