<script setup lang="ts">
import type { TaxAuthorityCard } from "./taxAuthorityCards";

defineProps<{
	card: TaxAuthorityCard;
	selected: boolean;
}>();

const emit = defineEmits<{
	select: [authorityId: string];
}>();
</script>

<template>
	<button
		type="button"
		class="card card-padding-md flex flex-col items-center gap-3 text-center cursor-pointer transition-colors outline-none ring-2"
		:class="
			selected
				? 'ring-secondary-500'
				: 'ring-transparent hover:ring-stale-300 dark:hover:ring-stale-700'
		"
		@click="emit('select', card.authorityId)"
	>
		<img
			:src="card.iconUrl"
			:alt="card.name"
			class="h-10 w-auto object-contain"
		/>
		<div class="flex flex-col gap-0.5">
			<span class="text-h5 leading-snug">{{ card.name }}</span>
			<span class="text-body-sm app-text-muted">{{ card.country }}</span>
		</div>
	</button>
</template>
