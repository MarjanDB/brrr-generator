<script setup lang="ts">
type BadgeColor = "primary" | "secondary" | "accent" | "neutral" | "success" | "error" | "warning" | "info";
type BadgeVariant = "filled" | "inverse";

const props = withDefaults(defineProps<{
	color?: BadgeColor;
	variant?: BadgeVariant;
}>(), {
	color: "neutral",
	variant: "inverse",
});

// UnoCSS requires full class strings to be present in source for static analysis.
// Dynamic class construction (e.g. `bg-${color}-500`) would be purged at build time.
const classes: Record<BadgeColor, Record<BadgeVariant, string>> = {
	primary:   { filled: "bg-primary-500 text-primary-10",     inverse: "bg-primary-150 text-primary-800"     },
	secondary: { filled: "bg-secondary-500 text-secondary-10", inverse: "bg-secondary-150 text-secondary-800" },
	accent:    { filled: "bg-accent-500 text-accent-10",       inverse: "bg-accent-150 text-accent-800"           },
	neutral:   { filled: "bg-neutral-500 text-neutral-10",     inverse: "bg-neutral-150 text-neutral-800"       },
	success:   { filled: "bg-success-500 text-success-10",     inverse: "bg-success-150 text-success-800"       },
	error:     { filled: "bg-error-500 text-error-10",         inverse: "bg-error-150 text-error-800"               },
	warning:   { filled: "bg-warning-500 text-warning-10",     inverse: "bg-warning-150 text-warning-800"       },
	info:      { filled: "bg-info-500 text-info-10",           inverse: "bg-info-150 text-info-800"                   },
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
