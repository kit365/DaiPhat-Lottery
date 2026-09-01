package com.daiphat.coreapi.infrastructure.persistence.repository.payout;

import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

@SpringBootTest
class PrizePayoutEligibleTicketsQueryIT {

    @Autowired
    private PrizePayoutRequestRepository repository;

    @Test
    void findEligibleForPrizeClaimSubmission_doesNotThrow() {
        assertDoesNotThrow(() -> repository.findEligibleForPrizeClaimSubmission(
                LocalDate.of(2026, 6, 2),
                LocalDate.of(2026, 8, 30),
                PrizePayoutRequestStatus.COMPLETED,
                SerialPayoutState.PAID_OUT,
                List.of(
                        PrizeClaimSubmissionLineStatus.SELECTED,
                        PrizeClaimSubmissionLineStatus.INSPECTED,
                        PrizeClaimSubmissionLineStatus.AWAITING_OUTCOME),
                PrizeClaimSubmissionLineStatus.REJECTED_RETRYABLE));
    }
}
