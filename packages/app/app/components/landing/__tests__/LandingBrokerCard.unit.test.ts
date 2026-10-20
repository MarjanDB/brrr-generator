import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";
import LandingBrokerCard from "~/components/landing/LandingBrokerCard.vue";
import type { BrokerGuide } from "~/types/guide";

describe("a broker's card on the landing page", () => {
	test("lists what the site reads from the broker's export", async () => {
		const broker: BrokerGuide = {
			id: "ibkr",
			nameKey: "broker_ibkr_name",
			modalTitleKey: "broker_ibkr_modal_title",
			taglineKey: "broker_ibkr_tagline",
			iconUrl: "/icons/brokers/ibkr.svg",
			readKeys: ["broker_reads_trades", "broker_reads_dividends", "broker_reads_corporate_actions"],
			steps: [],
		};
		const wrapper = await mountSuspended(LandingBrokerCard, { props: { broker } });

		const chips = wrapper.findAll("li");
		expect(chips.length).toEqual(3);
		expect(chips[0]?.text()).toEqual("Trades");
		expect(chips[1]?.text()).toEqual("Dividends");
		expect(chips[2]?.text()).toEqual("Corporate actions");
	});
});
