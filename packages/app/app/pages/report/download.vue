<script setup lang="ts">
import DownloadStep from "~/components/download/DownloadStep.vue";

const { report, startOver } = useReportFlow();
const localePath = useLocalePath();

// Starting over drops everything the flow holds and goes back to upload.
function onRestart() {
	startOver();
	navigateTo(localePath("/report/upload"));
}
</script>

<template>
	<DownloadStep v-if="report !== null" :outputs="report" @restart="onRestart" />
</template>
