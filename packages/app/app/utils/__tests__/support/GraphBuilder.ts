import {
	EDavkiProvenanceField,
	type OptionRight,
	ProvenanceChange,
	type ProvenanceEventKind,
	ProvenanceField,
	ProvenanceGraph,
	ProvenanceLegSide,
	type ProvenanceNode,
	ProvenanceNodeKind,
	ProvenanceReportReader,
	ProvenanceStage,
	type ReportProvenance,
} from "@brrr/lib";

export type BuiltTrade = { row: object; record: object; staged: object; event: object };
export type BuiltMatch = {
	lot: object;
	acquiredLeg: object;
	soldLeg: object;
	acquiredLine: object;
	soldLine: object;
};
export type BuiltClosedMatch = { lot: object; acquiredLeg: object; soldLeg: object };

export type TradeArgs = {
	file: object;
	instrument: object;
	kind: ProvenanceEventKind;
	date: string;
	quantity: string;
	price: string;
	currency: string;
	label: string;
};

export type DividendArgs = {
	file: object;
	instrument: object;
	kind: ProvenanceEventKind;
	date: string;
	amount: string;
	currency: string;
	label: string;
};

export type MatchArgs = {
	instrument: object;
	acquired: BuiltTrade;
	sold: BuiltTrade;
	quantity: string;
};

// Builds provenance graphs with the shapes the stages record, so the layout can be tested without
// running the pipeline. Every value is passed in; the builder invents none (the labels are made of
// what it is given). The subjects it returns are the keys ProvenanceGraph uses.
export class GraphBuilder {
	public readonly graph = new ProvenanceGraph({ parent: null });
	private readonly stage = ProvenanceStage.Schema.parse("Test");

	public file(args: { name: string }): object {
		const file = {};
		this.graph.node(file, ProvenanceNodeKind.FILE, args.name, {});
		return file;
	}

	public instrument(args: { ticker: string; isin: string }): object {
		const instrument = {};
		this.graph.node(
			instrument,
			ProvenanceNodeKind.GROUPING,
			`grouping ${args.isin} · ${args.ticker}`,
			{ [ProvenanceField.ISIN]: args.isin, [ProvenanceField.TICKER]: args.ticker },
		);
		return instrument;
	}

	// A derivative grouping the way the core records it: the OCC symbol as its ticker, the contract
	// terms as fields, and no ISIN.
	public optionContract(args: {
		occSymbol: string;
		underlyingSymbol: string;
		expiry: string;
		strike: string;
		right: OptionRight;
	}): object {
		const contract = {};
		this.graph.node(contract, ProvenanceNodeKind.GROUPING, `grouping ${args.occSymbol}`, {
			[ProvenanceField.TICKER]: args.occSymbol,
			[ProvenanceField.UNDERLYING_SYMBOL]: args.underlyingSymbol,
			[ProvenanceField.EXPIRY]: args.expiry,
			[ProvenanceField.STRIKE]: args.strike,
			[ProvenanceField.OPTION_RIGHT]: args.right,
		});
		return contract;
	}

	// file -CONTAINS-> ROW -PARSED-> RECORD -TRANSFORMED-> STAGING_EVENT -CONVERTED-> EVENT -GROUPED-> instrument
	public trade(args: TradeArgs): BuiltTrade {
		return this.chain({
			file: args.file,
			instrument: args.instrument,
			label: args.label,
			fields: {
				[ProvenanceField.EVENT_KIND]: args.kind,
				[ProvenanceField.DATE]: args.date,
				[ProvenanceField.QUANTITY]: args.quantity,
				[ProvenanceField.PRICE]: args.price,
				[ProvenanceField.CURRENCY]: args.currency,
			},
		});
	}

	public dividend(args: DividendArgs): BuiltTrade {
		return this.chain({
			file: args.file,
			instrument: args.instrument,
			label: args.label,
			fields: {
				[ProvenanceField.EVENT_KIND]: args.kind,
				[ProvenanceField.DATE]: args.date,
				[ProvenanceField.PRICE]: args.amount,
				[ProvenanceField.CURRENCY]: args.currency,
			},
		});
	}

	// [acquired, sold] -MATCHED-> MATCHED_LOT -MATCHED-> two LEGs -(with the instrument) REPORTED-> two REPORT_LINEs.
	// The legs are derived sold first on purpose: the side is read from LEG_SIDE, never from the order.
	// `boughtLine` and `soldLine` are more of the lines' fields (the form's prices), when a test needs them.
	public match(
		args: MatchArgs & {
			boughtOn: string;
			soldOn: string;
			boughtLine?: Record<string, string>;
			soldLine?: Record<string, string>;
		},
	): BuiltMatch {
		const closed = this.matchClosed(args);
		const acquiredLine = {};
		const soldLine = {};
		this.graph.node(
			acquiredLine,
			ProvenanceNodeKind.REPORT_LINE,
			`bought ${args.boughtOn} · ${args.quantity}`,
			{
				[EDavkiProvenanceField.BOUGHT_ON]: args.boughtOn,
				[EDavkiProvenanceField.QUANTITY]: args.quantity,
				...args.boughtLine,
			},
		);
		this.graph.node(
			soldLine,
			ProvenanceNodeKind.REPORT_LINE,
			`sold ${args.soldOn} · -${args.quantity}`,
			{
				[EDavkiProvenanceField.SOLD_ON]: args.soldOn,
				[EDavkiProvenanceField.QUANTITY]: `-${args.quantity}`,
				...args.soldLine,
			},
		);
		this.graph.derive(
			[closed.soldLeg, args.instrument],
			soldLine,
			ProvenanceChange.REPORTED,
			this.stage,
			null,
		);
		this.graph.derive(
			[closed.acquiredLeg, args.instrument],
			acquiredLine,
			ProvenanceChange.REPORTED,
			this.stage,
			null,
		);
		return { ...closed, acquiredLine, soldLine };
	}

