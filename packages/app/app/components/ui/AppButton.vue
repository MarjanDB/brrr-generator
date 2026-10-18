<script setup lang="ts">
import { ColorIntent } from "~/types/ui";

// The attributes go on the button once: as-child triggers (a dialog's, a popover's) pass their click here.
defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{
	color?: ColorIntent;
	// Text on the surface instead of a filled button, for an icon or a quiet action.
	ghost?: boolean;
	loading?: boolean;
	disabled?: boolean;
}>(), {
	color: ColorIntent.ACTION,
	ghost: false,
	loading: false,
	disabled: false,
});

// UnoCSS only sees class strings written out in full.
const filledClasses: Record<ColorIntent, string> = {
	[ColorIntent.ACTION]: "button-filled-action",
	[ColorIntent.ACCENT]: "button-filled-accent",
	[ColorIntent.NEUTRAL]: "button-filled-neutral",
	[ColorIntent.SUCCESS]: "button-filled-success",
	[ColorIntent.WARNING]: "button-filled-warning",
	[ColorIntent.DANGER]: "button-filled-danger",
	[ColorIntent.INFO]: "button-filled-info",
};

const variantClass = computed(() => (props.ghost ? "button-ghost" : filledClasses[props.color]));
</script>

<template>
	<button
		type="button"
		v-bind="$attrs"
		:disabled="disabled || loading"
		class="relative inline-flex items-center justify-center"
		:class="variantClass"
	>
		<span v-if="loading" class="i-mdi-loading animate-spin absolute" aria-hidden="true" />
		<span :class="{ invisible: loading }"><slot /></span>
	</button>
</template>
