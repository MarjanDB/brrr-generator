export enum ColorIntent {
	ACTION = "action",
	ACCENT = "accent",
	NEUTRAL = "neutral",
	SUCCESS = "success",
	WARNING = "warning",
	DANGER = "danger",
	INFO = "info",
}

export enum BadgeVariant {
	SOLID = "solid",
	SOFT = "soft",
}

export enum DialogSize {
	// A reading width, for text and steps.
	MEDIUM = "medium",
	// The page's width less a margin, for tables and charts.
	FULL = "full",
}

// A button's family. One primary per place (the step's next move, the form's download); the others
// secondary; quiet for a toggle, an icon or a small action inside a card.
export enum ButtonVariant {
	PRIMARY = "primary",
	SECONDARY = "secondary",
	QUIET = "quiet",
}

// A control's size: md (40 px) for forms and a step's main actions, sm (32 px) inside a card, a
// popover or a table, icon (32 px square) for a button that shows only an icon.
export enum ControlSize {
	MD = "md",
	SM = "sm",
	ICON = "icon",
}
