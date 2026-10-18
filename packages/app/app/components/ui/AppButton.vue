<script setup lang="ts">
// The attributes go on the button once: as-child triggers (a dialog's, a popover's) pass their click here.
defineOptions({ inheritAttrs: false });

defineProps<{
	loading?: boolean;
}>();
</script>

<template>
	<button type="button" :disabled="loading" v-bind="$attrs" class="relative inline-flex items-center justify-center">
		<span v-if="loading" class="i-mdi-loading animate-spin absolute" />
		<span :class="{ invisible: loading }"><slot /></span>
	</button>
</template>
