<script setup lang="ts">
import { RadioGroupItem } from "reka-ui";
import type { TaxAuthorityCard } from "~/utils/taxAuthorityCards";

defineProps<{
	card: TaxAuthorityCard;
}>();

const { t } = useI18n();
</script>

<template>
	<!-- One option of the tax authority radio group in ConfigureStep. -->
	<RadioGroupItem
		:value="card.authorityId"
		class="card card-padding-md flex flex-col items-center gap-3 text-center cursor-pointer transition-colors ring-1 ring-transparent hover:bg-surface-raised active:bg-surface-hover data-[state=checked]:!bg-accent-soft data-[state=checked]:border-accent-edge data-[state=checked]:ring-accent-edge app-focus-ring"
	>
		<img
			:src="card.iconUrl"
			:alt="card.name"
			class="logo-tile h-12 w-auto object-contain"
		/>
		<div class="flex flex-col gap-0.5">
			<span class="text-subheading leading-snug">{{ card.name }}</span>
			<span class="text-meta">{{ t(card.countryKey) }}</span>
		</div>
	</RadioGroupItem>
</template>
