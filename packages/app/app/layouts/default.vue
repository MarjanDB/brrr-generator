<script setup lang="ts">
const { locale, setLocale, locales, t } = useI18n();
const localePath = useLocalePath();

const localeOptions = computed(() =>
  locales.value.map((l) => ({ value: l.code, label: l.name ?? l.code })),
);
const currentLocale = computed({
  get: () => locale.value,
  set: (value) => {
    const next = locales.value.find((l) => l.code === value);
    if (next !== undefined) {
      setLocale(next.code);
    }
  },
});
</script>

<template>
  <main class="app-container">
    <!-- Decoration behind the content below it (relative, so it paints over). -->
    <CornerDrawing />
    <div class="relative px-4 sm:px-8 min-h-screen flex flex-col">
      <!-- The site's header, on the landing page and every page of the report flow. -->
      <header class="pt-6 flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-3">
          <NuxtLink :to="localePath('/')" class="text-lg font-bold app-text rounded-sm app-focus-ring">
            {{ t('app_title') }}
          </NuxtLink>
          <!-- biome-ignore lint/a11y/useAnchorContent: icon-only link, named by its aria-label -->
          <a
            href="https://github.com/MarjanDB/brrr-generator"
            target="_blank"
            rel="noopener"
            :aria-label="t('github_link_label')"
            class="i-mdi-github text-2xl app-text-muted hover:app-text transition-colors"
          />
        </div>
        <AppSelect v-model="currentLocale" :options="localeOptions" :aria-label="t('language_label')" />
      </header>
      <slot />
    </div>
  </main>
</template>
