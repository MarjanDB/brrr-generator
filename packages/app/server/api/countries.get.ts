import { NodeInfoProvider } from "@brrr/lib/info/node";

const provider = new NodeInfoProvider();

// The countries a company lookup understands, as { name, code } pairs, for picking one by hand.
export default defineEventHandler(() => provider.knownCountries());
