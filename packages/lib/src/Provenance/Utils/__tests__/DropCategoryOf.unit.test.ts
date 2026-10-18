import { DropCategory } from "@brrr/Provenance/Models/DropCategory";
import { DropReason } from "@brrr/Provenance/Models/DropReason";
import { dropCategoryOf } from "@brrr/Provenance/Utils/DropCategoryOf";

test("the drops a report expects are not in this report", () => {
	expect(dropCategoryOf(DropReason.NOT_USED)).toEqual(DropCategory.NOT_IN_THIS_REPORT);
	expect(dropCategoryOf(DropReason.OUTSIDE_PERIOD)).toEqual(DropCategory.NOT_IN_THIS_REPORT);
	expect(dropCategoryOf(DropReason.POSITION_OPEN)).toEqual(DropCategory.NOT_IN_THIS_REPORT);
});

test("the drops of the import need a look", () => {
	expect(dropCategoryOf(DropReason.NOT_RECOGNISED)).toEqual(DropCategory.NEEDS_A_LOOK);
	expect(dropCategoryOf(DropReason.UNREADABLE)).toEqual(DropCategory.NEEDS_A_LOOK);
	expect(dropCategoryOf(DropReason.NOT_SUPPORTED)).toEqual(DropCategory.NEEDS_A_LOOK);
	expect(dropCategoryOf(DropReason.UNPAIRED)).toEqual(DropCategory.NEEDS_A_LOOK);
	expect(dropCategoryOf(DropReason.UNKNOWN_TYPE)).toEqual(DropCategory.NEEDS_A_LOOK);
	expect(dropCategoryOf(DropReason.NO_TRADES)).toEqual(DropCategory.NEEDS_A_LOOK);
});
