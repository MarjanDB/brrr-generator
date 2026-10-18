<script setup lang="ts">
import {
	TooltipContent,
	TooltipPortal,
	TooltipProvider,
	TooltipRoot,
	TooltipTrigger,
} from "reka-ui";

withDefaults(defineProps<{
	content: string;
	side?: "top" | "right" | "bottom" | "left";
	sideOffset?: number;
	delayDuration?: number;
}>(), {
	side: "top",
	sideOffset: 6,
	delayDuration: 500,
});
</script>

<template>
	<TooltipProvider :delay-duration="delayDuration">
		<TooltipRoot>
			<TooltipTrigger as-child>
				<slot />
			</TooltipTrigger>
			<TooltipPortal>
				<TooltipContent
					:side="side"
					:side-offset="sideOffset"
					class="tooltip-box"
				>
					{{ content }}
				</TooltipContent>
			</TooltipPortal>
		</TooltipRoot>
	</TooltipProvider>
</template>
