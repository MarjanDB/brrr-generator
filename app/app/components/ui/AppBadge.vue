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
	primary:   { filled: "bg-primary-500 text-primary-10",     inverse: "bg-primary-150 dark:bg-primary-850 text-primary-800 dark:text-primary-200"     },
	secondary: { filled: "bg-secondary-500 text-secondary-10", inverse: "bg-secondary-150 dark:bg-secondary-850 text-secondary-800 dark:text-secondary-200" },
	accent:    { filled: "bg-accent-500 text-accent-10",       inverse: "bg-accent-150 dark:bg-accent-850 text-accent-800 dark:text-accent-200"           },
	neutral:   { filled: "bg-neutral-500 text-neutral-10",     inverse: "bg-neutral-150 dark:bg-neutral-850 text-neutral-800 dark:text-neutral-200"       },
	success:   { filled: "bg-success-500 text-success-10",     inverse: "bg-success-150 dark:bg-success-850 text-success-800 dark:text-success-200"       },
	error:     { filled: "bg-error-500 text-error-10",         inverse: "bg-error-150 dark:bg-error-850 text-error-800 dark:text-error-200"               },
	warning:   { filled: "bg-warning-500 text-warning-10",     inverse: "bg-warning-150 dark:bg-warning-850 text-warning-800 dark:text-warning-200"       },
	info:      { filled: "bg-info-500 text-info-10",           inverse: "bg-info-150 dark:bg-info-850 text-info-800 dark:text-info-200"                   },
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
