<script setup lang="ts">
import AppBadge from "~/components/ui/AppBadge.vue";
import type { TaxOfficeDisplay } from "~/types/taxOffice";

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
			<img :src="office.iconUrl" alt="" class="logo-tile h-7 w-auto shrink-0" />
		</div>
		<span class="text-body text-ink-muted">{{ office.name }}</span>
		<ul class="mt-2 flex flex-wrap gap-1.5">
			<li v-for="key in office.formKeys" :key="key">
				<AppBadge pill>{{ t(key) }}</AppBadge>
			</li>
		</ul>
	</div>
</template>
