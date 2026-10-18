<script setup lang="ts">
import {
	SelectContent,
	SelectItem,
	SelectItemIndicator,
	SelectItemText,
	SelectPortal,
	SelectRoot,
	SelectTrigger,
	SelectViewport,
} from "reka-ui";
import { computed, inject, ref, useId } from "vue";

export interface SelectOption {
	value: string;
	label: string;
}

const props = defineProps<{
	label?: string;
	// The name a screen reader reads when there is no visible label.
	ariaLabel?: string;
	placeholder?: string;
	options: SelectOption[];
	disabled?: boolean;
	validate?: (value: string) => string | null;
}>();

const model = defineModel<string>({ default: "" });

// SelectValue is intentionally not used here. Reka UI's SelectValue relies on
// the selected item being mounted in the DOM to read its label, which causes a
// placeholder flash when switching options (the old item unmounts before the new
// one mounts). Computing the label directly from the model avoids this entirely.
const selectedLabel = computed(
	() => props.options.find((o) => o.value === model.value)?.label ?? null,
);

const id = useId();
const error = ref<string | null>(null);
const touched = ref(false);

function runValidation(value = model.value): boolean {
	if (!props.validate) return true;
	error.value = props.validate(value);
	return error.value === null;
}

function onChange(value: string) {
	touched.value = true;
	runValidation(value);
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
		<label v-if="label" :for="id" class="text-label">{{ label }}</label>
		<SelectRoot v-model="model" :disabled="disabled" @update:model-value="onChange">
			<SelectTrigger
				:id="id"
				:aria-label="label === undefined ? ariaLabel : undefined"
				:class="[
					error ? 'input-md-error' : 'input-md',
					'w-full flex items-center justify-between gap-2',
				]"
			>
				<span :class="selectedLabel ? '' : 'text-ink-muted'">
					{{ selectedLabel ?? placeholder ?? 'Select...' }}
				</span>
				<span class="i-mdi-chevron-down text-ink-muted shrink-0" />
			</SelectTrigger>
			<SelectPortal>
				<SelectContent
					position="popper"
					:side-offset="4"
					class="z-50 min-w-[var(--reka-select-trigger-width)] bg-surface border app-border-strong rounded-md shadow-md overflow-hidden"
				>
					<SelectViewport class="p-1">
						<SelectItem
							v-for="opt in options"
							:key="opt.value"
							:value="opt.value"
							class="flex items-center gap-2 px-3 py-2 text-base app-text rounded-sm cursor-pointer select-none outline-none hover:bg-surface-hover data-[highlighted]:bg-surface-hover data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed"
						>
							<SelectItemIndicator>
								<span class="i-mdi-check text-icon-confirm" />
							</SelectItemIndicator>
							<SelectItemText>{{ opt.label }}</SelectItemText>
						</SelectItem>
					</SelectViewport>
				</SelectContent>
			</SelectPortal>
		</SelectRoot>
		<span v-if="error" class="text-error">{{ error }}</span>
	</div>
</template>
