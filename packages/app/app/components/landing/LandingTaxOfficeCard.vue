<script setup lang="ts">
import AppBadge from "~/components/ui/AppBadge.vue";
import type { TaxOfficeDisplay } from "~/types/taxOffice";
import { ColorIntent } from "~/types/ui";

defineProps<{
	office: TaxOfficeDisplay;
}>();

const { t } = useI18n();
</script>

<template>
	<!-- A tax office the site makes forms for, and the forms it takes. Information only. -->
	<div class="card card-padding-md flex h-full w-full flex-col gap-0.5">
		<div class="flex items-center justify-between gap-2">
			<span class="text-base font-semibold app-text">{{ t(office.countryKey) }}</span>
			<img :src="office.iconUrl" alt="" class="h-5 w-auto shrink-0" />
		</div>
		<span class="text-body-sm">{{ office.name }}</span>
		<div class="mt-2 flex flex-wrap gap-1.5">
			<AppBadge v-for="key in office.formKeys" :key="key" :color="ColorIntent.ACCENT">
				{{ t(key) }}
			</AppBadge>
		</div>
	</div>
</template>
