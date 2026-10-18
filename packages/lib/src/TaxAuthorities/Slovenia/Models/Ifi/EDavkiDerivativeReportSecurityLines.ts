import type { EDavkiDerivativeReportSecurityLineGenericEventBought } from "@brrr/TaxAuthorities/Slovenia/Models/Ifi/EDavkiDerivativeReportSecurityLineGenericEventBought";
import type { EDavkiDerivativeReportSecurityLineGenericEventSold } from "@brrr/TaxAuthorities/Slovenia/Models/Ifi/EDavkiDerivativeReportSecurityLineGenericEventSold";

export type EDavkiDerivativeReportSecurityLines =
	| EDavkiDerivativeReportSecurityLineGenericEventBought
	| EDavkiDerivativeReportSecurityLineGenericEventSold;
