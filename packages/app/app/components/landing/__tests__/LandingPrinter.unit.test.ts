import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";
import LandingPrinter from "~/components/landing/LandingPrinter.vue";

describe("the printer in the middle of the landing page", () => {
	test("is the one way into the report flow, named by what it starts", async () => {
		const wrapper = await mountSuspended(LandingPrinter);

		const link = wrapper.find("a");
		expect(link.attributes("href")).toEqual("/en/report/upload");
		expect(link.attributes("aria-label")).toEqual("Start a report");
	});

	test("says only what the link starts, with no line under it", async () => {
		const wrapper = await mountSuspended(LandingPrinter);

		expect(wrapper.find("a").attributes("aria-describedby")).toBeUndefined();
		expect(wrapper.text()).toEqual("XMLbrrrStart a report");
	});

	test("draws the printer as a picture the link's name speaks for", async () => {
		const wrapper = await mountSuspended(LandingPrinter);

		expect(wrapper.find("a svg").attributes("aria-hidden")).toEqual("true");
	});
});
