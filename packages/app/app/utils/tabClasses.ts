// The look of a row of tabs, shared by the forms' tabs and an instrument's. An underline marks the
// open tab, drawn over the list's base line. The list scrolls sideways when the tabs don't fit,
// which clips anything outside it, so the focus ring is drawn inside the tab.
const tabListClasses = "flex overflow-x-auto shadow-[inset_0_-1px_0_var(--color-edge)]";

const tabTriggerClasses =
	"flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm font-medium text-ink-muted rounded-t-sm cursor-pointer transition-colors hover:bg-surface-raised hover:text-ink active:bg-surface-hover aria-selected:border-accent-edge aria-selected:text-ink app-focus-ring-inset";

// A row of tabs: its list and each tab.
export const TabClasses = {
	list: tabListClasses,
	trigger: tabTriggerClasses,
};
