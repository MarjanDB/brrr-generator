<script setup lang="ts">
import { inject, onUnmounted, ref } from "vue";

const props = defineProps<{
	label?: string;
	placeholder?: string;
	disabled?: boolean;
	validate?: (value: string) => string | null;
}>();

const model = defineModel<string>({ default: "" });

const error = ref<string | null>(null);
const touched = ref(false);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function runValidation(): boolean {
	if (!props.validate) return true;
	error.value = props.validate(model.value);
	return error.value === null;
}

function onInput() {
	if (!touched.value) return;
	if (debounceTimer) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(runValidation, 600);
}

function onBlur() {
	touched.value = true;
	if (debounceTimer) clearTimeout(debounceTimer);
	runValidation();
}

onUnmounted(() => {
	if (debounceTimer) clearTimeout(debounceTimer);
});

const form = inject<{ registerValidator: (fn: () => boolean) => void } | null>("app-form", null);
if (form) {
	form.registerValidator(() => {
		touched.value = true;
		return runValidation();
	});
}
</script>

<template>
	<div class="flex flex-col gap-1">
		<label v-if="label" class="text-sm font-medium app-text">{{ label }}</label>
		<input
			v-model="model"
			type="text"
			:placeholder="placeholder"
			:disabled="disabled"
			:class="error ? 'input-md-error' : 'input-md'"
			class="w-full"
			@input="onInput"
			@blur="onBlur"
		/>
		<span v-if="error" class="text-xs text-error-600 dark:text-error-400">{{ error }}</span>
	</div>
</template>
