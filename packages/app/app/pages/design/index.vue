<script setup lang="ts">
import { BadgeVariant, ButtonVariant, ColorIntent, ControlSize, IssueSeverity } from "~/types/ui";

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

const intentRoleSuffixes = [
	"",
	"-hover",
	"-pressed",
	"-on",
	"-soft",
	"-soft-hover",
	"-soft-pressed",
	"-ink",
	"-edge",
];

const intents = Object.values(ColorIntent);
const variants = Object.values(ButtonVariant);
const sizes = [ControlSize.MD, ControlSize.SM];

// The type roles, as the shortcuts name them. Class strings are written out in full, since UnoCSS
// only sees literal strings.
const typeRoles = [
	{ name: "text-heading", sample: "EDF", use: "A step's or an instrument's title" },
	{ name: "text-subheading", sample: "Shares", use: "A group: Shares, Options, Left out" },
	{ name: "text-label", sample: "Sell price", use: "A field, a column header, a small button" },
	{ name: "text-body", sample: "Asset class BOND is not supported yet.", use: "Sentences and cells" },
	{ name: "text-meta", sample: "FR0010242511, expires Dec 22, 2023", use: "Identifiers, dates under a name, captions" },
];

const pressed = ref(true);
const pickedRow = ref(1);

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
			<h2 class="text-heading">Colors</h2>
			<div class="flex flex-row flex-wrap gap-3">
				<div v-for="role in neutralRoles" :key="role" class="flex flex-col gap-1 w-28">
					<div class="h-10 border app-border-strong" :style="{ backgroundColor: `var(--color-${role})` }" />
					<span class="text-xs app-text-muted">{{ role }}</span>
				</div>
			</div>
			<div v-for="intent in intents" :key="intent" class="flex flex-row flex-wrap items-center gap-3">
				<span class="text-xs app-text-muted w-20 shrink-0">{{ intent }}</span>
				<div v-for="suffix in intentRoleSuffixes" :key="suffix" class="flex flex-col gap-1 w-24">
					<div class="h-8 border app-border-strong" :style="{ backgroundColor: `var(--color-${intent}${suffix})` }" />
					<span class="text-xs app-text-muted">{{ intent }}{{ suffix }}</span>
				</div>
			</div>
		</div>

		<div class="flex flex-col gap-4 border b-1 p-5">
			<h2 class="text-heading">Type</h2>
			<div class="grid grid-cols-[10rem_1fr] gap-x-6 gap-y-3 items-baseline">
				<template v-for="role in typeRoles" :key="role.name">
					<span class="text-meta">{{ role.name }}<br>{{ role.use }}</span>
					<span :class="role.name">{{ role.sample }}</span>
				</template>
			</div>
		</div>

		<div class="flex flex-col gap-4 border b-1 p-5">
			<h2 class="text-heading">Controls</h2>
			<p class="text-body text-ink-muted max-w-prose">
				Every family has the same states: hover a step lighter, pressed a step darker, open or pressed in
				as shown, keyboard focus the accent ring, disabled half faded. Hover, press and Tab through them.
			</p>
			<div v-for="variant in variants" :key="variant" class="flex flex-row gap-3 items-center flex-wrap">
				<span class="text-meta w-24">{{ variant }}</span>
				<template v-for="size in sizes" :key="size">
					<AppButton :variant="variant" :size="size">Download CSV</AppButton>
					<AppButton :variant="variant" :size="size" disabled>Disabled</AppButton>
				</template>
				<AppButton :variant="variant" :loading="true">Loading</AppButton>
				<AppButton :variant="variant" :size="ControlSize.ICON" aria-label="Trace">
					<span class="i-mdi-graph-outline size-4.5" aria-hidden="true" />
				</AppButton>
			</div>
			<div class="flex flex-row gap-3 items-center flex-wrap">
				<span class="text-meta w-24">toggle</span>
				<AppButton :variant="ButtonVariant.SECONDARY" :size="ControlSize.SM" :aria-pressed="pressed" @click="pressed = !pressed">
					Show every step
				</AppButton>
				<AppButton :variant="ButtonVariant.QUIET" :size="ControlSize.SM" :aria-pressed="pressed" @click="pressed = !pressed">
					Show every lot
				</AppButton>
				<button type="button" class="button-secondary control-md" aria-expanded="true">
					2023 <span class="i-mdi-chevron-up text-ink-muted" aria-hidden="true" />
				</button>
			</div>
			<div class="flex flex-row gap-3 items-center flex-wrap">
				<span class="text-meta w-24">issue</span>
				<IssueButton :severity="IssueSeverity.DANGER" opens>2 items need a look</IssueButton>
				<IssueButton :severity="IssueSeverity.WARNING" opens>2 warnings</IssueButton>
			</div>
			<div class="flex flex-row gap-3 items-center flex-wrap">
				<span class="text-meta w-24">field</span>
				<input class="field max-w-52" placeholder="Ticker, name or ISIN">
				<input class="field field-invalid max-w-52" value="12345">
				<input class="field max-w-52" placeholder="Disabled" disabled>
			</div>
			<div class="flex flex-row gap-3 items-start flex-wrap">
				<span class="text-meta w-24">rows</span>
				<div class="flex flex-col w-60 border app-border">
					<button
						v-for="row in [0, 1, 2]"
						:key="row"
						type="button"
						class="px-3 py-2 text-left text-label app-focus-ring-inset"
						:class="row === pickedRow ? 'row-selected' : 'row-selectable'"
						:aria-pressed="row === pickedRow"
						@click="pickedRow = row"
					>
						Row {{ row + 1 }}
					</button>
				</div>
			</div>
		</div>

		<div class="flex flex-col gap-4 border b-1 p-5">
			<h2 class="text-heading">Badges</h2>
			<div class="flex flex-col gap-3">
				<div class="flex flex-row gap-2 flex-wrap items-center">
					<span class="text-xs app-text-muted w-16 shrink-0">soft</span>
					<AppBadge v-for="intent in intents" :key="intent" :color="intent" :variant="BadgeVariant.SOFT">{{ intent }}</AppBadge>
				</div>
				<div class="flex flex-row gap-2 flex-wrap items-center">
					<span class="text-xs app-text-muted w-16 shrink-0">solid</span>
					<AppBadge v-for="intent in intents" :key="intent" :color="intent" :variant="BadgeVariant.SOLID">{{ intent }}</AppBadge>
				</div>
				<div class="flex flex-row gap-2 flex-wrap items-center">
					<span class="text-xs app-text-muted w-16 shrink-0">pill</span>
					<AppBadge v-for="intent in intents" :key="intent" :color="intent" pill>{{ intent }}</AppBadge>
				</div>
			</div>
		</div>

		<div class="flex flex-col gap-4 border b-1 p-5">
			<h2 class="text-heading">Callouts</h2>
			<ul class="flex flex-col gap-1.5 max-w-md">
				<AppCallout v-for="intent in intents" :key="intent" as="li" :color="intent">
					A {{ intent }} callout about the item above it.
				</AppCallout>
			</ul>
		</div>

		<div class="flex flex-col gap-4 border b-1 p-5">
			<h2 class="text-heading">Tooltip</h2>
			<div class="flex flex-row gap-4 flex-wrap">
				<AppTooltip content="This is a tooltip">
					<AppButton :variant="ButtonVariant.SECONDARY">Hover me</AppButton>
				</AppTooltip>
				<AppTooltip content="Appears on the right" side="right">
					<AppBadge :color="ColorIntent.INFO" :variant="BadgeVariant.SOFT">Badge with tooltip</AppBadge>
				</AppTooltip>
			</div>
		</div>

		<div class="flex flex-col gap-4 border b-1 p-5">
			<h2 class="text-heading">Forms</h2>
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
					<AppButton type="submit">Submit</AppButton>
					<span v-if="formSubmitResult" class="text-sm app-text-muted">{{ formSubmitResult }}</span>
				</div>
			</AppForm>
		</div>
	</div>
</template>
