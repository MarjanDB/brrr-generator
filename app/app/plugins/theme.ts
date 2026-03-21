import { useColorMode } from "@vueuse/core";

export default defineNuxtPlugin(() => {
	const cookie = useCookie("color-scheme", { default: () => "light", sameSite: "lax" });

	const theme = useColorMode({
		storage: {
			getItem: () => cookie.value,
			setItem: (_: string, value: string) => { cookie.value = value; },
			removeItem: () => { cookie.value = "light"; },
		},
	});

	const toggleTheme = () => {
		theme.value = theme.value === "dark" ? "light" : "dark";
	};

	return {
		provide: {
			theme,
			toggleTheme,
		},
	};
});
