import { useColorMode } from "@vueuse/core";

export default defineNuxtPlugin(() => {
	const theme = useColorMode();

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
