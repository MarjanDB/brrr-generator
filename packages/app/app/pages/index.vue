<script setup lang="ts">
import LandingFlow from "~/components/landing/LandingFlow.vue";

const { t } = useI18n();

useSeoMeta({
  title: () => t("app_title"),
  description: () => t("site_description"),
  ogTitle: () => t("app_title"),
  ogDescription: () => t("site_description"),
});
</script>

<template>
  <!-- The landing page: what the site takes in, the way in, and what it makes, centred in the window:
       the bottom padding matches the header above, so the space it centres in is the window's middle.
       On a phone it is taller than the screen anyway, so it skips that. A glow in the page's colour
       follows everything it draws (text, cards, the printer), so where the corner drawing or its
       chart runs underneath, the content keeps its contrast. Nothing here loads lib or chart.js. -->
  <div
    class="flex-1 py-10 sm:pb-[calc(2.5rem+var(--header-height))] flex flex-col justify-center gap-4 [filter:drop-shadow(0_0_8px_var(--color-page))_drop-shadow(0_0_24px_var(--color-page))_drop-shadow(0_0_48px_var(--color-page))]"
  >
    <div class="mx-auto max-w-2xl text-center flex flex-col gap-2.5">
      <h1 class="text-3xl font-extrabold tracking-tight text-balance app-text">{{ t('landing_headline') }}</h1>
      <p class="app-text-muted">{{ t('landing_lede') }}</p>
    </div>
    <LandingFlow />
  </div>
</template>
