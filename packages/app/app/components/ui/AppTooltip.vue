<script setup lang="ts">
import {
	type ReferenceElement,
	TooltipContent,
	TooltipPortal,
	TooltipRoot,
	TooltipTrigger,
} from "reka-ui";

withDefaults(defineProps<{
	content: string;
	side?: "top" | "right" | "bottom" | "left";
	sideOffset?: number;
	delayDuration?: number;
	// For a tooltip shown by code, over a point of a chart rather than on hovering the slot: the
	// point it hangs on, and whether it shows. It lets the pointer through to the chart under it.
	reference?: ReferenceElement;
	open?: boolean;
}>(), {
	side: "top",
	sideOffset: 6,
	delayDuration: 500,
	reference: undefined,
	open: undefined,
});
</script>

<template>
	<!-- app.vue's TooltipProvider is shared, so moving between neighbouring tooltips skips the delay. -->
	<TooltipRoot :delay-duration="delayDuration" :open="open">
		<TooltipTrigger as-child :reference="reference">
			<slot />
		</TooltipTrigger>
		<TooltipPortal>
			<TooltipContent
				:side="side"
				:side-offset="sideOffset"
				class="tooltip-box"
				:class="{ 'pointer-events-none': reference !== undefined }"
			>
				{{ content }}
			</TooltipContent>
		</TooltipPortal>
	</TooltipRoot>
</template>
