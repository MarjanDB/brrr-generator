// What a count counts, so its text can say "1 share", "2 items need a look" in the plural form the
// locale asks for.
export enum CountNoun {
	SHARE = "SHARE",
	CONTRACT = "CONTRACT",
	// The report's summary: its lines, and what the import has that isn't on it.
	FORM_LINE = "FORM_LINE",
	ITEM_NOT_ON_FORM = "ITEM_NOT_ON_FORM",
	// Problems, on the buttons that open them.
	ITEM_NEEDS_A_LOOK = "ITEM_NEEDS_A_LOOK",
	WARNING = "WARNING",
	ITEM_LEFT_OUT = "ITEM_LEFT_OUT",
}

// The plural forms the locales' words take (Intl.PluralRules' categories): English has one and
// other, Slovenian also two and few.
export enum PluralForm {
	ONE = "one",
	TWO = "two",
	FEW = "few",
	OTHER = "other",
}
