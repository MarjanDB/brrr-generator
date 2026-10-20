<script setup lang="ts">
import LandingBrokerCard from "~/components/landing/LandingBrokerCard.vue";
import LandingPrinter from "~/components/landing/LandingPrinter.vue";
import LandingTaxOfficeCard from "~/components/landing/LandingTaxOfficeCard.vue";

const { t } = useI18n();
</script>

<template>
	<!-- The brokers on the left, the printer in the middle, the tax offices on the right; stacked on a
	     narrow screen. The paper going into and out of the printer shows the way, so there are no
	     arrows, and the gaps either side are open. Every card in a column is as tall as the tallest
	     one. Side by side, each column's cards are centred on the printer and its heading sits just
	     above its top card, out of the flow so it can't move the cards; the top padding keeps room for
	     it. -->
	<div
		class="relative mx-auto grid w-full max-w-md grid-cols-1 gap-y-2 lg:max-w-none lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-x-9 lg:pt-7 lg:pb-8"
	>
		<div class="relative flex w-full flex-col gap-2 lg:max-w-72 lg:justify-self-end">
			<h2 id="landing-brokers" class="ml-0.5 text-sm font-semibold app-text-muted lg:absolute lg:bottom-full lg:left-0 lg:mb-2">
				{{ t('landing_brokers_heading') }}
			</h2>
			<ul aria-labelledby="landing-brokers" class="grid w-full auto-rows-fr gap-2.5">
				<li v-for="broker in BrokerGuides.all" :key="broker.id" class="flex">
					<LandingBrokerCard :broker="broker" />
				</li>
			</ul>
		</div>

		<LandingPrinter class="my-4 justify-self-center lg:my-0" />

		<div class="relative flex w-full flex-col gap-2 lg:max-w-72 lg:justify-self-start">
			<h2 id="landing-offices" class="ml-0.5 text-sm font-semibold app-text-muted lg:absolute lg:bottom-full lg:right-0 lg:mr-0.5 lg:mb-2">
				{{ t('landing_offices_heading') }}
			</h2>
			<ul aria-labelledby="landing-offices" class="grid w-full auto-rows-fr gap-2.5">
				<li v-for="office in TaxOffices.all" :key="office.countryKey" class="flex">
					<LandingTaxOfficeCard :office="office" />
				</li>
			</ul>
		</div>
	</div>
</template>
