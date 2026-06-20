package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LotteryResultDetailModel {

    private Long id;
    private Long lotteryResultId;
    private Long prizeStructureId;
    private PrizeLevel prizeLevel;
    private String prizeDisplayName;
    private String prizeCode;
    private Integer displayOrder;
    private Integer matchDigits;
    private MatchFrom matchFrom;
    private String matchFromDisplayName;
    private String winningNumber;
    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void validate() {
        if (prizeStructureId == null) {
            throw new DomainException(ErrorCode.LOTTERY_RESULT_PRIZE_STRUCTURE_REQUIRED);
        }
        if (winningNumber == null || winningNumber.isBlank()) {
            throw new DomainException(ErrorCode.LOTTERY_RESULT_DETAIL_WINNING_NUMBER_REQUIRED);
        }
        if (!winningNumber.chars().allMatch(Character::isDigit)) {
            throw new DomainException(ErrorCode.LOTTERY_RESULT_DETAIL_WINNING_NUMBER_INVALID);
        }
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }
}
