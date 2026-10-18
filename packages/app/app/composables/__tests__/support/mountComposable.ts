import { mountSuspended } from "@nuxt/test-utils/runtime";
import { defineComponent, h } from "vue";

// What a component's setup returned, once it has run. A box, so TypeScript doesn't take the
// setup's assignment for one that never happens.
type Mounted<Result> = { done: { result: Result } | null };

// Runs a composable inside a mounted component, so it can call useI18n, provide and inject, and
// returns what it returned.
export async function mountComposable<Result>(use: () => Result): Promise<Result> {
	const mounted: Mounted<Result> = { done: null };
	await mountSuspended(
		defineComponent({
			setup() {
				mounted.done = { result: use() };
				return () => null;
			},
		}),
	);
	if (mounted.done === null) {
		throw new Error("mountComposable: the component's setup never ran");
	}
	return mounted.done.result;
}

// Runs a composable inside a component whose parent ran `provide` first, for a composable that
// injects what an ancestor provided: Vue's inject reads the parent's provides, never those of the
// component it's called in.
export async function mountComposableUnder<Result>(
	provide: () => unknown,
	use: () => Result,
): Promise<Result> {
	const mounted: Mounted<Result> = { done: null };
	const child = defineComponent({
		setup() {
			mounted.done = { result: use() };
			return () => null;
		},
	});
	await mountSuspended(
		defineComponent({
			setup() {
				provide();
				return () => h(child);
			},
		}),
	);
	if (mounted.done === null) {
		throw new Error("mountComposableUnder: the child's setup never ran");
	}
	return mounted.done.result;
}
