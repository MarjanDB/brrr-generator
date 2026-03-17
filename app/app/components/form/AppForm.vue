<script setup lang="ts">
import { provide, ref } from "vue";

export type FieldValidator = () => boolean;

const validators = ref<Set<FieldValidator>>(new Set());

function registerValidator(fn: FieldValidator) {
	validators.value.add(fn);
	onUnmounted(() => validators.value.delete(fn));
}

provide("app-form", { registerValidator });

const emit = defineEmits<{
	submit: [valid: boolean];
}>();

function handleSubmit(e: Event) {
	e.preventDefault();
	const valid = [...validators.value].map((fn) => fn()).every(Boolean);
	emit("submit", valid);
}
</script>

<template>
	<form novalidate @submit="handleSubmit">
		<slot />
	</form>
</template>
