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
	     own arrow to the mark (LandingConnector), so the server renders them all. -->
	<div
		class="relative mx-auto grid w-full max-w-md grid-cols-1 gap-y-2 lg:max-w-none lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-x-25 lg:pb-14"
	>
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
			<li v-for="(broker, index) in BROKER_GUIDES" :key="broker.id" class="relative flex">
				<LandingBrokerCard :broker="broker" />
				<LandingConnector :side="LandingSide.BROKER" :index="index" :count="BROKER_GUIDES.length" />
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
			<li v-for="(office, index) in TAX_OFFICES" :key="office.countryKey" class="relative flex">
				<LandingTaxOfficeCard :office="office" />
				<LandingConnector :side="LandingSide.OFFICE" :index="index" :count="TAX_OFFICES.length" />
			</li>
		</ul>
	</div>
</template>
