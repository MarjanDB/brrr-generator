import { ColorIntent } from "~/types/ui";

const intents: ColorIntent[] = [
	ColorIntent.ACTION,
	ColorIntent.ACCENT,
	ColorIntent.SUCCESS,
	ColorIntent.WARNING,
	ColorIntent.DANGER,
	ColorIntent.INFO,
];

// A ticker's colour: a stable hash of it into the intents that read as colours (never NEUTRAL).
export function monogramIntent(ticker: string): ColorIntent {
	let hash = 0;
	for (const character of ticker) {
		hash = (hash * 31 + character.charCodeAt(0)) % 997;
	}
	return intents[hash % intents.length] ?? ColorIntent.ACTION;
}

// The letters in the monogram: a short ticker as it is, a longer one cut to its first three.
export function monogramText(ticker: string): string {
	return ticker.length <= 4 ? ticker : ticker.slice(0, 3);
}
