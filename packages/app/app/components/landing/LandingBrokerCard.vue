<script setup lang="ts">
import type { BrokerGuide } from "~/types/guide";

defineProps<{
	broker: BrokerGuide;
}>();

const { t } = useI18n();
</script>

<template>
	<!-- A broker the site reads exports from, as the landing page shows it: information only. Its
	     export guide is in the upload step. -->
	<div class="card card-padding-md flex h-full w-full items-center gap-3">
		<img :src="broker.iconUrl" alt="" class="logo-tile h-10 w-10 shrink-0" />
		<div class="flex min-w-0 flex-col gap-0.5">
			<span class="text-base font-semibold app-text">{{ t(broker.nameKey) }}</span>
			<span class="text-body text-ink-muted">{{ t(broker.taglineKey) }}</span>
		</div>
	</div>
</template>
