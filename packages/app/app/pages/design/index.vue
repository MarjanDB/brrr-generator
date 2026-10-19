<script setup lang="ts">
import { BadgeVariant, ColorIntent } from "~/types/ui";

const neutralRoles = [
	"page",
	"surface",
	"surface-raised",
	"surface-hover",
	"surface-inverse",
	"ink",
	"ink-muted",
	"ink-inverse",
	"edge",
	"edge-strong",
	"edge-subtle",
	"overlay",
];

const intentRoleSuffixes = ["", "-hover", "-on", "-soft", "-ink", "-edge"];

// Class strings are written out in full, since UnoCSS only sees literal strings.
const intents = [
	{ name: ColorIntent.ACTION, filled: "button-filled-action" },
	{ name: ColorIntent.ACCENT, filled: "button-filled-accent" },
	{ name: ColorIntent.NEUTRAL, filled: "button-filled-neutral" },
	{ name: ColorIntent.SUCCESS, filled: "button-filled-success" },
	{ name: ColorIntent.WARNING, filled: "button-filled-warning" },
	{ name: ColorIntent.DANGER, filled: "button-filled-danger" },
	{ name: ColorIntent.INFO, filled: "button-filled-info" },
];

// Forms
const formText = ref("");
const formNumber = ref<number | null>(null);
const formFiles = ref<FileList | null>(null);
const formSelect = ref("");
const formCheckbox = ref(false);
const formSubmitResult = ref<string | null>(null);

const selectOptions = [
	{ value: "apple", label: "Apple" },
	{ value: "banana", label: "Banana" },
	{ value: "cherry", label: "Cherry" },
];

function validateRequired(value: string): string | null {
	return value.trim() ? null : "This field is required";
}

function validateNumber(value: number | null): string | null {
	if (value === null) return "This field is required";
	if (value < 2000 || value > 2100) return "Must be between 2000 and 2100";
	return null;
}

function validateFile(value: FileList | null): string | null {
	return value && value.length > 0 ? null : "Please select a file";
}

function validateSelect(value: string): string | null {
	return value ? null : "Please select an option";
}

function validateCheckbox(value: boolean): string | null {
	return value ? null : "You must agree to continue";
}

function onFormSubmit(valid: boolean) {
	formSubmitResult.value = valid ? "Form submitted successfully!" : "Please fix the errors above.";
}
</script>

<template>
	<div class="flex flex-col gap-5 app-text py-5">
		<div class="flex flex-col gap-4 border b-1 p-5">
			<h2 class="text-h3">Colors</h2>
			<div class="flex flex-row flex-wrap gap-3">
				<div v-for="role in neutralRoles" :key="role" class="flex flex-col gap-1 w-28">
					<div class="h-10 border app-border-strong" :style="{ backgroundColor: `var(--color-${role})` }" />
					<span class="text-xs app-text-muted">{{ role }}</span>
				</div>
			</div>
			<div v-for="intent in intents" :key="intent.name" class="flex flex-row flex-wrap items-center gap-3">
				<span class="text-xs app-text-muted w-20 shrink-0">{{ intent.name }}</span>
				<div v-for="suffix in intentRoleSuffixes" :key="suffix" class="flex flex-col gap-1 w-24">
					<div class="h-8 border app-border-strong" :style="{ backgroundColor: `var(--color-${intent.name}${suffix})` }" />
					<span class="text-xs app-text-muted">{{ intent.name }}{{ suffix }}</span>
				</div>
			</div>
		</div>

		<div class="flex flex-col gap-4 border b-1 p-5">
			<h2 class="text-h3">Buttons</h2>
			<div v-for="intent in intents" :key="intent.name" class="flex flex-row gap-3 items-center flex-wrap">
				<span class="text-xs app-text-muted w-20">{{ intent.name }}</span>
				<button type="button" :class="intent.filled">filled</button>
				<button type="button" disabled :class="intent.filled">disabled</button>
				<AppButton :color="intent.name" :loading="true">filled</AppButton>
			</div>
		</div>

		<div class="flex flex-col gap-4 border b-1 p-5">
			<h2 class="text-h3">Badges</h2>
			<div class="flex flex-col gap-3">
				<div class="flex flex-row gap-2 flex-wrap items-center">
					<span class="text-xs app-text-muted w-16 shrink-0">soft</span>
					<AppBadge v-for="intent in intents" :key="intent.name" :color="intent.name" :variant="BadgeVariant.SOFT">{{ intent.name }}</AppBadge>
				</div>
				<div class="flex flex-row gap-2 flex-wrap items-center">
					<span class="text-xs app-text-muted w-16 shrink-0">solid</span>
					<AppBadge v-for="intent in intents" :key="intent.name" :color="intent.name" :variant="BadgeVariant.SOLID">{{ intent.name }}</AppBadge>
				</div>
				<div class="flex flex-row gap-2 flex-wrap items-center">
					<span class="text-xs app-text-muted w-16 shrink-0">pill</span>
					<AppBadge v-for="intent in intents" :key="intent.name" :color="intent.name" pill>{{ intent.name }}</AppBadge>
				</div>
			</div>
		</div>

		<div class="flex flex-col gap-4 border b-1 p-5">
			<h2 class="text-h3">Callouts</h2>
			<ul class="flex flex-col gap-1.5 max-w-md">
				<AppCallout v-for="intent in intents" :key="intent.name" as="li" :color="intent.name">
					A {{ intent.name }} callout about the item above it.
				</AppCallout>
			</ul>
		</div>

		<div class="flex flex-col gap-4 border b-1 p-5">
			<h2 class="text-h3">Tooltip</h2>
			<div class="flex flex-row gap-4 flex-wrap">
				<AppTooltip content="This is a tooltip">
					<button type="button" class="button-filled-neutral">Hover me</button>
				</AppTooltip>
				<AppTooltip content="Appears on the right" side="right">
					<AppBadge :color="ColorIntent.INFO" :variant="BadgeVariant.SOFT">Badge with tooltip</AppBadge>
				</AppTooltip>
			</div>
		</div>

		<div class="flex flex-col gap-4 border b-1 p-5">
			<h2 class="text-h3">Forms</h2>
			<AppForm class="flex flex-col gap-4 max-w-sm" @submit="onFormSubmit">
				<AppTextInput
					v-model="formText"
					label="Name"
					placeholder="Enter your name"
					:validate="validateRequired"
				/>
				<AppNumberInput
					v-model="formNumber"
					label="Year"
					placeholder="e.g. 2024"
					:min="2000"
					:max="2100"
					:validate="validateNumber"
				/>
				<AppFileInput
					v-model="formFiles"
					label="XML file(s)"
					accept=".xml"
					multiple
					:validate="validateFile"
				/>
				<AppSelect
					v-model="formSelect"
					label="Fruit"
					placeholder="Select a fruit"
					:options="selectOptions"
					:validate="validateSelect"
				/>
				<AppCheckbox
					v-model="formCheckbox"
					label="I agree to the terms"
					:validate="validateCheckbox"
				/>
				<div class="flex items-center gap-3">
					<AppButton :color="ColorIntent.ACCENT" type="submit">Submit</AppButton>
					<span v-if="formSubmitResult" class="text-sm app-text-muted">{{ formSubmitResult }}</span>
				</div>
			</AppForm>
		</div>
	</div>
</template>
