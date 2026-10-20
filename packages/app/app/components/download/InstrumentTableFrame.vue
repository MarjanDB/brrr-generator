<script setup lang="ts">
import { onMounted, useTemplateRef, watch } from "vue";

// A table under the timeline, scrolling inside its own box between a header and a footer that stay
// put. When the focus moves, the box scrolls to the row marked aria-current, else to the first one
// selected with it (a focused sale's first lot); the page never moves.
const { focus } = useInstrumentCard();
const box = useTemplateRef<HTMLDivElement>("box");

function revealCurrentRow() {
	const container = box.value;
	const row =
		container?.querySelector<HTMLElement>('[aria-current="true"]') ??
		container?.querySelector<HTMLElement>('[data-selected="true"]') ??
		null;
	if (container === null || row === null) {
		return;
	}
	const head = container.querySelector("thead")?.getBoundingClientRect().height ?? 0;
	const foot = container.querySelector("tfoot")?.getBoundingClientRect().height ?? 0;
	const bounds = container.getBoundingClientRect();
	const rowBounds = row.getBoundingClientRect();
	if (rowBounds.top < bounds.top + head) {
		container.scrollTop -= bounds.top + head - rowBounds.top;
	} else if (rowBounds.bottom > bounds.bottom - foot) {
		container.scrollTop += rowBounds.bottom - (bounds.bottom - foot);
	}
}

onMounted(revealCurrentRow);
watch(() => focus.node.value, revealCurrentRow, { flush: "post" });
</script>

<template>
  <div ref="box" class="max-h-[26rem] overflow-y-auto px-4">
    <slot />
  </div>
</template>
