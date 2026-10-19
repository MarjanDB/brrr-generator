<script setup lang="ts">
import type { ImportResult } from "@brrr/lib";
import UploadStep from "~/components/upload/UploadStep.vue";

const { acceptImport } = useReportFlow();
const localePath = useLocalePath();

function onProcessed(imported: ImportResult) {
	acceptImport(imported);
	navigateTo(localePath("/report/review"));
}
</script>

<template>
	<UploadStep @processed="onProcessed" />
</template>