	// A matched lot whose legs became no report lines (they are dropped by the test, if at all).
	public matchClosed(args: MatchArgs): BuiltClosedMatch {
		const lot = {};
		const soldLeg = {};
		const acquiredLeg = {};
		this.graph.node(lot, ProvenanceNodeKind.MATCHED_LOT, `matched lot ${args.quantity}`, {
			[ProvenanceField.QUANTITY]: args.quantity,
		});
		this.graph.derive(
			[args.acquired.event, args.sold.event],
			lot,
			ProvenanceChange.MATCHED,
			this.stage,
			null,
		);
		this.graph.node(soldLeg, ProvenanceNodeKind.LEG, `leg -${args.quantity}`, {
			[ProvenanceField.LEG_SIDE]: ProvenanceLegSide.SOLD,
			[ProvenanceField.QUANTITY]: `-${args.quantity}`,
		});
		this.graph.node(acquiredLeg, ProvenanceNodeKind.LEG, `leg ${args.quantity}`, {
			[ProvenanceField.LEG_SIDE]: ProvenanceLegSide.ACQUIRED,
			[ProvenanceField.QUANTITY]: args.quantity,
		});
		this.graph.derive([lot], soldLeg, ProvenanceChange.MATCHED, this.stage, null);
		this.graph.derive([lot], acquiredLeg, ProvenanceChange.MATCHED, this.stage, null);
		return { lot, acquiredLeg, soldLeg };
	}

	// CORPORATE_ACTION and a rebuilt EVENT (the old fields, the quantity scaled), with the old trade
	// and the action each -SPLIT-> the rebuilt one.
	public split(args: {
		trade: BuiltTrade;
		instrument: object;
		before: string;
		after: string;
		date: string;
	}): { action: object; rebuilt: object } {
		const action = {};
		const rebuilt = {};
		const detail = `${args.before} → ${args.after}`;
		const old = this.node(args.trade.event);
		this.graph.node(action, ProvenanceNodeKind.CORPORATE_ACTION, `split ${detail}`, {
			[ProvenanceField.CORPORATE_ACTION_KIND]: "SPLIT",
			[ProvenanceField.SPLIT_BEFORE]: args.before,
			[ProvenanceField.SPLIT_AFTER]: args.after,
			[ProvenanceField.DATE]: args.date,
		});
		this.graph.node(rebuilt, ProvenanceNodeKind.EVENT, `${old.label} after split`, {
			...old.fields,
			[ProvenanceField.QUANTITY]: String(
				(Number(old.fields[ProvenanceField.QUANTITY]) * Number(args.after)) / Number(args.before),
			),
		});
		this.graph.derive([args.trade.event], rebuilt, ProvenanceChange.SPLIT, this.stage, detail);
		this.graph.derive([action], rebuilt, ProvenanceChange.SPLIT, this.stage, detail);
		this.graph.derive([rebuilt], args.instrument, ProvenanceChange.GROUPED, this.stage, null);
		return { action, rebuilt };
	}

	// events -SUMMED-> action SUM -MERGED-> day SUM -REPORTED-> REPORT_LINE
	public sumInto(args: { instrument: object; events: BuiltTrade[]; dateReceived: string }): {
		actionSum: object;
		daySum: object;
		line: object;
	} {
		const actionSum = {};
		const daySum = {};
		const line = {};
		this.graph.node(actionSum, ProvenanceNodeKind.SUM, `action sum ${args.dateReceived}`, {});
		this.graph.node(daySum, ProvenanceNodeKind.SUM, `day sum ${args.dateReceived}`, {});
		this.graph.node(line, ProvenanceNodeKind.REPORT_LINE, `received ${args.dateReceived}`, {
			[EDavkiProvenanceField.DATE_RECEIVED]: args.dateReceived,
		});
		this.graph.derive(
			args.events.map((built) => built.event),
			actionSum,
			ProvenanceChange.SUMMED,
			this.stage,
			null,
		);
		this.graph.derive([actionSum], daySum, ProvenanceChange.MERGED, this.stage, null);
		this.graph.derive([daySum], line, ProvenanceChange.REPORTED, this.stage, null);
		return { actionSum, daySum, line };
	}

	public node(subject: object): ProvenanceNode {
		return this.graph.nodeOf(subject);
	}

	public reading(): ReportProvenance {
		return new ProvenanceReportReader().read(this.graph);
	}

	private chain(args: {
		file: object;
		instrument: object;
		label: string;
		fields: Record<string, string>;
	}): BuiltTrade {
		const row = {};
		const record = {};
		const staged = {};
		const event = {};
		this.graph.node(row, ProvenanceNodeKind.ROW, args.label, {});
		this.graph.node(record, ProvenanceNodeKind.RECORD, args.label, {});
		this.graph.node(staged, ProvenanceNodeKind.STAGING_EVENT, args.label, {});
		this.graph.node(event, ProvenanceNodeKind.EVENT, args.label, args.fields);
		this.link([args.file], row, ProvenanceChange.CONTAINS);
		this.link([row], record, ProvenanceChange.PARSED);
		this.link([record], staged, ProvenanceChange.TRANSFORMED);
		this.link([staged], event, ProvenanceChange.CONVERTED);
		this.link([event], args.instrument, ProvenanceChange.GROUPED);
		return { row, record, staged, event };
	}

	private link(from: object[], to: object, change: ProvenanceChange): void {
		this.graph.derive(from, to, change, this.stage, null);
	}
}
