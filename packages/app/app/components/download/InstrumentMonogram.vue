<script setup lang="ts">
import { computed } from "vue";

// The ticker's letters in its own colour. The ticker is written beside it, so it is hidden from screen readers.
const props = defineProps<{
	ticker: string;
	large: boolean;
}>();

const text = computed(() => monogramText(props.ticker));
const tint = computed(() => softIntentClasses[monogramIntent(props.ticker)]);
</script>

<template>
	<span
		class="shrink-0 grid place-items-center font-bold"
		:class="[tint, large ? 'size-10 rounded-lg text-sm' : 'size-8 rounded-md text-xs']"
		aria-hidden="true"
	>
		{{ text }}
	</span>
</template>
