import { XMLBuilder } from "fast-xml-parser";
import type { TaxAuthorityConfiguration } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
import type { TaxPayerInfo } from "@brrr/TaxAuthorities/ConfigurationProvider.ts";
import type { EDavkiDocumentWorkflowType } from "@brrr/TaxAuthorities/Slovenia/Schemas/ReportTypes.ts";
import {
	type EDavkiGenericTradeReportItem,
	type EDavkiTradeReportSecurityLineGenericEventBought,
	type EDavkiTradeReportSecurityLineGenericEventSold,
	EDavkiTradeSecurityType,
} from "@brrr/TaxAuthorities/Slovenia/Schemas/Schemas.ts";

function buildXmlTree(
	reportConfig: TaxAuthorityConfiguration,
	userConfig: TaxPayerInfo,
	documentType: EDavkiDocumentWorkflowType,
	kdvpItems: EDavkiGenericTradeReportItem[],
	envelopeAttribs: Record<string, string>,
): unknown {
	const edp = "http://edavki.durs.si/Documents/Schemas/EDP-Common-1.xsd";

	const kdvpItemNodes = kdvpItems.map((kdvpItem) => {
		const securitiesNodes = kdvpItem.inventoryListType === EDavkiTradeSecurityType.SECURITY
			? kdvpItem.items.map((secEntry) => {
				const rowNodes = secEntry.events.map((entryLine, id) => {
					if (entryLine.kind === "Bought") {
						const bought = entryLine as EDavkiTradeReportSecurityLineGenericEventBought;
						const purchaseFields: Record<string, string> = {
							F1: bought.boughtOn.toFormat("yyyy-MM-dd"),
							F2: bought.gainType,
							F3: String(round(bought.quantity, 5)),
							F4: String(round(bought.pricePerUnit, 5)),
							F5: String(round(bought.inheritanceAndGiftTaxPaid ?? 0, 5)),
						};
						if (bought.baseTaxReduction !== null) {
							purchaseFields["F11"] = String(round(bought.baseTaxReduction, 5));
						}
						return { ID: String(id), Purchase: purchaseFields };
					} else {
						const sold = entryLine as EDavkiTradeReportSecurityLineGenericEventSold;
						return {
							ID: String(id),
							Sale: {
								F6: sold.soldOn.toFormat("yyyy-MM-dd"),
								F7: String(round(-sold.quantity, 5)),
								F9: String(round(Math.abs(sold.pricePerUnit), 5)),
								F10: String(sold.satisfiesTaxBasisReduction).toLowerCase(),
							},
						};
					}
				});

				const securitiesObj: Record<string, unknown> = {
					ISIN: secEntry.isin,
					Code: secEntry.code ?? "",
					IsFond: String(secEntry.isFund).toLowerCase(),
					Row: rowNodes,
				};
				if (secEntry.resolution !== null) {
					securitiesObj["Resolution"] = secEntry.resolution;
				}
				if (secEntry.resolutionDate !== null) {
					securitiesObj["ResolutionDate"] = secEntry.resolutionDate!.toFormat("yyyy-MM-dd");
				}
				return securitiesObj;
			})
			: [];

		const kdvpItemObj: Record<string, unknown> = {
			InventoryListType: kdvpItem.inventoryListType,
			HasForeignTax: String(kdvpItem.hasForeignTax).toLowerCase(),
			HasLossTransfer: String(kdvpItem.hasLossTransfer ?? false).toLowerCase(),
			ForeignTransfer: String(kdvpItem.foreignTransfer ?? false).toLowerCase(),
			TaxDecreaseConformance: String(kdvpItem.taxDecreaseConformance ?? false).toLowerCase(),
		};
		if (kdvpItem.foreignTax !== null) {
			kdvpItemObj["ForeignTax"] = String(round(kdvpItem.foreignTax, 5));
		}
		if (kdvpItem.ftCountryId !== null) {
			kdvpItemObj["FTCountryID"] = kdvpItem.ftCountryId;
		}
		if (kdvpItem.ftCountryName !== null) {
			kdvpItemObj["FTCountryName"] = kdvpItem.ftCountryName;
		}
		if (securitiesNodes.length > 0) {
			kdvpItemObj["Securities"] = securitiesNodes;
		}
		return kdvpItemObj;
	});

	return {
		"?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
		Envelope: {
			"@_xmlns:edp": edp,
			"@_xmlns:xs": "http://www.w3.org/2001/XMLSchema",
			...envelopeAttribs,
			"edp:Header": {
				"edp:taxpayer": {
					"edp:taxNumber": userConfig.taxNumber,
					"edp:taxpayerType": userConfig.taxpayerType,
					"edp:name": userConfig.name,
					"edp:address1": userConfig.address1,
					"edp:address2": userConfig.address2 ?? "",
					"edp:city": userConfig.city,
					"edp:postNumber": userConfig.postNumber,
					"edp:postName": userConfig.postName,
				},
				"edp:Workflow": {
					"edp:DocumentWorkflowID": documentType,
				},
			},
			"edp:AttachmentList": {},
			"edp:Signatures": {},
			body: {
				"edp:bodyContent": {},
				Doh_KDVP: {
					KDVP: {
						DocumentWorkflowID: documentType,
						Year: reportConfig.fromDate.toFormat("yyyy"),
						PeriodStart: reportConfig.fromDate.toFormat("yyyy-MM-dd"),
						PeriodEnd: reportConfig.toDate.minus({ days: 1 }).toFormat("yyyy-MM-dd"),
						IsResident: String(userConfig.countryId === "SI").toLowerCase(),
						SecurityCount: "0",
						SecurityShortCount: "0",
						SecurityWithContractCount: "0",
						SecurityWithContractShortCount: "0",
						ShareCount: "0",
					},
					KDVPItem: kdvpItemNodes,
				},
			},
		},
	};
}

function round(value: number, decimals: number): number {
	const factor = Math.pow(10, decimals);
	return Math.round(value * factor) / factor;
}

export function generateXmlReport(
	reportConfig: TaxAuthorityConfiguration,
	userConfig: TaxPayerInfo,
	documentType: EDavkiDocumentWorkflowType,
	kdvpItems: EDavkiGenericTradeReportItem[],
): string {
	const builder = new XMLBuilder({
		ignoreAttributes: false,
		attributeNamePrefix: "@_",
		format: true,
		suppressEmptyNode: false,
	});

	const tree = buildXmlTree(reportConfig, userConfig, documentType, kdvpItems, {});
	return builder.build(tree) as string;
}
