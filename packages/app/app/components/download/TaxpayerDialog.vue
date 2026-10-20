<script setup lang="ts">
import type { GeneratedOutputs } from "~/types/generatedOutputs";
import type { TaxpayerDetails } from "~/types/taxYearReports";

const props = defineProps<{
	outputs: GeneratedOutputs;
	// The form as its tab names it.
	formName: string;
}>();

const { t } = useI18n();
const reports = useTaxYearReports();

const open = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
// Filled in from what was given last time each time the dialog opens.
const details = ref<TaxpayerDetails>({ ...reports.taxpayer.value });

watch(open, (opened) => {
	if (opened) {
		details.value = { ...reports.taxpayer.value };
		error.value = null;
	}
});

const validateCountry = (value: string) =>
	/^[A-Za-z]{2}$/.test(value.trim()) ? null : t("validation_country");

async function onSubmit(valid: boolean) {
	if (!valid) {
		return;
	}
	const given: TaxpayerDetails = {
		...details.value,
		countryId: details.value.countryId.trim().toUpperCase(),
	};
	reports.taxpayer.value = given;
	saving.value = true;
	error.value = null;
	try {
		await reports.downloadXml(props.outputs, given);
		open.value = false;
	} catch (caught) {
		error.value = caught instanceof Error ? caught.message : String(caught);
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<AppDialog
		v-model:open="open"
		:title="t('taxpayer_dialog_title', { form: formName })"
		:description="t('taxpayer_dialog_description')"
	>
		<template #trigger>
			<AppButton>{{ t('download_xml_label') }}</AppButton>
		</template>

		<AppForm class="flex flex-col gap-4" @submit="onSubmit">
			<div class="grid gap-3 sm:grid-cols-2">
				<AppTextInput v-model="details.taxNumber" :label="t('tax_number_label')" />
				<AppTextInput v-model="details.name" :label="t('full_name_label')" />
				<AppTextInput v-model="details.address" :label="t('address_label')" />
				<AppTextInput v-model="details.city" :label="t('city_label')" />
				<AppTextInput v-model="details.postNumber" :label="t('post_number_label')" />
				<AppTextInput v-model="details.postName" :label="t('post_name_label')" />
				<AppTextInput
					v-model="details.countryId"
					:label="t('country_id_label')"
					:placeholder="t('country_id_placeholder')"
					:validate="validateCountry"
				/>
			</div>

			<div v-if="error" class="alert-error">{{ error }}</div>

			<div class="flex justify-end gap-2">
				<AppButton type="submit" :loading="saving">{{ t('taxpayer_dialog_download') }}</AppButton>
			</div>
		</AppForm>
	</AppDialog>
</template>
