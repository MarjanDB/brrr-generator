import { DropCategory } from "@brrr/Provenance/Models/DropCategory";
import { DropReason } from "@brrr/Provenance/Models/DropReason";

const categories: Record<DropReason, DropCategory> = {
	[DropReason.NOT_USED]: DropCategory.NOT_IN_THIS_REPORT,
	[DropReason.OUTSIDE_PERIOD]: DropCategory.NOT_IN_THIS_REPORT,
	[DropReason.POSITION_OPEN]: DropCategory.NOT_IN_THIS_REPORT,
	[DropReason.NOT_RECOGNISED]: DropCategory.NEEDS_A_LOOK,
	[DropReason.UNREADABLE]: DropCategory.NEEDS_A_LOOK,
	[DropReason.NOT_SUPPORTED]: DropCategory.NEEDS_A_LOOK,
	[DropReason.UNPAIRED]: DropCategory.NEEDS_A_LOOK,
	[DropReason.UNKNOWN_TYPE]: DropCategory.NEEDS_A_LOOK,
	[DropReason.NO_TRADES]: DropCategory.NEEDS_A_LOOK,
};

export function dropCategoryOf(reason: DropReason): DropCategory {
	return categories[reason];
}
