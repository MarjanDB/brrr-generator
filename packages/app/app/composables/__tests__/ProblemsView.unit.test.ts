import {
	ProvenanceDetail,
	ProvenanceDetailKind,
	ProvenanceDetailValue,
	ProvenanceEventKind,
	type ProvenanceNode,
	ProvenanceStage,
	ProvenanceWalker,
	type ReportInstrument,
} from "@brrr/lib";
import { assert, describe, expect, test } from "vitest";
import { shallowRef } from "vue";
import { mountComposable } from "~/composables/__tests__/support/mountComposable";
import { InstrumentPanels } from "~/composables/instrumentPanel/instrumentPanels";
import { provideReportProblems } from "~/composables/useReportProblems";
import type { DefinedPayer } from "~/types/reportFlow";
import { ProblemState, ReportPanelTab } from "~/types/reportProblems";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";

const stage = ProvenanceStage.Schema.parse("Test");
const acmePayer: DefinedPayer = {
	definition: {
		isin: "US0000000001",
		name: "Acme Corporation",
		street: "1 Main Street",
		city: "Springfield",
		countryName: "United States",
		countryCode: "US",
	},
	resolves: ProvenanceDetailKind.COMPANY_NOT_FOUND,
};
const nopePayer: DefinedPayer = {
	definition: {
		isin: "XS0000000009",
		name: "Nope Holdings plc",
		street: "1 Example Street",
		city: "London",
		countryName: "United Kingdom",
		countryCode: "GB",
	},
	resolves: ProvenanceDetailKind.COMPANY_LOOKUP_FAILED,
};

