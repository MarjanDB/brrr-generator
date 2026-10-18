<script setup lang="ts">
const props = defineProps<{
	steps: string[];
	currentStep: number; // 1-based
	maxStep: number; // highest step reached (1-based); steps up to this are navigable
}>();

const emit = defineEmits<{
	navigate: [step: number];
}>();

function canNavigate(step: number) {
	return step !== props.currentStep && step <= props.maxStep;
}
</script>

<template>
	<nav aria-label="Wizard steps" class="flex items-center gap-0">
		<template v-for="(label, index) in steps" :key="index">
			<button type="button"
				class="flex flex-col items-center gap-1 min-w-0 flex-shrink-0 bg-transparent border-0 p-0"
				:aria-current="index + 1 === currentStep ? 'step' : undefined" :disabled="!canNavigate(index + 1)"
				:class="canNavigate(index + 1) ? 'cursor-pointer' : 'cursor-default'"
				@click="canNavigate(index + 1) && emit('navigate', index + 1)">
				<div class="size-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
					:class="index + 1 === currentStep
						? 'bg-accent text-accent-on'
						: index + 1 < currentStep
							? 'bg-accent-edge text-ink-inverse'
							: index + 1 <= maxStep
								? 'bg-accent-soft text-accent-ink'
								: 'bg-surface-hover text-ink-muted'
						">
					<span v-if="index + 1 < currentStep" class="i-mdi-check text-base" />
					<span v-else>{{ index + 1 }}</span>
				</div>
				<span class="block text-xs text-center leading-tight"
					:class="index + 1 === currentStep ? 'app-text font-medium' : 'app-text-muted'">
					{{ label }}
				</span>
			</button>
			<div v-if="index < steps.length - 1" class="flex-1 h-px mt-[-1rem]"
				:class="index + 1 < currentStep ? 'bg-accent-edge' : 'bg-edge-strong'" />
		</template>
	</nav>
</template>
