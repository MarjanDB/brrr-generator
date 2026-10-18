import type { CountryCode, CountryName } from "@brrr/Core/Models/Identifiers";
import type { TreatyType } from "@brrr/InfoProviders/Models/TreatyType";

export type Country = {
	name: CountryName;
	shortCode2: CountryCode;
	treaties: Map<TreatyType, string>;
};
