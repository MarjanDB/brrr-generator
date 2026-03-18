<script setup lang="ts">
defineProps<{
  steps: string[];
  currentStep: number; // 1-based
}>();
</script>

<template>
  <nav aria-label="Wizard steps" class="flex items-center gap-0">
    <template v-for="(label, index) in steps" :key="index">
      <div class="flex flex-col items-center gap-1 min-w-0 flex-shrink-0" :aria-current="index + 1 === currentStep ? 'step' : undefined">
        <div
          class="size-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors"
          :class="
            index + 1 < currentStep
              ? 'bg-secondary-500 text-secondary-10'
              : index + 1 === currentStep
                ? 'bg-secondary-300 dark:bg-secondary-700 text-secondary-990 dark:text-secondary-10'
                : 'bg-stale-200 dark:bg-stale-800 text-stale-500'
          "
        >
          <span v-if="index + 1 < currentStep" class="i-mdi-check text-base" />
          <span v-else>{{ index + 1 }}</span>
        </div>
        <span
          class="text-xs text-center leading-tight"
          :class="index + 1 === currentStep ? 'app-text font-medium' : 'app-text-muted'"
        >
          {{ label }}
        </span>
      </div>
      <div
        v-if="index < steps.length - 1"
        class="flex-1 h-px mt-[-1rem]"
        :class="index + 1 < currentStep ? 'bg-secondary-500' : 'bg-stale-250 dark:bg-stale-750'"
      />
    </template>
  </nav>
</template>
