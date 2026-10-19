<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();

const hintId = useId();
</script>

<template>
	<!-- The mark in the middle of the landing page: the one way into the report flow. A stand-in
	     until the site has its own branding. -->
	<div class="relative flex flex-col items-center">
		<!-- Prefetched when pointed at or focused, not when seen: the flow brings lib, which the landing
		     page itself never loads. -->
		<NuxtLink
			:to="localePath('/report/upload')"
			prefetch-on="interaction"
			:aria-label="t('landing_start')"
			:aria-describedby="hintId"
			class="relative grid size-33 place-items-center rounded-[34px] border-2 border-action-edge bg-action text-action-on shadow-md hover:bg-action-hover app-focus-ring"
		>
			<span class="absolute left-3.5 top-1/2 -translate-y-1/2 flex flex-col gap-1.25" aria-hidden="true">
				<span class="block h-0.75 w-2.5 rounded-full bg-action-ink opacity-55" />
				<span class="block h-0.75 w-4 rounded-full bg-action-ink opacity-55" />
				<span class="block h-0.75 w-2 rounded-full bg-action-ink opacity-55" />
			</span>
			<span class="text-[2.1rem] font-black leading-none tracking-tighter" aria-hidden="true">brrr</span>
		</NuxtLink>
		<!-- Beside the arrows the label hangs below the mark, so the mark's middle lines up with the cards'. -->
		<div
			class="mt-2.5 flex flex-col items-center gap-0.5 whitespace-nowrap lg:absolute lg:left-1/2 lg:top-full lg:-translate-x-1/2"
		>
			<span class="text-sm font-semibold app-text" aria-hidden="true">{{ t('landing_start') }}</span>
			<span :id="hintId" class="text-xs app-text-muted">{{ t('landing_start_hint') }}</span>
		</div>
	</div>
</template>
