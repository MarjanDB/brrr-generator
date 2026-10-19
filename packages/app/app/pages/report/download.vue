<script setup lang="ts">
import ReportsStep from "~/components/download/ReportsStep.vue";

const { imported, authority, startOver } = useReportFlow();
const localePath = useLocalePath();

// Starting over drops everything the flow holds and goes back to upload.
function onRestart() {
	startOver();
	navigateTo(localePath("/report/upload"));
}
</script>

<template>
	<ReportsStep
		v-if="imported !== null && authority !== null"
		:imported="imported"
		:authority-id="authority"
		@restart="onRestart"
	/>
</template>
