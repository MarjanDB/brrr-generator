<script setup lang="ts">
import { computed } from "vue";
import { ColorIntent } from "~/types/ui";

// The ticker's letters in its own colour, or a "?" when the company behind it is unknown. The ticker
// is written beside it, so it is hidden from screen readers.
const props = defineProps<{
	ticker: string;
	large: boolean;
	unknown: boolean;
}>();

const text = computed(() => (props.unknown ? "?" : NodeLooks.monogramText(props.ticker)));
// An unknown company is drawn dashed, in the warning colour.
const tint = computed(() =>
	props.unknown
		? [
				IntentClasses.soft[ColorIntent.WARNING],
				IntentClasses.edge[ColorIntent.WARNING],
				"border border-dashed",
			]
		: IntentClasses.soft[NodeLooks.monogramIntent(props.ticker)],
);
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
