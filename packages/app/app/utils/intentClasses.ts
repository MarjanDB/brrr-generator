import { ColorIntent } from "~/types/ui";

// The classes each intent is drawn with. UnoCSS only sees class strings written out in full, so each
// one is a literal here, and callers look them up instead of building `bg-${intent}`.

// A tinted background with the intent's text: badges, monograms, icon tiles, callouts.
const softIntentClasses: Record<ColorIntent, string> = {
	[ColorIntent.ACTION]: "bg-action-soft text-action-ink",
	[ColorIntent.ACCENT]: "bg-accent-soft text-accent-ink",
	[ColorIntent.NEUTRAL]: "bg-neutral-soft text-neutral-ink",
	[ColorIntent.SUCCESS]: "bg-success-soft text-success-ink",
	[ColorIntent.WARNING]: "bg-warning-soft text-warning-ink",
	[ColorIntent.DANGER]: "bg-danger-soft text-danger-ink",
	[ColorIntent.INFO]: "bg-info-soft text-info-ink",
};

// The intent's fill with the text that sits on it.
const solidIntentClasses: Record<ColorIntent, string> = {
	[ColorIntent.ACTION]: "bg-action text-action-on",
	[ColorIntent.ACCENT]: "bg-accent text-accent-on",
	[ColorIntent.NEUTRAL]: "bg-neutral text-neutral-on",
	[ColorIntent.SUCCESS]: "bg-success text-success-on",
	[ColorIntent.WARNING]: "bg-warning text-warning-on",
	[ColorIntent.DANGER]: "bg-danger text-danger-on",
	[ColorIntent.INFO]: "bg-info text-info-on",
};

// The intent's border, for an outlined shape.
const edgeIntentClasses: Record<ColorIntent, string> = {
	[ColorIntent.ACTION]: "border-action-edge",
	[ColorIntent.ACCENT]: "border-accent-edge",
	[ColorIntent.NEUTRAL]: "border-neutral-edge",
	[ColorIntent.SUCCESS]: "border-success-edge",
	[ColorIntent.WARNING]: "border-warning-edge",
	[ColorIntent.DANGER]: "border-danger-edge",
	[ColorIntent.INFO]: "border-info-edge",
};

// The classes each intent is drawn with.
export const IntentClasses = {
	soft: softIntentClasses,
	solid: solidIntentClasses,
	edge: edgeIntentClasses,
};
