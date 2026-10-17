import { Isin } from "@brrr/lib";
import { NodeInfoProvider } from "@brrr/lib/info/node";

const provider = new NodeInfoProvider();

export default defineEventHandler(async (event) => {
	const isin = Isin.Schema.parse(getRouterParam(event, "isin") ?? "");
	return provider.getCompanyInfo(isin);
});
