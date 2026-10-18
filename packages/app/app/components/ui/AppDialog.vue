<script setup lang="ts">
import {
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogOverlay,
	DialogPortal,
	DialogRoot,
	DialogTitle,
	DialogTrigger,
} from "reka-ui";
import { DialogSize } from "~/types/ui";

const props = withDefaults(
	defineProps<{
		title: string;
		// A line under the title, read out with it. The description slot replaces the text.
		description?: string;
		size?: DialogSize;
		// Where focus goes back to on close, for a dialog opened by code rather than by the trigger slot.
		returnFocus?: HTMLElement | null;
	}>(),
	{ description: undefined, size: DialogSize.MEDIUM, returnFocus: null },
);

const open = defineModel<boolean>("open", { default: false });

const { t } = useI18n();
const slots = useSlots();

// UnoCSS only sees class strings written out in full.
const sizeClasses: Record<DialogSize, string> = {
	[DialogSize.MEDIUM]: "w-[min(90vw,640px)]",
	[DialogSize.FULL]: "w-[calc(100vw-2rem)] sm:w-[calc(100vw-4rem)]",
};

const hasDescription = computed(() => props.description !== undefined || slots.description !== undefined);

function onCloseAutoFocus(event: Event) {
	if (props.returnFocus !== null) {
		event.preventDefault();
		props.returnFocus.focus();
	}
}
</script>

<template>
	<DialogRoot v-model:open="open">
		<DialogTrigger v-if="$slots.trigger" as-child>
			<slot name="trigger" />
		</DialogTrigger>
		<DialogPortal>
			<DialogOverlay class="fixed inset-0 z-50 app-overlay" />
			<!-- Without a description, aria-describedby is left off rather than pointing at nothing. -->
			<DialogContent
				v-bind="hasDescription ? {} : { 'aria-describedby': undefined }"
				class="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[85vh] flex flex-col app-surface-overlay border app-border-strong rounded-lg shadow-xl overflow-hidden"
				:class="sizeClasses[size]"
				@close-auto-focus="onCloseAutoFocus"
			>
				<div class="flex items-start justify-between gap-4 px-5 py-4 border-b app-border shrink-0">
					<div class="flex items-center gap-3 min-w-0">
						<slot name="icon" />
						<div class="flex flex-col gap-0.5 min-w-0">
							<DialogTitle class="text-h5">{{ title }}</DialogTitle>
							<DialogDescription v-if="hasDescription" class="text-caption">
								<slot name="description">{{ description }}</slot>
							</DialogDescription>
						</div>
					</div>
					<DialogClose class="button-ghost shrink-0 p-1" :aria-label="t('dialog_close')">
						<span class="i-mdi-close text-lg block" aria-hidden="true" />
					</DialogClose>
				</div>
				<div class="overflow-y-auto px-5 py-4">
					<slot />
				</div>
			</DialogContent>
		</DialogPortal>
	</DialogRoot>
</template>
