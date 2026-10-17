import { NodeInfoProvider } from "@brrr/lib/info/node";

const provider = new NodeInfoProvider();

export default defineEventHandler(async (event) => {
	const name = getRouterParam(event, "name") ?? "";
	const country = await provider.getCountry(name);
	if (!country) return null;
	// Serialize Map to plain object for JSON transport
	return {
		name: country.name,
		shortCode2: country.shortCode2,
		treaties: Object.fromEntries(country.treaties),
	};
});
