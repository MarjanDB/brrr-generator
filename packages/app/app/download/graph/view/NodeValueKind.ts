export enum NodeValueKind {
	// A file name or a broker row's own label: { text }.
	TEXT = "TEXT",
	// { quantity, price, currency }
	TRADE = "TRADE",
	// { amount, currency }
	CASH = "CASH",
	// { quantity, date }
	LOT = "LOT",
	// { before, after }
	SPLIT = "SPLIT",
	REVERSE_SPLIT = "REVERSE_SPLIT",
	// { from, to }
	RENAME = "RENAME",
	// { quantity }
	MATCHED = "MATCHED",
	// { date, amount }
	SUM = "SUM",
	// { quantity, date }
	LINE_BOUGHT = "LINE_BOUGHT",
	LINE_SOLD = "LINE_SOLD",
	// { date, amount }
	LINE_DIVIDEND = "LINE_DIVIDEND",
	// A line with none of the known fields: { text } is the key of the kind's noun.
	LINE_OTHER = "LINE_OTHER",
	// { count, kind }: kind is the key of the members' noun.
	STACK = "STACK",
}
