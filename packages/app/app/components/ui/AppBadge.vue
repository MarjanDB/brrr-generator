<script setup lang="ts">
import { BadgeVariant, ColorIntent } from "~/types/ui";

const props = withDefaults(defineProps<{
	color?: ColorIntent;
	variant?: BadgeVariant;
	// Fully rounded and outlined in the intent's edge: a chip rather than a count.
	pill?: boolean;
}>(), {
	color: ColorIntent.NEUTRAL,
	variant: BadgeVariant.SOFT,
	pill: false,
});

const classes = computed(() => [
	props.variant === BadgeVariant.SOLID
		? solidIntentClasses[props.color]
		: softIntentClasses[props.color],
	props.pill ? `rounded-full border ${edgeIntentClasses[props.color]}` : "rounded-sm",
]);
</script>

<template>
	<span
		class="inline-flex items-center px-2 py-0.5 text-xs font-medium"
		:class="classes"
	>
		<slot />
	</span>
</template>
