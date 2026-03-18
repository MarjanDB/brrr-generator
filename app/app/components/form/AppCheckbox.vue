<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot } from "reka-ui";
import { inject, ref } from "vue";

const props = defineProps<{
	label?: string;
	disabled?: boolean;
	validate?: (value: boolean) => string | null;
}>();

const model = defineModel<boolean>({ default: false });

const error = ref<string | null>(null);

function runValidation(value = model.value): boolean {
	if (!props.validate) return true;
	error.value = props.validate(value);
	return error.value === null;
}

function onChange(value: boolean | "indeterminate") {
	if (value !== "indeterminate") runValidation(value);
}

const form = inject<{ registerValidator: (fn: () => boolean) => void } | null>("app-form", null);
if (form) {
	form.registerValidator(() => runValidation());
}
</script>

<template>
	<div class="flex flex-col gap-1">
		<label class="flex items-center gap-2 cursor-pointer" :class="{ 'opacity-70 cursor-not-allowed': disabled }">
			<CheckboxRoot
				v-model="model"
				:disabled="disabled"
				:class="error ? 'checkbox-error' : 'checkbox-base'"
				@update:model-value="onChange"
			>
				<CheckboxIndicator class="flex items-center justify-center w-full h-full">
					<span class="i-mdi-check text-white dark:text-stale-950 text-xs" />
				</CheckboxIndicator>
			</CheckboxRoot>
			<span v-if="label" class="text-sm app-text select-none">{{ label }}</span>
		</label>
		<span v-if="error" class="text-error ml-6">{{ error }}</span>
	</div>
</template>
