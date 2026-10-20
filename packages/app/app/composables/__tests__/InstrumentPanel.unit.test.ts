import { ProvenanceEventKind, type ReportProvenance } from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { nextTick, shallowRef } from "vue";
import { mountComposable } from "~/composables/__tests__/support/mountComposable";
import { useInstrumentPanel } from "~/composables/useInstrumentPanel";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";

describe("the step's instrument panel", () => {
	test("a new panel picks its first instrument, with no item to start its card at", async () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const nope = b.instrument({ ticker: "NOPE", isin: "XS0000000009" });
		const dividend = b.dividend({
			file,
			instrument: nope,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-04-01",
			amount: "2.64",
			currency: "EUR",
			label: "dividend NOPE",
		});
		b.sumInto({ instrument: nope, events: [dividend], dateReceived: "2022-04-01" });
		const reading = b.reading();

		const panel = await mountComposable(() => useInstrumentPanel(() => reading));

		expect(panel.selected.value).toBe(reading.dividendPayers[0]);
		expect(panel.selectedEntry.value?.ticker).toEqual("NOPE");
		expect(panel.startAt.value).toBeNull();
		expect(panel.entryCount.value).toEqual(1);
	});

	test("showing an item picks its instrument and starts its card there; picking one clears it", async () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const nope = b.instrument({ ticker: "NOPE", isin: "XS0000000009" });
		const nopeDividend = b.dividend({
			file,
			instrument: nope,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-04-01",
			amount: "2.64",
			currency: "EUR",
			label: "dividend NOPE",
		});
		b.sumInto({ instrument: nope, events: [nopeDividend], dateReceived: "2022-04-01" });
		const tte = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const tteDividend = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-04-02",
			amount: "1.10",
			currency: "EUR",
			label: "dividend TTE",
		});
		b.sumInto({ instrument: tte, events: [tteDividend], dateReceived: "2022-04-02" });
		const reading = b.reading();
		const tteInstrument = reading.dividendPayers.find((payer) => payer.node === b.node(tte));
		assert(tteInstrument !== undefined);
		const panel = await mountComposable(() => useInstrumentPanel(() => reading));

		panel.show(tteInstrument, b.node(tteDividend.event));

		expect(panel.selected.value).toBe(tteInstrument);
		expect(panel.startAt.value).toBe(b.node(tteDividend.event));

		panel.select(tteInstrument);

		expect(panel.selected.value).toBe(tteInstrument);
		expect(panel.startAt.value).toBeNull();
	});

	test("a report made again keeps the instrument it showed, and its card is a new one", async () => {
		const first = new GraphBuilder();
		const firstFile = first.file({ name: "U1.xml" });
		const firstTte = first.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const firstTteDividend = first.dividend({
			file: firstFile,
			instrument: firstTte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-04-02",
			amount: "1.10",
			currency: "EUR",
			label: "dividend TTE",
		});
		first.sumInto({ instrument: firstTte, events: [firstTteDividend], dateReceived: "2022-04-02" });
		const firstNope = first.instrument({ ticker: "NOPE", isin: "XS0000000009" });
		const firstNopeDividend = first.dividend({
			file: firstFile,
			instrument: firstNope,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-04-01",
			amount: "2.64",
			currency: "EUR",
			label: "dividend NOPE",
		});
		first.sumInto({
			instrument: firstNope,
			events: [firstNopeDividend],
			dateReceived: "2022-04-01",
		});
		const second = new GraphBuilder();
		const secondFile = second.file({ name: "U1.xml" });
		const secondNope = second.instrument({ ticker: "NOPE", isin: "XS0000000009" });
		const secondNopeDividend = second.dividend({
			file: secondFile,
			instrument: secondNope,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-04-01",
			amount: "2.64",
			currency: "EUR",
			label: "dividend NOPE",
		});
		second.sumInto({
			instrument: secondNope,
			events: [secondNopeDividend],
			dateReceived: "2022-04-01",
		});
		const firstReading = first.reading();
		const secondReading = second.reading();
		const firstNopeInstrument = firstReading.dividendPayers.find(
			(payer) => payer.node === first.node(firstNope),
		);
		assert(firstNopeInstrument !== undefined);
		const reading = shallowRef<ReportProvenance>(firstReading);
		const panel = await mountComposable(() => useInstrumentPanel(() => reading.value));
		panel.show(firstNopeInstrument, first.node(firstNopeDividend.event));
		const cardKeyBefore = panel.cardKey.value;

		reading.value = secondReading;
		await nextTick();

		expect(panel.selected.value).toBe(secondReading.dividendPayers[0]);
		expect(panel.selectedEntry.value?.ticker).toEqual("NOPE");
		expect(panel.startAt.value).toBeNull();
		expect(panel.cardKey.value).not.toEqual(cardKeyBefore);
	});
});
