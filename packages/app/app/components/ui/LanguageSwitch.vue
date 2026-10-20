<script setup lang="ts">
import {
	DropdownMenuContent,
	DropdownMenuItemIndicator,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuRoot,
	DropdownMenuTrigger,
} from "reka-ui";
import type { Locale } from "vue-i18n";

// The site's language as its flag, beside the title. A click lists every language by its flag
// and name.
const { locale, locales, setLocale, t } = useI18n();

// Files under public/icons/flags/.
const flags: Record<Locale, string> = {
	en: "/icons/flags/gb.svg",
	sl: "/icons/flags/si.svg",
};

const current = computed(() => locales.value.find((entry) => entry.code === locale.value));

function choose(code: unknown) {
	const next = locales.value.find((entry) => entry.code === code);
	if (next !== undefined) {
		setLocale(next.code);
	}
}
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger
      :aria-label="t('language_label', { language: current?.name ?? locale })"
      class="button-quiet control-icon w-auto px-1"
    >
      <img :src="flags[locale]" alt="" class="h-3.5 w-7 rounded-xs ring-1 ring-edge-strong" />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent align="start" :side-offset="6" class="menu-box">
        <DropdownMenuRadioGroup :model-value="locale" @update:model-value="choose">
          <DropdownMenuRadioItem
            v-for="entry in locales"
            :key="entry.code"
            :value="entry.code"
            class="menu-item"
          >
            <img :src="flags[entry.code]" alt="" class="h-3 w-6 rounded-xs ring-1 ring-edge-strong" />
            <span class="flex-1">{{ entry.name }}</span>
            <DropdownMenuItemIndicator>
              <span class="i-mdi-check text-accent-ink" aria-hidden="true" />
            </DropdownMenuItemIndicator>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
