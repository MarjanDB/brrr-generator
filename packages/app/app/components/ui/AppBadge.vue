<script setup lang="ts">
import { BadgeVariant, ColorIntent } from "~/types/ui";

const props = withDefaults(defineProps<{
	color?: ColorIntent;
	variant?: BadgeVariant;
}>(), {
	color: ColorIntent.NEUTRAL,
	variant: BadgeVariant.SOFT,
});

// UnoCSS requires full class strings to be present in source for static analysis.
// Dynamic class construction (e.g. `bg-${color}`) would be purged at build time.
const classes: Record<ColorIntent, Record<BadgeVariant, string>> = {
	[ColorIntent.ACTION]:  { [BadgeVariant.SOLID]: "bg-action text-action-on",   [BadgeVariant.SOFT]: "bg-action-soft text-action-ink"   },
	[ColorIntent.ACCENT]:  { [BadgeVariant.SOLID]: "bg-accent text-accent-on",   [BadgeVariant.SOFT]: "bg-accent-soft text-accent-ink"   },
	[ColorIntent.NEUTRAL]: { [BadgeVariant.SOLID]: "bg-neutral text-neutral-on", [BadgeVariant.SOFT]: "bg-neutral-soft text-neutral-ink" },
	[ColorIntent.SUCCESS]: { [BadgeVariant.SOLID]: "bg-success text-success-on", [BadgeVariant.SOFT]: "bg-success-soft text-success-ink" },
	[ColorIntent.WARNING]: { [BadgeVariant.SOLID]: "bg-warning text-warning-on", [BadgeVariant.SOFT]: "bg-warning-soft text-warning-ink" },
	[ColorIntent.DANGER]:  { [BadgeVariant.SOLID]: "bg-danger text-danger-on",   [BadgeVariant.SOFT]: "bg-danger-soft text-danger-ink"   },
	[ColorIntent.INFO]:    { [BadgeVariant.SOLID]: "bg-info text-info-on",       [BadgeVariant.SOFT]: "bg-info-soft text-info-ink"       },
};
</script>

<template>
	<span
		class="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium"
		:class="classes[props.color][props.variant]"
	>
		<slot />
	</span>
</template>
