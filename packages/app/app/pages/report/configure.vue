<script setup lang="ts">
import ConfigureStep from "~/components/configure/ConfigureStep.vue";
import type { GeneratedOutputs } from "~/types/generatedOutputs";

const { imported, acceptReport } = useReportFlow();
const localePath = useLocalePath();

function onGenerated(report: GeneratedOutputs) {
	acceptReport(report);
	navigateTo(localePath("/report/download"));
}
</script>

<template>
	<ConfigureStep
		v-if="imported !== null"
		:imported="imported"
		@generated="onGenerated"
	/>
</template>
