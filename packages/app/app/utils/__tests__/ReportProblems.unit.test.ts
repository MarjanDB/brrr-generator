import {
	ProvenanceDetail,
	ProvenanceDetailKind,
	ProvenanceDetailValue,
	ProvenanceEventKind,
	ProvenanceStage,
	ProvenanceWalker,
} from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { InstrumentPanels } from "~/composables/instrumentPanel/instrumentPanels";
import type { DefinedPayer } from "~/types/reportFlow";
import { ProblemState } from "~/types/reportProblems";
import { GraphBuilder } from "~/utils/__tests__/support/GraphBuilder";
import { openProblemCount, problemGroupsOf } from "~/utils/reportProblems";

const stage = ProvenanceStage.Schema.parse("Test");
const noPayers: ReadonlyMap<string, DefinedPayer> = new Map();

describe("the report's problems about its instruments, in the problems view's list", () => {
	test("an instrument's warnings of one kind are one problem, with the payments on their lines", () => {
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
			label: "dividend NOPE April",
		});
		const october = b.dividend({
			file,
			instrument: nope,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2022-10-03",
			amount: "1.10",
			currency: "EUR",
			label: "dividend NOPE October",
		});
		const aprilLine = b.sumInto({ instrument: nope, events: [april], dateReceived: "2022-04-01" });
		const octoberLine = b.sumInto({
			instrument: nope,
			events: [october],
			dateReceived: "2022-10-03",
		});
		const failed = new ProvenanceDetail({
			kind: ProvenanceDetailKind.COMPANY_LOOKUP_FAILED,
			values: {
				[ProvenanceDetailValue.ISIN]: "XS0000000009",
				[ProvenanceDetailValue.ERROR]: "Not Found",
			},
		});
		b.graph.warn(aprilLine.line, stage, failed);
		b.graph.warn(octoberLine.line, stage, failed);
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
		const reading = b.reading();

		const groups = problemGroupsOf(
			InstrumentPanels.build(reading),
			reading.warnings,
			noPayers,
			new ProvenanceWalker(b.graph),
		);

		expect(groups).toHaveLength(2);
		expect(groups[0]?.kind).toEqual(ProvenanceDetailKind.COMPANY_NOT_FOUND);
		expect(groups[0]?.problems).toHaveLength(1);
		expect(groups[0]?.problems[0]?.title).toEqual("ACME");
		expect(groups[1]?.kind).toEqual(ProvenanceDetailKind.COMPANY_LOOKUP_FAILED);
		expect(groups[1]?.problems).toHaveLength(1);
		const problem = groups[1]?.problems[0];
		expect(problem?.title).toEqual("NOPE");
		expect(problem?.entry.isin).toEqual("XS0000000009");
		expect(problem?.warnings).toHaveLength(2);
		expect(problem?.affected).toHaveLength(2);
		expect(problem?.affected[0]).toBe(b.node(april.event));
		expect(problem?.affected[1]).toBe(b.node(october.event));
		expect(problem?.lineCount).toEqual(2);
		expect(problem?.defined).toBeNull();
		expect(problem?.state).toEqual(ProblemState.OPEN);
		expect(openProblemCount(groups)).toEqual(2);
	});

	test("a payer defined by hand resolves its problem while the report still warns about it", () => {
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
		const payer: DefinedPayer = {
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
		const reading = b.reading();

		const groups = problemGroupsOf(
			InstrumentPanels.build(reading),
			reading.warnings,
			new Map([["XS0000000009", payer]]),
			new ProvenanceWalker(b.graph),
		);

		expect(groups).toHaveLength(1);
		expect(groups[0]?.problems[0]?.defined).toBe(payer);
		expect(groups[0]?.problems[0]?.warnings).toHaveLength(1);
		expect(groups[0]?.problems[0]?.state).toEqual(ProblemState.RESOLVED);
		expect(openProblemCount(groups)).toEqual(0);
	});

	test("once the report no longer warns, a payer defined by hand stays in its problem's group, resolved", () => {
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
		b.sumInto({ instrument: nope, events: [april], dateReceived: "2022-04-01" });
		const payer: DefinedPayer = {
			definition: {
				isin: "XS0000000009",
				name: "Nope Holdings plc",
				street: "1 Example Street",
				city: "London",
				countryName: "United Kingdom",
				countryCode: "GB",
			},
			resolves: ProvenanceDetailKind.COMPANY_NOT_FOUND,
		};
		const reading = b.reading();

		const groups = problemGroupsOf(
			InstrumentPanels.build(reading),
			reading.warnings,
			new Map([["XS0000000009", payer]]),
			new ProvenanceWalker(b.graph),
		);

		expect(groups).toHaveLength(1);
		expect(groups[0]?.kind).toEqual(ProvenanceDetailKind.COMPANY_NOT_FOUND);
		expect(groups[0]?.problems).toHaveLength(2);
		expect(groups[0]?.problems[0]?.title).toEqual("ACME");
		expect(groups[0]?.problems[0]?.state).toEqual(ProblemState.OPEN);
		expect(groups[0]?.problems[1]?.title).toEqual("NOPE");
		expect(groups[0]?.problems[1]?.warnings).toHaveLength(0);
		expect(groups[0]?.problems[1]?.affected).toHaveLength(1);
		expect(groups[0]?.problems[1]?.affected[0]).toBe(b.node(april.event));
		expect(groups[0]?.problems[1]?.lineCount).toEqual(1);
		expect(groups[0]?.problems[1]?.state).toEqual(ProblemState.RESOLVED);
		expect(openProblemCount(groups)).toEqual(1);
	});

	test("a problem keeps its key in a report made again, whose nodes are new", () => {
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
				kind: ProvenanceDetailKind.COMPANY_NOT_FOUND,
				values: { [ProvenanceDetailValue.ISIN]: "XS0000000009" },
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
		const payers = new Map([
			[
				"XS0000000009",
				{
					definition: {
						isin: "XS0000000009",
						name: "Nope Holdings plc",
						street: "1 Example Street",
						city: "London",
						countryName: "United Kingdom",
						countryCode: "GB",
					},
					resolves: ProvenanceDetailKind.COMPANY_NOT_FOUND,
				},
			],
		]);
		const firstReading = first.reading();
		const secondReading = second.reading();

		const before = problemGroupsOf(
			InstrumentPanels.build(firstReading),
			firstReading.warnings,
			noPayers,
			new ProvenanceWalker(first.graph),
		);
		const after = problemGroupsOf(
			InstrumentPanels.build(secondReading),
			secondReading.warnings,
			payers,
			new ProvenanceWalker(second.graph),
		);

		expect(after[0]?.problems[0]?.key).toEqual(before[0]?.problems[0]?.key);
	});

	test("only the warnings the report raised are problems, not ones its import raised", () => {
		const b = new GraphBuilder();
		const file = b.file({ name: "U1.xml" });
		const tte = b.instrument({ ticker: "TTE", isin: "FR0000120271" });
		const dividend = b.dividend({
			file,
			instrument: tte,
			kind: ProvenanceEventKind.DIVIDEND,
			date: "2024-04-01",
			amount: "20",
			currency: "EUR",
			label: "dividend TTE",
		});
		b.sumInto({ instrument: tte, events: [dividend], dateReceived: "2024-04-01" });
		b.graph.warn(
			dividend.event,
			stage,
			new ProvenanceDetail({ kind: ProvenanceDetailKind.FILE_ERROR, values: {} }),
		);
		const reading = b.reading();

		const groups = problemGroupsOf(
			InstrumentPanels.build(reading),
			[],
			noPayers,
			new ProvenanceWalker(b.graph),
		);

		expect(groups).toHaveLength(0);
	});
});
