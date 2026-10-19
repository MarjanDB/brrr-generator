import { TaxpayerType } from "@brrr/lib";
import { describe, expect, test } from "vitest";
import { taxpayerInfoOf } from "~/utils/taxpayer";

describe("the taxpayer block written into a form's XML", () => {
	test("takes the details as they were filled in", () => {
		const info = taxpayerInfoOf({
			taxNumber: "12345678",
			name: "Ime Priimek",
			address: "Naslov 1",
			city: "Ljubljana",
			postNumber: "1000",
			postName: "Ljubljana",
			countryId: "SI",
		});

		expect(info.taxNumber).toEqual("12345678");
		expect(info.taxpayerType).toEqual(TaxpayerType.NATURAL_PERSON);
		expect(info.name).toEqual("Ime Priimek");
		expect(info.address1).toEqual("Naslov 1");
		expect(info.address2).toBeNull();
		expect(info.city).toEqual("Ljubljana");
		expect(info.postNumber).toEqual("1000");
		expect(info.postName).toEqual("Ljubljana");
		expect(info.countryId).toEqual("SI");
		expect(info.resident).toEqual(true);
	});

	test("leaves what wasn't filled in empty", () => {
		const info = taxpayerInfoOf({
			taxNumber: "",
			name: "",
			address: "",
			city: "",
			postNumber: "",
			postName: "",
			countryId: "SI",
		});

		expect(info.taxNumber).toEqual("");
		expect(info.name).toEqual("");
		expect(info.address1).toEqual("");
		expect(info.city).toEqual("");
		expect(info.postNumber).toEqual("");
		expect(info.postName).toEqual("");
	});

	test("a taxpayer from another country isn't a resident", () => {
		const info = taxpayerInfoOf({
			taxNumber: "",
			name: "",
			address: "",
			city: "",
			postNumber: "",
			postName: "",
			countryId: "AT",
		});

		expect(info.countryId).toEqual("AT");
		expect(info.resident).toEqual(false);
	});
});
