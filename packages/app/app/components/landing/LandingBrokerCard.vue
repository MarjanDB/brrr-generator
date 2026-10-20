<script setup lang="ts">
import AppBadge from "~/components/ui/AppBadge.vue";
import type { BrokerGuide } from "~/types/guide";

defineProps<{
	broker: BrokerGuide;
}>();

const { t } = useI18n();
</script>

<template>
	<!-- A broker the site reads exports from, as the landing page shows it: information only. Its
	     export guide is in the upload step. Laid out like a tax office's card, which lists the forms
	     it takes where this lists what the site reads. -->
	<div class="card card-padding-md flex h-full w-full flex-col gap-0.5">
		<div class="flex items-center justify-between gap-2">
			<span class="text-base font-semibold app-text">{{ t(broker.nameKey) }}</span>
			<img :src="broker.iconUrl" alt="" class="logo-tile h-7 w-7 shrink-0" />
		</div>
		<span class="text-body text-ink-muted">{{ t(broker.taglineKey) }}</span>
		<ul class="mt-2 flex flex-wrap gap-1.5">
			<li v-for="key in broker.readKeys" :key="key">
				<AppBadge pill>{{ t(key) }}</AppBadge>
			</li>
		</ul>
	</div>
</template>
