import type { KnownCountry } from "@brrr/lib/info/node";

// The countries a payer can be defined in: those the lookups know, fetched when a form loads them,
// offered by code and named in the reader's language, so the form's treaty is found by them.
export function useCountries() {
	const { locale } = useI18n();
	const loaded = shallowRef<KnownCountry[]>([]);
	const loadError = ref<string | null>(null);

	async function load() {
		try {
			loaded.value = await $fetch<KnownCountry[]>("/api/countries");
		} catch (caught) {
			loadError.value = caught instanceof Error ? caught.message : String(caught);
		}
	}

	// A country's name in the reader's language, from its ISO 3166-1 alpha-2 code; the code itself
	// where the browser has no name for it.
	function labelOf(code: string): string {
		return new Intl.DisplayNames([locale.value], { type: "region" }).of(code) ?? code;
	}

	// The loaded country with this code, with the name the lookups know it by.
	function known(code: string): KnownCountry | null {
		return loaded.value.find((country) => country.code === code) ?? null;
	}

	// What a select offers: each loaded country by its code, named and ordered in the reader's
	// language.
	const options = computed(() => {
		const collator = new Intl.Collator(locale.value);
		return loaded.value
			.map((country) => ({ value: country.code, label: labelOf(country.code) }))
			.sort((left, right) => collator.compare(left.label, right.label));
	});

	return { options, loadError, load, labelOf, known };
}
