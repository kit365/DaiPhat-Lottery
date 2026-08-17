package com.daiphat.coreapi.application.dto.document;

import java.util.List;

/** Fully formatted values consumed by the printable/PDF prize-payout confirmation contract. */
public record PrizePayoutConfirmationContractTemplateData(
        String title,
        String subtitle,
        String partyARoleLabel,
        String partyBRoleLabel,
        String partyASignatureLabel,
        String partyBSignatureLabel,
        String footerNote,
        List<ContractArticleView> articles,
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
        String recipientFullName,
        String recipientIdNumber,
        String recipientPhone,
        String contractCode,
        String contractIssuedDate,
        String taxPolicy,
        String commissionPolicy,
        String complaintPolicy,
        String additionalTerms,
        String totalGrossAmount,
        String totalTaxAmount,
        String totalCommissionAmount,
        String totalNetAmount,
        List<TicketLine> tickets,
        boolean showPrintAction
) {
    public record TicketLine(
            String orderCode,
            String stationName,
            String drawDate,
            String ticketNumbers,
            String serialNumber,
            String prizeName,
            String grossAmount,
            String taxAmount,
            String commissionAmount,
            String netAmount
    ) {
    }
}
