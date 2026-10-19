import { DateTime } from "luxon";
import { describe, expect, test } from "vitest";
import { defaultTaxYear } from "~/utils/taxYears";

describe("the tax year the reports open on", () => {
	test("last year, when the import has something in it", () => {
		const year = defaultTaxYear([2024, 2025], DateTime.fromISO("2026-10-19"));

		expect(year).toEqual(2025);
	});

	test("the latest year before last year, when last year has nothing", () => {
		const year = defaultTaxYear([2022, 2023, 2026], DateTime.fromISO("2026-10-19"));

		expect(year).toEqual(2023);
	});

	test("the earliest year after last year, when the import has nothing up to last year", () => {
		const year = defaultTaxYear([2026], DateTime.fromISO("2026-10-19"));

		expect(year).toEqual(2026);
	});

	test("last year, when the import has nothing at all", () => {
		const year = defaultTaxYear([], DateTime.fromISO("2026-10-19"));

		expect(year).toEqual(2025);
	});
});
