<script setup lang="ts">
// A finished wizard step, folded to one line: its title and what it holds (the default slot).
defineProps<{
	title: string;
}>();
</script>

<template>
	<div class="card p-3 flex items-center gap-3">
		<span class="i-mdi-check-circle text-icon-confirm text-lg shrink-0" aria-hidden="true" />
		<div class="flex flex-col min-w-0">
			<span class="text-h5">{{ title }}</span>
			<span class="text-body-sm app-text-muted"><slot /></span>
		</div>
	</div>
</template>
