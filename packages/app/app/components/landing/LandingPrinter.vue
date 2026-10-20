<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();

// The forms coming out of the right slot, fanned around the slot's middle line.
const forms = [
	{ x: 244, y: 58, angle: -8 },
	{ x: 252, y: 73, angle: 0 },
	{ x: 260, y: 89, angle: 8 },
];
</script>

<template>
	<!-- The money printer in the middle of the landing page, the one way into the report flow: the
	     broker's export goes in on the left and plain forms come out on the right. The box is centred
	     on the printer's body, not on the paper, so the body lines up with the headline, its label and
	     the cards' middles; an illustration that later takes its place gets the same box. -->
	<div class="relative flex flex-col items-center">
		<!-- Prefetched when pointed at or focused, not when seen: the flow brings lib, which the landing
		     page itself never loads. -->
		<NuxtLink
			:to="localePath('/report/upload')"
			prefetch-on="interaction"
			:aria-label="t('landing_start')"
			class="group block rounded-md app-focus-ring"
		>
			<svg class="block h-auto w-65 overflow-visible" viewBox="-41 26 372 134" aria-hidden="true">
				<!-- The export going in, behind the body, level with the slot's middle. -->
				<g transform="translate(-40,71)">
					<rect width="94" height="46" rx="3" stroke-width="0.8" class="fill-surface-inverse stroke-ink-muted" />
					<path d="M0,13 L13,0 L0,0 Z" class="fill-page" />
					<path d="M0,13 L13,13 L13,0 Z" class="fill-ink-muted opacity-40" />
					<text x="18" y="21" font-size="12" font-weight="800" class="fill-ink-inverse">XML</text>
					<g class="fill-ink-muted opacity-40">
						<rect x="50" y="12" width="28" height="3" rx="1.5" />
						<rect x="50" y="19" width="20" height="3" rx="1.5" />
						<rect x="10" y="29" width="66" height="3" rx="1.5" />
						<rect x="10" y="36" width="50" height="3" rx="1.5" />
					</g>
				</g>
				<!-- The printer: the tray on top and the legs below sit behind its body. -->
				<g
					stroke-width="2"
					class="fill-action stroke-action-edge transition-colors group-hover:fill-action-hover group-active:fill-action-pressed"
					style="filter: drop-shadow(0 12px 26px color-mix(in srgb, var(--color-action-edge) 32%, transparent))"
				>
					<rect x="88" y="30" width="114" height="18" rx="6" />
					<rect x="74" y="130" width="24" height="21" rx="4" />
					<rect x="192" y="130" width="24" height="21" rx="4" />
					<rect x="50" y="43" width="190" height="100" rx="20" />
				</g>
				<g class="fill-page">
					<rect x="46" y="66" width="9" height="56" rx="3" />
					<rect x="235" y="66" width="9" height="56" rx="3" />
				</g>
				<g stroke-width="3" stroke-linecap="round" class="stroke-action-ink opacity-60">
					<path d="M70,82 h10" />
					<path d="M70,93 h16" />
					<path d="M70,104 h8" />
				</g>
				<text x="158" y="107" text-anchor="middle" font-size="38" font-weight="900" letter-spacing="-2" class="fill-action-on">brrr</text>
				<!-- It shakes: arcs off its body's two top corners. -->
				<g fill="none" stroke-width="2.2" stroke-linecap="round" class="stroke-action-edge opacity-80">
					<path d="M60.1,35.7 A29,29 0 0 0 44.9,48.5" />
					<path d="M57,27.3 A38,38 0 0 0 37.1,44" />
					<path d="M229.9,35.7 A29,29 0 0 1 245.1,48.5" />
					<path d="M233,27.3 A38,38 0 0 1 252.9,44" />
				</g>
				<!-- The forms, any country's: a title, a field, two lines and a small table. -->
				<g v-for="form in forms" :key="form.y" :transform="`translate(${form.x},${form.y}) rotate(${form.angle}) scale(0.78)`">
					<rect width="78" height="54" rx="3" stroke-width="0.8" class="fill-surface-inverse stroke-ink-muted" />
					<rect x="8" y="8" width="30" height="5" rx="1.5" class="fill-ink-muted" />
					<rect x="56" y="6.5" width="14" height="8" rx="1" fill="none" stroke-width="0.9" class="stroke-ink-muted" />
					<g class="fill-ink-muted opacity-40">
						<rect x="8" y="19" width="58" height="3" rx="1.5" />
						<rect x="8" y="26" width="46" height="3" rx="1.5" />
					</g>
					<g fill="none" stroke-width="0.9" class="stroke-ink-muted opacity-50">
						<rect x="8" y="34" width="62" height="13" rx="1" />
						<path d="M8,40.5 H70 M30,34 V47 M50,34 V47" />
					</g>
				</g>
			</svg>
		</NuxtLink>
		<!-- Beside the cards the label hangs below the printer, so the printer's middle lines up with the
		     cards'. The link's own name says the same. -->
		<span
			class="mt-3 whitespace-nowrap text-sm font-semibold app-text lg:absolute lg:left-1/2 lg:top-full lg:-translate-x-1/2"
			aria-hidden="true"
		>
			{{ t('landing_start') }}
		</span>
	</div>
</template>
