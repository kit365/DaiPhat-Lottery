package com.daiphat.coreapi.application.dto.document;

/** Fully formatted values consumed by the printable/PDF contract template. */
public record StreetAgentContractTemplateData(
        String siteName,
        String siteLogoUrl,
        String sitePhone,
        String siteEmail,
        String siteAddress,
        String siteLegalName,
        String siteTaxCode,
        String siteLegalRepresentative,
        String siteLegalRepresentativeTitle,
        String contractSigningPlace,
        String vendorFullName,
        String vendorPhone,
        String vendorCccd,
        String vendorAddress,
        String vendorProvince,
        String vendorCoverageArea,
        String contractCode,
        String contractIssuedDate,
        String contractStartDate,
        String contractEndDate,
        String dailyTicketCap,
        String commission,
        String vendorUnitPrice,
        String depositRate,
        String depositFormula,
        String returnCutoff,
        String lateReturnPolicy,
        String lateReturnSettlement,
        boolean showPrintAction
) {
}
