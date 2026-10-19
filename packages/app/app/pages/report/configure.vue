<script setup lang="ts">
import type { TaxAuthorityId } from "@brrr/lib";
import ConfigureStep from "~/components/configure/ConfigureStep.vue";

const { authority, chooseAuthority } = useReportFlow();
const localePath = useLocalePath();

function onChosen(authorityId: TaxAuthorityId) {
	chooseAuthority(authorityId);
	navigateTo(localePath("/report/download"));
}
</script>

<template>
	<ConfigureStep :chosen="authority" @chosen="onChosen" />
</template>
