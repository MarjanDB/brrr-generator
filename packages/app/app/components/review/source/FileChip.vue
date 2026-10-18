<script setup lang="ts">
import { BadgeVariant, ColorIntent } from "~/types/ui";

defineProps<{
  name: string;
}>();
</script>

<template>
  <AppBadge :color="ColorIntent.NEUTRAL" :variant="BadgeVariant.SOFT" class="gap-1 max-w-full">
    <span class="i-mdi-file-document-outline shrink-0" />
    <span class="font-mono break-all">{{ name }}</span>
  </AppBadge>
</template>
