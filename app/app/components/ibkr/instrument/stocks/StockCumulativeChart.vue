<script setup lang="ts">
import type { CumulativePoint } from "~/composables/useInstrumentStats";

defineProps<{
  series: CumulativePoint[];
  baseCurrency: string;
  locale: string;
  xMin?: number;
  xMax?: number;
}>();
</script>

<template>
  <CumulativeLineChart :series="series" :base-currency="baseCurrency" :locale="locale" :x-min="xMin" :x-max="xMax" />
</template>
