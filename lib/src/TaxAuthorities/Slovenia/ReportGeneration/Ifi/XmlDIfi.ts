import type { TaxAuthorityConfiguration } from "@brrr/TaxAuthorities/ConfigurationProvider";
import {
	EDavkiDerivativeReportItemType,
	EDavkiDerivativeReportSecurityLineGenericEventBought,
	EDavkiDerivativeSecurityType,
	EDavkiDerivativeSecurityTypeName,
	type EDavkiGenericDerivativeReportItem,
} from "@brrr/TaxAuthorities/Slovenia/Schemas/Schemas";
import { XMLBuilder } from "fast-xml-parser";

function round(value: number, decimals: number): number {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
}

export function generateXmlReport(
	reportConfig: TaxAuthorityConfiguration,
	ifiItems: EDavkiGenericDerivativeReportItem[],
): string {
	const edp = "http://edavki.durs.si/Documents/Schemas/EDP-Common-1.xsd";

	const tItemNodes = ifiItems.map((ifiItem) => {
		let typeName: string;
		if (ifiItem.inventoryListType === EDavkiDerivativeSecurityType.OPTION_OR_CERTIFICATE) {
			typeName = EDavkiDerivativeSecurityTypeName.OPTION_OR_CERTIFICATE;
		} else if (ifiItem.inventoryListType === EDavkiDerivativeSecurityType.FUTURES_CONTRACT) {
			typeName = EDavkiDerivativeSecurityTypeName.FUTURES_CONTRACT;
		} else if (ifiItem.inventoryListType === EDavkiDerivativeSecurityType.CONTRACT_FOR_DIFFERENCE) {
			typeName = EDavkiDerivativeSecurityTypeName.CONTRACT_FOR_DIFFERENCE;
		} else {
			typeName = EDavkiDerivativeSecurityTypeName.OTHER;
		}

		const tItemObj: Record<string, unknown> = {
			TypeId: ifiItem.itemType,
			Type: ifiItem.inventoryListType,
			TypeName: typeName,
		};

		if (ifiItem.name !== null) {
			tItemObj.Name = ifiItem.name;
		}

		tItemObj.HasForeignTax = String(ifiItem.hasForeignTax).toLowerCase();

		if (ifiItem.foreignTax !== null) {
			tItemObj.ForeignTax = String(round(ifiItem.foreignTax, 8));
		}
		if (ifiItem.ftCountryId !== null) {
			tItemObj.FTCountryID = ifiItem.ftCountryId;
		}
		if (ifiItem.ftCountryName !== null) {
			tItemObj.FTCountryName = ifiItem.ftCountryName;
		}

		if (ifiItem.itemType === EDavkiDerivativeReportItemType.DERIVATIVE) {
			const tSubItemNodes = ifiItem.items.map((entryLine) => {
				if (entryLine instanceof EDavkiDerivativeReportSecurityLineGenericEventBought) {
					return {
						Purchase: {
							F1: entryLine.boughtOn.toFormat("yyyy-MM-dd"),
							F2: entryLine.gainType,
							F3: String(round(entryLine.quantity, 8)),
							F4: String(round(entryLine.pricePerUnit, 8)),
							F9: String(entryLine.leveraged).toLowerCase(),
						},
					};
				} else {
					return {
						Sale: {
							F5: entryLine.soldOn.toFormat("yyyy-MM-dd"),
							F6: String(round(-entryLine.quantity, 8)),
							F7: String(round(Math.abs(entryLine.pricePerUnit), 8)),
						},
					};
				}
			});
			tItemObj.TSubItem = tSubItemNodes;
		}

		return tItemObj;
	});

	const tree = {
		"?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
		Envelope: {
			"@_xmlns:edp": edp,
			"@_xmlns:xs": "http://www.w3.org/2001/XMLSchema",
			"edp:Header": {
				"edp:taxpayer": {},
				"edp:Workflow": {
					"edp:DocumentWorkflowID": "O",
				},
			},
			"edp:AttachmentList": {},
			"edp:Signatures": {},
			body: {
				"edp:bodyContent": {},
				D_IFI: {
					PeriodStart: reportConfig.fromDate.toFormat("yyyy-MM-dd"),
					PeriodEnd: reportConfig.toDate.minus({ days: 1 }).toFormat("yyyy-MM-dd"),
					TItem: tItemNodes,
				},
			},
		},
	};

	const builder = new XMLBuilder({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
		format: true,
		suppressEmptyNode: false,
	});

	return builder.build(tree) as string;
}
