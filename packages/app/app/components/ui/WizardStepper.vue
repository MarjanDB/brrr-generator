<script setup lang="ts">
import {
	StepperIndicator,
	StepperItem,
	StepperRoot,
	StepperSeparator,
	StepperTitle,
	StepperTrigger,
} from "reka-ui";

const props = defineProps<{
	steps: string[];
	currentStep: number; // 1-based
	maxStep: number; // highest step reached (1-based); steps up to this are navigable
}>();

const emit = defineEmits<{
	navigate: [step: number];
}>();

const { t } = useI18n();

function canNavigate(step: number) {
	return step !== props.currentStep && step <= props.maxStep;
}

// reka's Stepper gives the keyboard and ARIA; the look stays the page's own.
function indicatorClass(step: number): string {
	if (step === props.currentStep) {
		return "bg-accent text-accent-on";
	}
	if (step < props.currentStep) {
		return "bg-accent-edge text-ink-inverse";
	}
	return step <= props.maxStep ? "bg-accent-soft text-accent-ink" : "bg-surface-hover text-ink-muted";
}

function onStep(step: number) {
	if (canNavigate(step)) {
		emit("navigate", step);
	}
}
</script>

<template>
	<StepperRoot
		as="nav"
		:model-value="currentStep"
		:linear="false"
		:aria-label="t('wizard_steps_label')"
		class="flex items-center gap-0"
		@update:model-value="(step) => step !== undefined && onStep(step)"
	>
		<StepperItem
			v-for="(label, index) in steps"
			:key="index"
			:step="index + 1"
			:disabled="index + 1 > maxStep"
			class="flex items-center"
			:class="index < steps.length - 1 ? 'flex-1' : ''"
		>
			<StepperTrigger
				class="flex flex-col items-center gap-1 min-w-0 flex-shrink-0 bg-transparent border-0 p-0 rounded-md app-focus-ring"
				:class="canNavigate(index + 1) ? 'group cursor-pointer' : 'cursor-default'"
			>
				<StepperIndicator
					class="size-8 rounded-full flex items-center justify-center text-sm font-semibold transition-[background-color,filter] group-hover:brightness-115 group-active:brightness-90"
					:class="indicatorClass(index + 1)"
				>
					<span v-if="index + 1 < currentStep" class="i-mdi-check text-base" />
					<span v-else>{{ index + 1 }}</span>
				</StepperIndicator>
				<StepperTitle
					as="span"
					class="block text-xs text-center leading-tight"
					:class="index + 1 === currentStep ? 'text-ink font-medium' : 'text-ink-muted group-hover:text-ink'"
				>
					{{ label }}
				</StepperTitle>
			</StepperTrigger>
			<StepperSeparator
				v-if="index < steps.length - 1"
				class="flex-1 h-px mt-[-1rem]"
				:class="index + 1 < currentStep ? 'bg-accent-edge' : 'bg-edge-strong'"
			/>
		</StepperItem>
	</StepperRoot>
</template>
