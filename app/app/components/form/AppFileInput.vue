<script setup lang="ts">
import { inject, ref } from "vue";

const props = defineProps<{
	label?: string;
	accept?: string;
	multiple?: boolean;
	disabled?: boolean;
	validate?: (value: FileList | null) => string | null;
}>();

const model = defineModel<FileList | null>({ default: null });

const error = ref<string | null>(null);
const touched = ref(false);

function runValidation(value = model.value): boolean {
	if (!props.validate) return true;
	error.value = props.validate(value);
	return error.value === null;
}

function onChange(e: Event) {
	const input = e.target as HTMLInputElement;
	const files = input.files ?? null;
	model.value = files;
	touched.value = true;
	runValidation(files);
}

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
		<label v-if="label" class="text-label">{{ label }}</label>
		<input
			type="file"
			:accept="accept"
			:multiple="multiple"
			:disabled="disabled"
			:class="error ? 'input-md-error' : 'input-md'"
			class="w-full cursor-pointer"
			@change="onChange"
		/>
		<span v-if="error" class="text-error">{{ error }}</span>
	</div>
</template>
