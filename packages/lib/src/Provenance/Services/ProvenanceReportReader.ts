import { DropCategory } from "@brrr/Provenance/Models/DropCategory";
import { ProvenanceChange } from "@brrr/Provenance/Models/ProvenanceChange";
import type { ProvenanceDrop } from "@brrr/Provenance/Models/ProvenanceDrop";
import { ProvenanceEventKind } from "@brrr/Provenance/Models/ProvenanceEventKind";
import { ProvenanceField } from "@brrr/Provenance/Models/ProvenanceField";
import { ProvenanceUnderlyingSymbol } from "@brrr/Provenance/Models/ProvenanceIdentifiers";
import { ProvenanceLegSide } from "@brrr/Provenance/Models/ProvenanceLegSide";
import type { ProvenanceNode } from "@brrr/Provenance/Models/ProvenanceNode";
import { ProvenanceNodeKind } from "@brrr/Provenance/Models/ProvenanceNodeKind";
import type { ProvenanceWarning } from "@brrr/Provenance/Models/ProvenanceWarning";
import { ReportInstrument } from "@brrr/Provenance/Models/ReportInstrument";
import { ReportInstrumentKind } from "@brrr/Provenance/Models/ReportInstrumentKind";
import { ReportItem } from "@brrr/Provenance/Models/ReportItem";
import { ReportLeftOut } from "@brrr/Provenance/Models/ReportLeftOut";
import { ReportMatchedLot } from "@brrr/Provenance/Models/ReportMatchedLot";
import { ReportMatchedLotSide } from "@brrr/Provenance/Models/ReportMatchedLotSide";
import { ReportProvenance } from "@brrr/Provenance/Models/ReportProvenance";
import { ReportTotals } from "@brrr/Provenance/Models/ReportTotals";
import { ReportUnderlying } from "@brrr/Provenance/Models/ReportUnderlying";
import type { ProvenanceGraph } from "@brrr/Provenance/Services/ProvenanceGraph";
import { ProvenanceWalker } from "@brrr/Provenance/Services/ProvenanceWalker";
import { dropCategoryOf } from "@brrr/Provenance/Utils/DropCategoryOf";

const cashEventKinds: string[] = [
	ProvenanceEventKind.DIVIDEND,
	ProvenanceEventKind.PAYMENT_IN_LIEU,
	ProvenanceEventKind.WITHHOLDING_TAX,
	ProvenanceEventKind.WITHHOLDING_TAX_ON_PAYMENT_IN_LIEU,
];

// Reads a report's provenance graph (its nodes, edges, drops, warnings and fields, never a tax
// model) into what the download step lists: instruments with their events, broker lots, matched
// lots, report lines, corporate actions and what was left out. Nothing in lib calls it.
export class ProvenanceReportReader {
	public read(graph: ProvenanceGraph): ReportProvenance {
		const flow = new ProvenanceWalker(graph, [ProvenanceChange.GROUPED]);
		const all = new ProvenanceWalker(graph);
		const warnings = graph.warnings();
		const nodes = graph.nodes();

		const instruments = nodes
			.filter((node) => this.isCurrentGrouping(node, all))
			.map((grouping) => this.instrumentOf(grouping, flow, all, warnings))
			.filter((instrument): instrument is ReportInstrument => instrument !== null);

		const withLines = instruments.filter((instrument) => instrument.lines.length > 0);
		const withoutLines = instruments.filter((instrument) => instrument.lines.length === 0);
		const options = withLines.filter(
			(instrument) => instrument.kind === ReportInstrumentKind.OPTION_CONTRACT,
		);

		const allDrops = graph.drops();
		const leftOutOf = (drop: ProvenanceDrop): ReportLeftOut => this.leftOutOf(drop, flow);
		const needsALook = allDrops
			.map(leftOutOf)
			.filter((leftOut) => leftOut.category === DropCategory.NEEDS_A_LOOK);
		const notInReport = allDrops
			.map(leftOutOf)
			.filter((leftOut) => leftOut.category === DropCategory.NOT_IN_THIS_REPORT);

		return new ReportProvenance({
			stocks: this.sortByTicker(
				withLines.filter((instrument) => instrument.kind === ReportInstrumentKind.STOCK),
			),
			optionUnderlyings: this.underlyingsOf(options),
			dividendPayers: this.sortByTicker(
				withLines.filter((instrument) => instrument.kind === ReportInstrumentKind.DIVIDEND_PAYER),
			),
			withoutLines: [
				...this.sortByTicker(
					withoutLines.filter(
						(instrument) => instrument.kind !== ReportInstrumentKind.OPTION_CONTRACT,
					),
				),
				...this.sortContracts(
					withoutLines.filter(
						(instrument) => instrument.kind === ReportInstrumentKind.OPTION_CONTRACT,
					),
				),
			],
			needsALook,
			totals: new ReportTotals({
				lines: nodes.filter((node) => node.kind === ProvenanceNodeKind.REPORT_LINE).length,
				notInReport: new Set(notInReport.map((leftOut) => leftOut.subject)).size,
				needsALook: new Set(needsALook.map((leftOut) => leftOut.subject)).size,
				warnings: warnings.length,
			}),
		});
	}

