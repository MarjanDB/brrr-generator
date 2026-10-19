<script setup lang="ts">
import ReviewStep from "~/components/review/ReviewStep.vue";

const { imported, confirmReview } = useReportFlow();
const localePath = useLocalePath();

function onConfirmed() {
	confirmReview();
	navigateTo(localePath("/report/configure"));
}
</script>

<template>
	<ReviewStep
		v-if="imported !== null"
		:financial-events="imported.events"
		:provenance="imported.provenance"
		@confirmed="onConfirmed"
	/>
</template>
