<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();
</script>

<template>
  <main class="app-container">
    <!-- Decoration behind the content below it (relative, so it paints over). -->
    <CornerDrawing />
    <!-- --header-height is the header's height, so a page can centre itself in the whole window. -->
    <div class="relative px-4 sm:px-8 min-h-screen flex flex-col [--header-height:4.125rem]">
      <!-- The site's header, on the landing page and every page of the report flow. -->
      <header class="min-h-[var(--header-height)] pt-6 flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-2">
          <NuxtLink :to="localePath('/')" class="mr-1 text-lg font-bold rounded-sm app-focus-ring">
            {{ t('app_title') }}
          </NuxtLink>
          <!-- biome-ignore lint/a11y/useAnchorContent: icon-only link, named by its aria-label -->
          <a
            href="https://github.com/MarjanDB/brrr-generator"
            target="_blank"
            rel="noopener"
            :aria-label="t('github_link_label')"
            class="button-quiet control-icon"
          >
            <span class="i-mdi-github text-2xl" aria-hidden="true" />
          </a>
          <LanguageSwitch />
        </div>
      </header>
      <slot />
    </div>
  </main>
</template>