	// A grouping that no other grouping was rebuilt from is the current one.
	private isCurrentGrouping(node: ProvenanceNode, all: ProvenanceWalker): boolean {
		if (node.kind !== ProvenanceNodeKind.GROUPING) {
			return false;
		}
		return !all.children(node).some((edge) => edge.to.kind === ProvenanceNodeKind.GROUPING);
	}

	private instrumentOf(
		grouping: ProvenanceNode,
		flow: ProvenanceWalker,
		all: ProvenanceWalker,
		warnings: ProvenanceWarning[],
	): ReportInstrument | null {
		const members = this.distinct(
			all
				.parents(grouping)
				.filter((edge) => edge.change === ProvenanceChange.GROUPED)
				.map((edge) => edge.from)
				.filter(
					(node) => node.kind === ProvenanceNodeKind.EVENT || node.kind === ProvenanceNodeKind.LOT,
				),
		).filter((member) => this.isInPlay(member, flow));
		if (members.length === 0) {
			return null;
		}

		const events = this.sortedBy(
			members.filter((member) => member.kind === ProvenanceNodeKind.EVENT),
			ProvenanceField.DATE,
		);
		const brokerLots = this.sortedBy(
			members.filter((member) => member.kind === ProvenanceNodeKind.LOT),
			ProvenanceField.ACQUIRED_DATE,
		);
		const matchedLots = this.distinct(
			events.flatMap((event) =>
				flow
					.children(event)
					.map((edge) => edge.to)
					.filter((node) => node.kind === ProvenanceNodeKind.MATCHED_LOT),
			),
		).map((matched) => this.matchedLotOf(matched, flow));
		const lines = this.distinct(
			members.flatMap((member) =>
				flow.down(member).nodes.filter((node) => node.kind === ProvenanceNodeKind.REPORT_LINE),
			),
		);

		const eventItems = events.map((event) => this.itemOf(event, flow));
		const lotItems = brokerLots.map((lot) => this.itemOf(lot, flow));
		const notInReport = new Set(
			[
				...eventItems.flatMap((item) => item.leftOut),
				...lotItems.flatMap((item) => item.leftOut),
				...matchedLots.flatMap((matched) => [...matched.acquired.leftOut, ...matched.sold.leftOut]),
			]
				.filter((leftOut) => leftOut.category === DropCategory.NOT_IN_THIS_REPORT)
				.map((leftOut) => leftOut.subject),
		).size;

		const mentioned = new Set<ProvenanceNode>([
			grouping,
			...members,
			...lines,
			...matchedLots
				.flatMap((matched) => [matched.acquired.line, matched.sold.line])
				.filter((line): line is ProvenanceNode => line !== null),
		]);

		return new ReportInstrument({
			kind: this.kindOf(grouping, events),
			node: grouping,
			events: eventItems,
			brokerLots: lotItems,
			matchedLots,
			corporateActions: this.corporateActionsOf(grouping, all),
			lines,
			notInReport,
			warnings: warnings.filter((warning) => mentioned.has(warning.node)),
		});
	}

	// The report did something with a member when it matched it, summed it, or left it out as
	// something this report doesn't carry.
	private isInPlay(member: ProvenanceNode, flow: ProvenanceWalker): boolean {
		const used = flow
			.children(member)
			.some(
				(edge) =>
					edge.change === ProvenanceChange.MATCHED || edge.change === ProvenanceChange.SUMMED,
			);
		const expectedDrop = flow
			.dropsOf(member)
			.some((drop) => dropCategoryOf(drop.reason) === DropCategory.NOT_IN_THIS_REPORT);
		return used || expectedDrop;
	}

	private kindOf(grouping: ProvenanceNode, events: ProvenanceNode[]): ReportInstrumentKind {
		if (grouping.fields[ProvenanceField.UNDERLYING_SYMBOL] !== undefined) {
			return ReportInstrumentKind.OPTION_CONTRACT;
		}
		if (events.some((event) => cashEventKinds.includes(event.fields[ProvenanceField.EVENT_KIND]))) {
			return ReportInstrumentKind.DIVIDEND_PAYER;
		}
		return ReportInstrumentKind.STOCK;
	}

	private itemOf(node: ProvenanceNode, flow: ProvenanceWalker): ReportItem {
		return new ReportItem({
			node,
			leftOut: flow.dropsOf(node).map((drop) => this.leftOutOf(drop, flow)),
		});
	}

