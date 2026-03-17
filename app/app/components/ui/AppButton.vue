<script setup lang="ts">
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
