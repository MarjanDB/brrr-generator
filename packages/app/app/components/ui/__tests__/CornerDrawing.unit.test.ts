import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, test } from "vitest";
import CornerDrawing from "~/components/ui/CornerDrawing.vue";

describe("the drawing in the window's corner", () => {
	test("credits where the drawing comes from", async () => {
		const wrapper = await mountSuspended(CornerDrawing);

		expect(wrapper.text()).toEqual("FX Fighter Kurumi-chan");
	});
});
