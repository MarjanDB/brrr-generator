<script setup lang="ts">
import {
	PopoverAnchor,
	PopoverContent,
	type PopoverContentProps,
	PopoverPortal,
	PopoverRoot,
	PopoverTrigger,
	type ReferenceElement,
	TooltipContent,
	TooltipPortal,
	TooltipRoot,
	TooltipTrigger,
} from "reka-ui";

// Attributes (a width, an aria-label) go to the popover's box, not to its root.
defineOptions({ inheritAttrs: false });

withDefaults(
	defineProps<{
		side?: PopoverContentProps["side"];
		align?: PopoverContentProps["align"];
		// The element it hangs on when it is opened by code rather than by the trigger slot.
		reference?: ReferenceElement;
		// The trigger's tooltip, for a trigger that shows only an icon or a count.
		tooltip?: string;
	}>(),
	{ side: "bottom", align: "start", reference: undefined, tooltip: undefined },
);

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
	escapeKeyDown: [event: KeyboardEvent];
}>();
</script>

<template>
	<PopoverRoot v-model:open="open">
		<!-- A trigger inside a tooltip would hang the popover on the tooltip's anchor, so the popover
		     gets an anchor of its own around both. -->
		<PopoverAnchor v-if="$slots.trigger && tooltip" as="span" class="inline-flex">
			<TooltipRoot>
				<TooltipTrigger as-child>
					<PopoverTrigger as-child>
						<slot name="trigger" />
					</PopoverTrigger>
				</TooltipTrigger>
				<TooltipPortal>
					<TooltipContent side="top" :side-offset="6" class="tooltip-box">
						{{ tooltip }}
					</TooltipContent>
				</TooltipPortal>
			</TooltipRoot>
		</PopoverAnchor>
		<PopoverTrigger v-else-if="$slots.trigger" as-child>
			<slot name="trigger" />
		</PopoverTrigger>
		<PopoverAnchor v-if="reference !== undefined" :reference="reference" />
		<PopoverPortal>
			<PopoverContent
				v-bind="$attrs"
				:side="side"
				:align="align"
				:side-offset="6"
				:collision-padding="16"
				class="z-50 card p-3 shadow-md max-w-[calc(100vw-2rem)] max-h-[min(28rem,70vh)] overflow-y-auto"
				@escape-key-down="(event) => emit('escapeKeyDown', event)"
			>
				<slot />
			</PopoverContent>
		</PopoverPortal>
	</PopoverRoot>
</template>
