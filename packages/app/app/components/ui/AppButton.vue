<script setup lang="ts">
import { ButtonVariant, ControlSize } from "~/types/ui";

// The attributes go on the button once: as-child triggers (a dialog's, a popover's) pass their click here.
defineOptions({ inheritAttrs: false });

withDefaults(defineProps<{
	variant?: ButtonVariant;
	size?: ControlSize;
	loading?: boolean;
	disabled?: boolean;
}>(), {
	variant: ButtonVariant.PRIMARY,
	size: ControlSize.MD,
	loading: false,
	disabled: false,
});

// UnoCSS only sees class strings written out in full. A loading button is inert but not faded:
// it is busy, not unavailable.
const variantClasses: Record<ButtonVariant, string> = {
	[ButtonVariant.PRIMARY]: "button-primary",
	[ButtonVariant.SECONDARY]: "button-secondary",
	[ButtonVariant.QUIET]: "button-quiet",
};
</script>

<template>
	<button
		type="button"
		v-bind="$attrs"
		:disabled="disabled || loading"
		:aria-busy="loading || undefined"
		class="relative"
		:class="[variantClasses[variant], controlSizeClasses[size], { 'disabled:opacity-100': loading }]"
	>
		<span v-if="loading" class="i-mdi-loading animate-spin absolute" aria-hidden="true" />
		<span class="inline-flex items-center gap-2" :class="{ invisible: loading }"><slot /></span>
	</button>
</template>
