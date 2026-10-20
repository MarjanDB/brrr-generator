<script setup lang="ts">
import type { NodeLook } from "~/types/provenanceGraph";

// A node's icon on its tint: on the cards and in the popover, and small in the caption and a pair's rows.
defineProps<{
	look: NodeLook;
	small: boolean;
}>();
</script>

<template>
	<span
		class="shrink-0 rounded-sm grid place-items-center"
		:class="[look.tint, small ? 'size-5' : 'size-6']"
	>
		<span :class="[look.icon, small ? 'text-xs' : 'text-sm']" aria-hidden="true" />
	</span>
</template>
