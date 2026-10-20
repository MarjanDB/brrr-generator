<script setup lang="ts">
import { IssueSeverity } from "~/types/ui";

// A problem as a button that says what it is and opens it: its icon, its sentence, and a chevron
// when it opens a list. The attributes go on the button, so a popover's trigger can pass its own.
defineOptions({ inheritAttrs: false });

withDefaults(defineProps<{
	severity: IssueSeverity;
	// Opens a list in place (a popover), rather than taking you somewhere.
	opens?: boolean;
}>(), {
	opens: false,
});

// UnoCSS only sees class strings written out in full.
const icons: Record<IssueSeverity, string> = {
	[IssueSeverity.DANGER]: "i-mdi-alert-circle-outline",
	[IssueSeverity.WARNING]: "i-mdi-alert-outline",
};
const severityClasses: Record<IssueSeverity, string> = {
	[IssueSeverity.DANGER]: "button-issue-danger",
	[IssueSeverity.WARNING]: "button-issue-warning",
};
</script>

<template>
	<button type="button" v-bind="$attrs" class="control-sm" :class="severityClasses[severity]">
		<span :class="icons[severity]" class="size-4" aria-hidden="true" />
		<slot />
		<span v-if="opens" class="i-mdi-chevron-down size-4" aria-hidden="true" />
	</button>
</template>
