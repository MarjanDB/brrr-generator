import { Buffer } from "buffer";

export default defineNuxtPlugin(() => {
	if (typeof globalThis.Buffer === "undefined") {
		globalThis.Buffer = Buffer;
	}
});
