package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimLineOutcome;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimRejectionReason;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RecordLineOutcomeRequest {

    @NotNull
    private PrizeClaimLineOutcome outcome;

    private PrizeClaimRejectionReason reason;

    private String note;

    /** Bắt buộc khi outcome = HANDED_OVER — ảnh chứng từ nhà đài đã xử lý. */
    private String outcomeEvidenceUrl;
}
