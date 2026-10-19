<script setup lang="ts">
import LandingBrokerCard from "~/components/landing/LandingBrokerCard.vue";
import LandingConnector from "~/components/landing/LandingConnector.vue";
import LandingDownArrow from "~/components/landing/LandingDownArrow.vue";
import LandingMark from "~/components/landing/LandingMark.vue";
import LandingTaxOfficeCard from "~/components/landing/LandingTaxOfficeCard.vue";
import { LandingSide } from "~/types/landing";

const { t } = useI18n();
</script>

<template>
	<!-- The brokers on the left, the mark in the middle, the tax offices on the right; stacked on a
	     narrow screen. Every card in a column is as tall as the tallest one, and each card draws its
	     own arrow to the mark (LandingConnector), so the server renders them all. Side by side, each
	     column's cards are centred on the mark and its heading sits just above its top card, out of
	     the flow so it can't move the cards; the top padding keeps room for it. -->
	<div
		class="relative mx-auto grid w-full max-w-md grid-cols-1 gap-y-2 lg:max-w-none lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-x-25 lg:pt-7 lg:pb-14"
	>
		<div class="relative flex w-full flex-col gap-2 lg:max-w-72 lg:justify-self-end">
			<h2 id="landing-brokers" class="ml-0.5 text-sm font-semibold app-text-muted lg:absolute lg:bottom-full lg:left-0 lg:mb-2">
				{{ t('landing_brokers_heading') }}
			</h2>
			<ul aria-labelledby="landing-brokers" class="relative grid w-full auto-rows-fr gap-2.5">
				<li v-for="(broker, index) in BROKER_GUIDES" :key="broker.id" class="relative flex">
					<LandingBrokerCard :broker="broker" />
					<LandingConnector :side="LandingSide.BROKER" :index="index" :count="BROKER_GUIDES.length" />
				</li>
			</ul>
		</div>

		<LandingDownArrow class="my-2" />
		<LandingMark class="justify-self-center" />
		<LandingDownArrow class="my-2" />

		<div class="relative flex w-full flex-col gap-2 lg:max-w-72 lg:justify-self-start">
			<h2 id="landing-offices" class="ml-0.5 text-sm font-semibold app-text-muted lg:absolute lg:bottom-full lg:right-0 lg:mr-0.5 lg:mb-2">
				{{ t('landing_offices_heading') }}
			</h2>
			<ul aria-labelledby="landing-offices" class="relative grid w-full auto-rows-fr gap-2.5">
				<li v-for="(office, index) in TAX_OFFICES" :key="office.countryKey" class="relative flex">
					<LandingTaxOfficeCard :office="office" />
					<LandingConnector :side="LandingSide.OFFICE" :index="index" :count="TAX_OFFICES.length" />
				</li>
			</ul>
		</div>
	</div>
</template>
