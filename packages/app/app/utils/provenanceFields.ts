import { ProvenanceField, type ProvenanceNode } from "@brrr/lib";

// A fact a stage recorded on a node, or null when that node has none of it.
function fieldOf(node: ProvenanceNode, field: ProvenanceField): string | null {
	return node.fields[field] ?? null;
}

// A number field holds String(value) of a float, so a rescaled price can read 60.00000000000001.
// Shown in the locale's format, rounded to six decimals; anything else is shown unchanged.
function formatNumber(value: string, locale: string): string {
	const number = Number(value);
	if (value.trim() === "" || !Number.isFinite(number)) {
		return value;
	}
	return new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(number);
}

// A cash transaction is one unit of its amount, unless it was recorded with a quantity: its price
// times that quantity, or null when it has no price.
function cashAmountOf(node: ProvenanceNode): string | null {
	const price = fieldOf(node, ProvenanceField.PRICE);
	if (price === null) {
		return null;
	}
	return String(Number(price) * Number(fieldOf(node, ProvenanceField.QUANTITY) ?? "1"));
}

// The facts a stage recorded on a node, as the site reads and shows them.
export const ProvenanceFields = {
	of: fieldOf,
	formatNumber,
	cashAmountOf,
};
