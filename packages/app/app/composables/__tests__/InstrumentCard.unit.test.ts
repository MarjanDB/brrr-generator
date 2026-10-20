import {
	DropReason,
	ProvenanceChange,
	ProvenanceEventKind,
	ProvenanceField,
	ProvenanceNodeKind,
	ProvenanceStage,
	ProvenanceWalker,
	TaxAuthorityLotMatchingMethod,
} from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import {
	mountComposable,
	mountComposableUnder,
} from "~/composables/__tests__/support/mountComposable";
import { useGraphFocus } from "~/composables/useGraphFocus";
import {
	type InstrumentCardState,
	provideInstrumentCard,
	useInstrumentCard,
} from "~/composables/useInstrumentCard";
import { DetectedReason, InstrumentCardTab } from "~/types/instrumentCard";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import { buildPanel, firstEntry } from "~/utils/instrumentPanel";

const stage = ProvenanceStage.Schema.parse("Test");

describe("one instrument's card on the reports step", () => {
	test("a card starts its focus on its instrument's first sale on the form, with nothing to go back to", async () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const reading = b.reading();
		const entry = firstEntry(buildPanel(reading));
		assert(entry !== null);

		const card = await mountComposable(() =>
			provideInstrumentCard({
				entry,
				reading,
				walker: new ProvenanceWalker(b.graph),
				graph: b.graph,
				year: 2024,
				lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
				formName: "KDVP",
				formCode: "Doh-KDVP",
			}),
		);

		expect(card.focus.node.value).toBe(b.node(sell.event));
		expect(card.focus.trail.value).toHaveLength(0);
	});

	test("a card draws its own instrument's timeline, names it by its ticker, and a click can focus only what the timeline draws", async () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		const match = b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const reading = b.reading();
		const entry = firstEntry(buildPanel(reading));
		assert(entry !== null);

		const card = await mountComposable(() =>
			provideInstrumentCard({
				entry,
				reading,
				walker: new ProvenanceWalker(b.graph),
				graph: b.graph,
				year: 2024,
				lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
				formName: "KDVP",
				formCode: "Doh-KDVP",
			}),
		);

		expect(card.name).toEqual("ACME");
		expect(card.timeline.value.marks).toHaveLength(2);
		expect(card.timeline.value.bars).toHaveLength(1);
		expect(card.focusable.value.has(b.node(match.lot))).toEqual(true);
		expect(card.focusable.value.has(b.node(buy.event))).toEqual(true);
		expect(card.focusable.value.has(b.node(sell.row))).toEqual(false);
	});

	test("what was left out follows the card's focus", async () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const open = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-05-10",
			quantity: "3",
			price: "7",
			currency: "USD",
			label: "another buy",
		});
		b.graph.drop(open.event, DropReason.POSITION_OPEN, stage, null);
		const reading = b.reading();
		const entry = firstEntry(buildPanel(reading));
		assert(entry !== null);
		const card = await mountComposable(() =>
			provideInstrumentCard({
				entry,
				reading,
				walker: new ProvenanceWalker(b.graph),
				graph: b.graph,
				year: 2024,
				lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
				formName: "KDVP",
				formCode: "Doh-KDVP",
			}),
		);
		expect(card.leftOut.value).toHaveLength(0);

		card.focus.refocus(b.node(open.event));

		expect(card.leftOut.value).toHaveLength(1);
		expect(card.leftOut.value[0]?.drop.reason).toEqual(DropReason.POSITION_OPEN);
		expect(card.warnings.value).toHaveLength(0);
	});

	test("a card opens on the form's tab, with the lots on the form and everything detected", async () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		const match = b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const reading = b.reading();
		const entry = firstEntry(buildPanel(reading));
		assert(entry !== null);

		const card = await mountComposable(() =>
			provideInstrumentCard({
				entry,
				reading,
				walker: new ProvenanceWalker(b.graph),
				graph: b.graph,
				year: 2024,
				lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
				formName: "KDVP",
				formCode: "Doh-KDVP",
			}),
		);

		expect(card.tab.value).toEqual(InstrumentCardTab.ON_THE_FORM);
		expect(card.formLots.value).toHaveLength(1);
		expect(card.formLots.value[0]?.lot).toBe(b.node(match.lot));
		expect(card.formPayments.value).toHaveLength(0);
		expect(card.formTotal.value).toEqual(0);
		expect(card.detected.value).toHaveLength(2);
		expect(card.detected.value[0]?.mark.node).toBe(b.node(buy.event));
		expect(card.detected.value[1]?.mark.node).toBe(b.node(sell.event));
	});

	test("showing an item's trace moves the focus to it and opens the Trace tab", async () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const reading = b.reading();
		const entry = firstEntry(buildPanel(reading));
		assert(entry !== null);
		const card = await mountComposable(() =>
			provideInstrumentCard({
				entry,
				reading,
				walker: new ProvenanceWalker(b.graph),
				graph: b.graph,
				year: 2024,
				lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
				formName: "KDVP",
				formCode: "Doh-KDVP",
			}),
		);

		card.showTrace(b.node(buy.event));

		expect(card.focus.node.value).toBe(b.node(buy.event));
		expect(card.focus.trail.value).toEqual([b.node(sell.event)]);
		expect(card.tab.value).toEqual(InstrumentCardTab.TRACE);
	});

	test("a click on the timeline offers the item's trace, except on the Trace tab, which follows the focus", async () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const reading = b.reading();
		const entry = firstEntry(buildPanel(reading));
		assert(entry !== null);
		const card = await mountComposable(() =>
			provideInstrumentCard({
				entry,
				reading,
				walker: new ProvenanceWalker(b.graph),
				graph: b.graph,
				year: 2024,
				lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
				formName: "KDVP",
				formCode: "Doh-KDVP",
			}),
		);
		expect(card.offered.value).toBeNull();

		card.offerTrace(b.node(buy.event));
		expect(card.offered.value).toBe(b.node(buy.event));

		card.dismissOffer();
		expect(card.offered.value).toBeNull();

		card.offerTrace(b.node(buy.event));
		card.showTrace(b.node(buy.event));
		expect(card.offered.value).toBeNull();
		expect(card.tab.value).toEqual(InstrumentCardTab.TRACE);

		card.offerTrace(b.node(sell.event));
		expect(card.offered.value).toBeNull();
	});

	test("everything detected says, in tax terms, why each item is or isn't on the form", async () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const oldBuy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2023-01-10",
			quantity: "4",
			price: "5",
			currency: "USD",
			label: "old buy",
		});
		const oldSale = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2023-03-10",
			quantity: "-4",
			price: "6",
			currency: "USD",
			label: "old sale",
		});
		const old = b.matchClosed({ instrument: acme, acquired: oldBuy, sold: oldSale, quantity: "4" });
		b.graph.drop(old.acquiredLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		b.graph.drop(old.soldLeg, DropReason.OUTSIDE_PERIOD, stage, null);
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy",
		});
		const sale = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-6",
			price: "7",
			currency: "USD",
			label: "sale",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sale,
			quantity: "6",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const brokerLot = {};
		b.graph.node(brokerLot, ProvenanceNodeKind.LOT, "lot ACME", {
			[ProvenanceField.ACQUIRED_DATE]: "2024-01-10",
			[ProvenanceField.QUANTITY]: "10",
		});
		b.graph.derive([brokerLot], acme, ProvenanceChange.GROUPED, stage, null);
		b.graph.drop(brokerLot, DropReason.NOT_USED, stage, null);
		const reading = b.reading();
		const entry = firstEntry(buildPanel(reading));
		assert(entry !== null);
		const { card, i18n } = await mountComposable(() => ({
			card: provideInstrumentCard({
				entry,
				reading,
				walker: new ProvenanceWalker(b.graph),
				graph: b.graph,
				year: 2024,
				lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
				formName: "KDVP",
				formCode: "Doh-KDVP",
			}),
			i18n: useI18n(),
		}));
		await i18n.setLocale("en");
		const [oldBought, , bought, lot, sold] = card.detected.value;
		assert(oldBought !== undefined && bought !== undefined);
		assert(lot !== undefined && sold !== undefined);

		expect(card.describeParts(oldBought)).toEqual([
			{
				reason: DetectedReason.CLOSED_BEFORE_YEAR,
				verdict: "Excluded",
				detail: "closed in 2023, before the 2024 tax year",
			},
		]);
		expect(card.describeParts(bought)).toEqual([
			{ reason: DetectedReason.REPORTED, verdict: "Reported", detail: "6 shares on Doh-KDVP 2024" },
			{ reason: DetectedReason.STILL_OPEN, verdict: "Excluded", detail: "4 shares still open" },
		]);
		expect(card.describeParts(lot)).toEqual([
			{ reason: DetectedReason.LEFT_OUT, verdict: "Excluded", detail: "Not used for this report." },
		]);
		expect(card.describeParts(sold)).toEqual([
			{ reason: DetectedReason.REPORTED, verdict: "Reported", detail: "on Doh-KDVP 2024" },
		]);
		await i18n.setLocale("sl");
		expect(card.describeParts(oldBought)).toEqual([
			{
				reason: DetectedReason.CLOSED_BEFORE_YEAR,
				verdict: "Izključeno",
				detail: "zaprto v letu 2023, pred davčnim letom 2024",
			},
		]);
		expect(card.describeParts(bought)).toEqual([
			{
				reason: DetectedReason.REPORTED,
				verdict: "Prijavljeno",
				detail: "6 delnic na Doh-KDVP 2024",
			},
			{ reason: DetectedReason.STILL_OPEN, verdict: "Izključeno", detail: "4 delnice: še odprto" },
		]);
		await i18n.setLocale("en");
	});

	test("the card's children share its state and its focus", async () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const buy = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.ACQUIRED,
			date: "2024-01-10",
			quantity: "10",
			price: "5",
			currency: "USD",
			label: "buy ACME",
		});
		const sell = b.trade({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.SOLD,
			date: "2024-03-10",
			quantity: "-10",
			price: "6",
			currency: "USD",
			label: "sell ACME",
		});
		b.match({
			instrument: acme,
			acquired: buy,
			sold: sell,
			quantity: "10",
			boughtOn: "2024-01-10",
			soldOn: "2024-03-10",
		});
		const reading = b.reading();
		const entry = firstEntry(buildPanel(reading));
		assert(entry !== null);
		const provided: { card: InstrumentCardState | null } = { card: null };

		const child = await mountComposableUnder(
			() => {
				provided.card = provideInstrumentCard({
					entry,
					reading,
					walker: new ProvenanceWalker(b.graph),
					graph: b.graph,
					year: 2024,
					lotMatchingMethod: TaxAuthorityLotMatchingMethod.FIFO,
					formName: "KDVP",
					formCode: "Doh-KDVP",
				});
			},
			() => ({ card: useInstrumentCard(), focus: useGraphFocus() }),
		);
		assert(provided.card !== null);

		expect(child.card).toBe(provided.card);
		expect(child.focus).toBe(provided.card.focus);
	});

	test("asking for a card nobody provided is an error", async () => {
		await expect(mountComposable(() => useInstrumentCard())).rejects.toThrow(
			"useInstrumentCard: no ancestor called provideInstrumentCard",
		);
	});
});
