<script setup lang="ts">
import type { CompanyDefinition } from "@brrr/lib";
import { onMounted, ref } from "vue";
import { ButtonVariant } from "~/types/ui";

// A dividend payer defined by hand: what the form needs of the company (its name, street, city and
// country). The country is picked from those the lookups know, so the form's treaty is found by it.
const props = defineProps<{
	isin: string;
	// What it was defined as before, when it is being edited.
	initial: CompanyDefinition | null;
}>();

const emit = defineEmits<{
	save: [definition: CompanyDefinition];
	cancel: [];
}>();

const { t } = useI18n();
const { options, loadError, load, known } = useCountries();
onMounted(load);

const name = ref(props.initial?.name ?? "");
const street = ref(props.initial?.street ?? "");
const city = ref(props.initial?.city ?? "");
const countryCode = ref(props.initial?.countryCode ?? "");

const required = (value: string) => (value.trim() === "" ? t("validation_required") : null);

function onSubmit(valid: boolean) {
	const country = known(countryCode.value);
	if (!valid || country === null) {
		return;
	}
	emit("save", {
		isin: props.isin,
		name: name.value.trim(),
		street: street.value.trim(),
		city: city.value.trim(),
		countryName: country.name,
		countryCode: country.code,
	});
}
</script>

<template>
  <AppForm class="flex flex-col gap-3" @submit="onSubmit">
    <AppTextInput v-model="name" :label="t('problems_payer_name')" :validate="required" />
    <div class="grid gap-3 sm:grid-cols-2">
      <AppTextInput v-model="street" :label="t('problems_payer_street')" :validate="required" />
      <AppTextInput v-model="city" :label="t('city_label')" :validate="required" />
    </div>
    <AppSelect
      v-model="countryCode"
      :label="t('problems_payer_country')"
      :placeholder="t('problems_payer_country_placeholder')"
      :options="options"
      :validate="required"
    />
    <div v-if="loadError !== null" class="alert-error">
      {{ t('problems_countries_failed', { error: loadError }) }}
    </div>
    <div class="flex gap-2">
      <AppButton type="submit">{{ t('problems_payer_save') }}</AppButton>
      <AppButton v-if="initial !== null" :variant="ButtonVariant.SECONDARY" @click="emit('cancel')">
        {{ t('problems_payer_cancel') }}
      </AppButton>
    </div>
  </AppForm>
</template>
