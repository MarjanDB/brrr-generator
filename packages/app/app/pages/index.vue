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
  <!-- The landing page: what the site takes in, the way in, and what it makes, centred in the height
       left under the header. Nothing here loads lib or chart.js. -->
  <div class="flex-1 py-10 flex flex-col justify-center gap-11">
    <div class="mx-auto max-w-2xl text-center flex flex-col gap-2.5">
      <h1 class="text-3xl font-extrabold tracking-tight text-balance app-text">{{ t('landing_headline') }}</h1>
      <p class="app-text-muted">{{ t('landing_lede') }}</p>
    </div>
    <LandingFlow />
  </div>
</template>
