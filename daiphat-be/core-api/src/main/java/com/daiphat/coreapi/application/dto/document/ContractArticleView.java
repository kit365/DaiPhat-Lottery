package com.daiphat.coreapi.application.dto.document;

import com.daiphat.coreapi.domain.model.enums.contract.ContractArticleKind;

/** One clause rendered into a printable/PDF contract from the shared `contracts` table. */
public record ContractArticleView(
        String code,
        int ordinal,
        String title,
        String kind,
        String body
) {
    public boolean isPrizeTicketTable() {
        return ContractArticleKind.PRIZE_TICKET_TABLE.name().equals(kind);
    }
}
