package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.TicketEntryDraftSectionPayload;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LotteryTicketEntryDraftModel {

    private Long id;
    private Long importBatchLineId;
    private UUID operatorId;
    @Builder.Default
    private List<TicketEntryDraftSectionPayload> ticketSections = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime deletedAt;

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public void softDelete(LocalDateTime now) {
        this.deletedAt = now;
        this.updatedAt = now;
    }

    public void revive(LocalDateTime now) {
        this.deletedAt = null;
        this.updatedAt = now;
    }
}
