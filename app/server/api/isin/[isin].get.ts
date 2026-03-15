import { NodeInfoProvider } from "@brrr/lib/info/node";

const provider = new NodeInfoProvider();

export default defineEventHandler(async (event) => {
	const isin = getRouterParam(event, "isin") ?? "";
	return provider.getCompanyInfo(isin);
});
