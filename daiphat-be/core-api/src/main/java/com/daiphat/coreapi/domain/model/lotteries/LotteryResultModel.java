package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Set;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LotteryResultModel {

    private static final Set<LotteryResultStatus> CHECKABLE_STATUSES = EnumSet.of(
            LotteryResultStatus.COMPLETED,
            LotteryResultStatus.PARTIAL,
            LotteryResultStatus.WAITING_FOR_AUDIT
    );

    private Long id;
    private Long stationId;
    private String stationName;
    private String regionCode;
    private LocalDate drawDate;
    private String source;

    @Builder.Default
    private boolean official = false;

    @Builder.Default
    private LotteryResultStatus status = LotteryResultStatus.PENDING;

    private LocalDateTime publishedAt;
    private LocalDateTime lastSyncedAt;
    private LocalDateTime requestedAt;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void validate() {
        if (stationId == null) {
            throw new DomainException(ErrorCode.LOTTERY_RESULT_STATION_REQUIRED);
        }
        if (drawDate == null) {
            throw new DomainException(ErrorCode.LOTTERY_RESULT_DRAW_DATE_REQUIRED);
        }
        if (status == null) {
            throw new DomainException(ErrorCode.LOTTERY_RESULT_STATUS_REQUIRED);
        }
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public boolean canCheckWinning() {
        return status != null && CHECKABLE_STATUSES.contains(status);
    }
}
