import { ControlSize, IssueSeverity } from "~/types/ui";

// The classes the controls are drawn with, written out in full because UnoCSS only sees literals.

// A control's size (the `control-*` shortcuts), for a button or a link drawn as one.
export const controlSizeClasses: Record<ControlSize, string> = {
	[ControlSize.MD]: "control-md",
	[ControlSize.SM]: "control-sm",
	[ControlSize.ICON]: "control-icon",
};

// The button a problem is drawn as.
export const issueButtonClasses: Record<IssueSeverity, string> = {
	[IssueSeverity.DANGER]: "button-issue-danger",
	[IssueSeverity.WARNING]: "button-issue-warning",
};
