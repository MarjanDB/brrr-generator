<script setup lang="ts">
import { ColorIntent } from "~/types/ui";

// A short tinted line that says something about what is around it: a warning, a left-out item.
withDefaults(defineProps<{
	color?: ColorIntent;
	// The element it renders as, such as li inside a list.
	as?: string;
}>(), {
	color: ColorIntent.NEUTRAL,
	as: "div",
});
</script>

<template>
	<component :is="as" class="rounded-sm px-2 py-1 text-sm" :class="softIntentClasses[color]">
		<slot />
	</component>
</template>
