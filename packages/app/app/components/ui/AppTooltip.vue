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
					class="z-50 px-2.5 py-1.5 rounded-md text-xs app-text bg-stale-900 dark:bg-stale-100 text-stale-50 dark:text-stale-950 shadow-md select-none"
				>
					{{ content }}
				</TooltipContent>
			</TooltipPortal>
		</TooltipRoot>
	</TooltipProvider>
</template>