describe("the report's problems view", () => {
	test("reviewing opens the problems tab on the first problem still open", async () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const june = b.dividend({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-06-15",
			amount: "4.00",
			currency: "EUR",
			label: "dividend ACME",
		});
		b.sumInto({ instrument: acme, events: [june], dateReceived: "2022-06-15" });
		const nope = b.instrument({ ticker: "NOPE", isin: "XS0000000009" });
		const april = b.dividend({
			file,
			instrument: nope,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-04-01",
			amount: "2.64",
			currency: "EUR",
			label: "dividend NOPE",
		});
		const aprilLine = b.sumInto({ instrument: nope, events: [april], dateReceived: "2022-04-01" });
		b.graph.warn(
			aprilLine.line,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.COMPANY_LOOKUP_FAILED,
				values: {
					[ProvenanceDetailValue.ISIN]: "XS0000000009",
					[ProvenanceDetailValue.ERROR]: "Not Found",
				},
			}),
		);
		const reading = b.reading();
		const walker = new ProvenanceWalker(b.graph);
		const problems = await mountComposable(() =>
			provideReportProblems({
				sections: () => InstrumentPanels.build(reading),
				reading: () => reading,
				walker: () => walker,
				formCode: () => "Doh-Div",
				payers: () => new Map([["US0000000001", acmePayer]]),
				show: () => {},
			}),
		);

		expect(problems.tab.value).toEqual(ReportPanelTab.INSTRUMENTS);
		expect(problems.openCount.value).toEqual(1);

		problems.review(null);

		expect(problems.tab.value).toEqual(ReportPanelTab.PROBLEMS);
		expect(problems.selected.value?.title).toEqual("NOPE");
	});

	test("the selected problem stays selected in a report made again, resolved", async () => {
		const first = new GraphBuilder();
		const firstFile = first.file({ name: "U1.xml" });
		const firstNope = first.instrument({ ticker: "NOPE", isin: "XS0000000009" });
		const firstDividend = first.dividend({
			file: firstFile,
			instrument: firstNope,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-04-01",
			amount: "2.64",
			currency: "EUR",
			label: "dividend NOPE",
		});
		const firstLine = first.sumInto({
			instrument: firstNope,
			events: [firstDividend],
			dateReceived: "2022-04-01",
		});
		first.graph.warn(
			firstLine.line,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.COMPANY_LOOKUP_FAILED,
				values: {
					[ProvenanceDetailValue.ISIN]: "XS0000000009",
					[ProvenanceDetailValue.ERROR]: "Not Found",
				},
			}),
		);
		const second = new GraphBuilder();
		const secondFile = second.file({ name: "U1.xml" });
		const secondNope = second.instrument({ ticker: "NOPE", isin: "XS0000000009" });
		const secondDividend = second.dividend({
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
			events: [secondDividend],
			dateReceived: "2022-04-01",
		});
		const made = shallowRef(first);
		const payers = shallowRef<ReadonlyMap<string, DefinedPayer>>(new Map());
		const problems = await mountComposable(() =>
			provideReportProblems({
				sections: () => InstrumentPanels.build(made.value.reading()),
				reading: () => made.value.reading(),
				walker: () => new ProvenanceWalker(made.value.graph),
				formCode: () => "Doh-Div",
				payers: () => payers.value,
				show: () => {},
			}),
		);
		problems.review(null);
		expect(problems.selected.value?.state).toEqual(ProblemState.OPEN);

		payers.value = new Map([["XS0000000009", nopePayer]]);
		made.value = second;

		expect(problems.tab.value).toEqual(ReportPanelTab.PROBLEMS);
		expect(problems.selected.value?.title).toEqual("NOPE");
		expect(problems.selected.value?.state).toEqual(ProblemState.RESOLVED);
		expect(problems.selected.value?.affected[0]).toBe(second.node(secondDividend.event));
	});

	test("a payer's problem says what went wrong, and once resolved, who the payer is", async () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const june = b.dividend({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-06-15",
			amount: "4.00",
			currency: "EUR",
			label: "dividend ACME",
		});
		const juneLine = b.sumInto({ instrument: acme, events: [june], dateReceived: "2022-06-15" });
		b.graph.warn(
			juneLine.line,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.COMPANY_NOT_FOUND,
				values: { [ProvenanceDetailValue.ISIN]: "US0000000001" },
			}),
		);
		const nope = b.instrument({ ticker: "NOPE", isin: "XS0000000009" });
		const april = b.dividend({
			file,
			instrument: nope,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-04-01",
			amount: "2.64",
			currency: "EUR",
			label: "dividend NOPE",
		});
		const aprilLine = b.sumInto({ instrument: nope, events: [april], dateReceived: "2022-04-01" });
		b.graph.warn(
			aprilLine.line,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.COMPANY_LOOKUP_FAILED,
				values: {
					[ProvenanceDetailValue.ISIN]: "XS0000000009",
					[ProvenanceDetailValue.ERROR]: "Not Found",
				},
			}),
		);
		const tte = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const tteDividend = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-04-02",
			amount: "2.64",
			currency: "EUR",
			label: "dividend TTE",
		});
		b.sumInto({ instrument: tte, events: [tteDividend], dateReceived: "2022-04-02" });
		const tteDefined: DefinedPayer = {
			definition: {
				isin: "FR0000120271",
				name: "TotalEnergies SE",
				street: "2 Place Jean Millier",
				city: "Courbevoie",
				countryName: "France",
				countryCode: "FR",
			},
			resolves: ProvenanceDetailKind.COMPANY_NOT_FOUND,
		};
		const reading = b.reading();
		const walker = new ProvenanceWalker(b.graph);
		const problems = await mountComposable(() =>
			provideReportProblems({
				sections: () => InstrumentPanels.build(reading),
				reading: () => reading,
				walker: () => walker,
				formCode: () => "Doh-Div",
				payers: () => new Map([["FR0000120271", tteDefined]]),
				show: () => {},
			}),
		);
		const notFound = problems.groups.value[0]?.problems[0];
		const failed = problems.groups.value[1]?.problems[0];
		const resolved = problems.groups.value[0]?.problems[1];
		if (notFound === undefined || failed === undefined || resolved === undefined) {
			throw new Error("missing problems");
		}

		expect(problems.titleOf(notFound)).toEqual("Payer US0000000001");
		expect(problems.sentenceOf(notFound)).toEqual(
			"No company was found for US0000000001, so the payer's name, address and country on Doh-Div are blank.",
		);
		expect(problems.signOf(notFound)).toEqual("Company not found");
		expect(problems.sentenceOf(failed)).toEqual(
			"Looking up XS0000000009 failed, so the payer's name, address and country on Doh-Div are blank.",
		);
		expect(problems.signOf(failed)).toEqual("Company lookup failed");
		expect(problems.sentenceOf(resolved)).toEqual(
			"Defined by you for this session: the payer on Doh-Div is now TotalEnergies SE.",
		);
		expect(problems.signOf(resolved)).toEqual("TotalEnergies SE · defined by you");
	});

	test("an item on the form gives the open problem it's affected by, and a resolved one none", async () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const acme = b.instrument({ ticker: "ACME", isin: "US0000000001" });
		const june = b.dividend({
			file,
			instrument: acme,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-06-15",
			amount: "4.00",
			currency: "EUR",
			label: "dividend ACME",
		});
		const juneLine = b.sumInto({ instrument: acme, events: [june], dateReceived: "2022-06-15" });
		b.graph.warn(
			juneLine.line,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.COMPANY_NOT_FOUND,
				values: { [ProvenanceDetailValue.ISIN]: "US0000000001" },
			}),
		);
		const nope = b.instrument({ ticker: "NOPE", isin: "XS0000000009" });
		const april = b.dividend({
			file,
			instrument: nope,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-04-01",
			amount: "2.64",
			currency: "EUR",
			label: "dividend NOPE",
		});
		const aprilLine = b.sumInto({ instrument: nope, events: [april], dateReceived: "2022-04-01" });
		b.graph.warn(
			aprilLine.line,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.COMPANY_LOOKUP_FAILED,
				values: {
					[ProvenanceDetailValue.ISIN]: "XS0000000009",
					[ProvenanceDetailValue.ERROR]: "Not Found",
				},
			}),
		);
		const reading = b.reading();
		const walker = new ProvenanceWalker(b.graph);
		const problems = await mountComposable(() =>
			provideReportProblems({
				sections: () => InstrumentPanels.build(reading),
				reading: () => reading,
				walker: () => walker,
				formCode: () => "Doh-Div",
				payers: () => new Map([["US0000000001", acmePayer]]),
				show: () => {},
			}),
		);

		const [acmeInstrument] = reading.dividendPayers;
		assert(acmeInstrument !== undefined);

		expect(problems.openProblemAt(b.node(april.event))?.title).toEqual("NOPE");
		expect(problems.openProblemAt(b.node(june.event))).toBeNull();
		expect(problems.problemOf(acmeInstrument)?.title).toEqual("ACME");
	});

	test("showing an affected item on the form opens its instrument there, on the instruments tab", async () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const nope = b.instrument({ ticker: "NOPE", isin: "XS0000000009" });
		const april = b.dividend({
			file,
			instrument: nope,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-04-01",
			amount: "2.64",
			currency: "EUR",
			label: "dividend NOPE",
		});
		const aprilLine = b.sumInto({ instrument: nope, events: [april], dateReceived: "2022-04-01" });
		b.graph.warn(
			aprilLine.line,
			stage,
			new ProvenanceDetail({
				kind: ProvenanceDetailKind.COMPANY_LOOKUP_FAILED,
				values: {
					[ProvenanceDetailValue.ISIN]: "XS0000000009",
					[ProvenanceDetailValue.ERROR]: "Not Found",
				},
			}),
		);
		const reading = b.reading();
		const walker = new ProvenanceWalker(b.graph);
		const shown: { instrument: ReportInstrument; at: ProvenanceNode }[] = [];
		const problems = await mountComposable(() =>
			provideReportProblems({
				sections: () => InstrumentPanels.build(reading),
				reading: () => reading,
				walker: () => walker,
				formCode: () => "Doh-Div",
				payers: () => new Map(),
				show: (instrument, at) => {
					shown.push({ instrument, at });
				},
			}),
		);
		problems.review(null);
		const problem = problems.selected.value;
		if (problem === null) {
			throw new Error("no problem selected");
		}

		problems.showOnForm(problem, b.node(april.event));

		expect(problems.tab.value).toEqual(ReportPanelTab.INSTRUMENTS);
		expect(shown).toHaveLength(1);
		expect(shown[0]?.instrument).toBe(reading.dividendPayers[0]);
		expect(shown[0]?.at).toBe(b.node(april.event));
	});
});
