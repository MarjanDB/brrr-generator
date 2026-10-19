<script setup lang="ts">
import { useResizeObserver } from "@vueuse/core";
import { computed, shallowRef, useTemplateRef } from "vue";
import BrokerGuideCard from "~/components/guide/BrokerGuideCard.vue";
import LandingDownArrow from "~/components/landing/LandingDownArrow.vue";
import LandingMark from "~/components/landing/LandingMark.vue";
import LandingTaxOfficeCard from "~/components/landing/LandingTaxOfficeCard.vue";
import type { LandingArrow, LandingBox } from "~/types/landing";

const { t } = useI18n();

const rowRef = useTemplateRef<HTMLElement>("row");
const arrows = shallowRef<{ brokers: LandingArrow[]; offices: LandingArrow[] }>({
	brokers: [],
	offices: [],
});
const allArrows = computed(() => [...arrows.value.brokers, ...arrows.value.offices]);

function boxOf(element: Element, origin: DOMRect): LandingBox {
	const rect = element.getBoundingClientRect();
	return {
		x: rect.left - origin.left,
		y: rect.top - origin.top,
		width: rect.width,
		height: rect.height,
	};
}

// The arrows follow the cards and the mark as laid out, in the order the page shows them. They are
// drawn only beside each other; stacked, the page shows its down arrows instead.
function measure() {
	const row = rowRef.value;
	const mark = row?.querySelector("[data-landing-mark]");
	if (row === null || row === undefined || mark === null || mark === undefined) {
		return;
	}
	const origin = row.getBoundingClientRect();
	arrows.value = landingArrowsOf({
		mark: boxOf(mark, origin),
		brokers: [...row.querySelectorAll("[data-landing-broker]")].map((card) => boxOf(card, origin)),
		offices: [...row.querySelectorAll("[data-landing-office]")].map((card) => boxOf(card, origin)),
	});
}

useResizeObserver(rowRef, measure);
</script>

<template>
	<!-- The brokers on the left, the mark in the middle, the tax offices on the right; stacked on a
	     narrow screen. Every card in a column is as tall as the tallest one. -->
	<div
		ref="row"
		class="relative mx-auto grid w-full max-w-md grid-cols-1 gap-y-2 lg:max-w-none lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-x-25 lg:pb-14"
	>
		<svg
			class="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible lg:block"
			aria-hidden="true"
		>
			<template v-for="(arrow, index) in allArrows" :key="index">
				<path
					:d="arrow.line"
					fill="none"
					stroke-width="1.7"
					stroke-linecap="round"
					class="stroke-action-edge"
				/>
				<path :d="arrow.head" class="fill-action-edge" />
			</template>
		</svg>

		<h2
			id="landing-brokers"
			class="ml-0.5 w-full text-sm font-semibold app-text-muted lg:col-start-1 lg:row-start-1 lg:max-w-72 lg:self-end lg:justify-self-end"
		>
			{{ t('landing_brokers_heading') }}
		</h2>
		<ul
			aria-labelledby="landing-brokers"
			class="relative grid w-full auto-rows-fr gap-2.5 lg:col-start-1 lg:row-start-2 lg:max-w-72 lg:justify-self-end"
		>
			<li v-for="broker in BROKER_GUIDES" :key="broker.id" class="flex" data-landing-broker>
				<BrokerGuideCard :broker="broker" />
			</li>
		</ul>

		<LandingDownArrow class="my-2" />
		<LandingMark class="justify-self-center lg:col-start-2 lg:row-start-2" />
		<LandingDownArrow class="my-2" />

		<h2
			id="landing-offices"
			class="ml-0.5 w-full text-sm font-semibold app-text-muted lg:col-start-3 lg:row-start-1 lg:max-w-72 lg:self-end lg:justify-self-start"
		>
			{{ t('landing_offices_heading') }}
		</h2>
		<ul
			aria-labelledby="landing-offices"
			class="relative grid w-full auto-rows-fr gap-2.5 lg:col-start-3 lg:row-start-2 lg:max-w-72 lg:justify-self-start"
		>
			<li v-for="office in TAX_OFFICES" :key="office.countryKey" class="flex" data-landing-office>
				<LandingTaxOfficeCard :office="office" />
			</li>
		</ul>
	</div>
</template>
