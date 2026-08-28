package com.daiphat.coreapi.domain.model.lotteries;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OcrTicketTemplateModel {

    private Long id;
    private Long stationId;
    private String templateName;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private String sampleImageUrl;
    private boolean active;
    private boolean isDefault;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime deletedAt;

    public boolean isEffectiveOn(LocalDate drawDate) {
        if (drawDate == null) {
            return true;
        }
        if (effectiveFrom != null && drawDate.isBefore(effectiveFrom)) {
            return false;
        }
        if (effectiveTo != null && drawDate.isAfter(effectiveTo)) {
            return false;
        }
        return true;
    }
}