	private matchedLotOf(matched: ProvenanceNode, flow: ProvenanceWalker): ReportMatchedLot {
		const legs = flow
			.children(matched)
			.map((edge) => edge.to)
			.filter((node) => node.kind === ProvenanceNodeKind.LEG);
		const acquired = legs.find(
			(leg) => leg.fields[ProvenanceField.LEG_SIDE] === ProvenanceLegSide.ACQUIRED,
		);
		const sold = legs.find(
			(leg) => leg.fields[ProvenanceField.LEG_SIDE] === ProvenanceLegSide.SOLD,
		);
		if (acquired === undefined) {
			throw new Error("Provenance: matched lot has no acquired leg");
		}
		if (sold === undefined) {
			throw new Error("Provenance: matched lot has no sold leg");
		}
		return new ReportMatchedLot({
			node: matched,
			acquired: this.sideOf(acquired, flow),
			sold: this.sideOf(sold, flow),
		});
	}

	private sideOf(leg: ProvenanceNode, flow: ProvenanceWalker): ReportMatchedLotSide {
		const line = flow
			.children(leg)
			.map((edge) => edge.to)
			.find((node) => node.kind === ProvenanceNodeKind.REPORT_LINE);
		return new ReportMatchedLotSide({
			leg,
			line: line ?? null,
			leftOut: flow.dropsOf(leg).map((drop) => this.leftOutOf(drop, flow)),
		});
	}

	// The sentence about a dropped leg is about its matched lot.
	private leftOutOf(drop: ProvenanceDrop, flow: ProvenanceWalker): ReportLeftOut {
		const matched =
			drop.node.kind === ProvenanceNodeKind.LEG
				? flow
						.parents(drop.node)
						.map((edge) => edge.from)
						.find((node) => node.kind === ProvenanceNodeKind.MATCHED_LOT)
				: undefined;
		return new ReportLeftOut({
			subject: matched ?? drop.node,
			drop,
			category: dropCategoryOf(drop.reason),
		});
	}

	// The corporate actions behind a grouping, found through every grouping it replaced.
	private corporateActionsOf(grouping: ProvenanceNode, all: ProvenanceWalker): ProvenanceNode[] {
		const actions: ProvenanceNode[] = [];
		const seen = new Set<ProvenanceNode>([grouping]);
		const pending: ProvenanceNode[] = [grouping];
		for (let index = 0; index < pending.length; index++) {
			for (const edge of all.parents(pending[index])) {
				const from = edge.from;
				if (edge.change === ProvenanceChange.GROUPED || seen.has(from)) {
					continue;
				}
				if (from.kind === ProvenanceNodeKind.CORPORATE_ACTION) {
					seen.add(from);
					actions.push(from);
				} else if (from.kind === ProvenanceNodeKind.GROUPING) {
					seen.add(from);
					pending.push(from);
				}
			}
		}
		return actions;
	}

	private underlyingsOf(contracts: ReportInstrument[]): ReportUnderlying[] {
		const bySymbol = new Map<string, ReportInstrument[]>();
		for (const contract of this.sortContracts(contracts)) {
			const symbol = contract.node.fields[ProvenanceField.UNDERLYING_SYMBOL];
			bySymbol.set(symbol, [...(bySymbol.get(symbol) ?? []), contract]);
		}
		return [...bySymbol.entries()]
			.sort(([left], [right]) => this.compare(left, right))
			.map(
				([underlyingSymbol, grouped]) =>
					new ReportUnderlying({
						underlyingSymbol: ProvenanceUnderlyingSymbol.Schema.parse(underlyingSymbol),
						contracts: grouped,
					}),
			);
	}

	private sortByTicker(instruments: ReportInstrument[]): ReportInstrument[] {
		return [...instruments].sort((left, right) =>
			this.compare(
				left.node.fields[ProvenanceField.TICKER] ?? "",
				right.node.fields[ProvenanceField.TICKER] ?? "",
			),
		);
	}

	private sortContracts(instruments: ReportInstrument[]): ReportInstrument[] {
		return [...instruments].sort((left, right) => {
			const leftFields = left.node.fields;
			const rightFields = right.node.fields;
			return (
				this.compare(
					leftFields[ProvenanceField.UNDERLYING_SYMBOL] ?? "",
					rightFields[ProvenanceField.UNDERLYING_SYMBOL] ?? "",
				) ||
				this.compare(
					leftFields[ProvenanceField.EXPIRY] ?? "",
					rightFields[ProvenanceField.EXPIRY] ?? "",
				) ||
				Number(leftFields[ProvenanceField.STRIKE] ?? "0") -
					Number(rightFields[ProvenanceField.STRIKE] ?? "0") ||
				this.compare(
					leftFields[ProvenanceField.OPTION_RIGHT] ?? "",
					rightFields[ProvenanceField.OPTION_RIGHT] ?? "",
				)
			);
		});
	}

	private sortedBy(nodes: ProvenanceNode[], field: ProvenanceField): ProvenanceNode[] {
		return [...nodes].sort((left, right) =>
			this.compare(left.fields[field] ?? "", right.fields[field] ?? ""),
		);
	}

	private compare(left: string, right: string): number {
		if (left < right) {
			return -1;
		}
		return left > right ? 1 : 0;
	}

	private distinct(nodes: ProvenanceNode[]): ProvenanceNode[] {
		return [...new Set(nodes)];
	}
}
