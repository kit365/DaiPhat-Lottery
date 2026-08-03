package com.daiphat.coreapi.domain.model.payout;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutChannel;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutPaymentMethod;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PrizePayoutRequestModelRejectRetryTest {

    @Test
    @DisplayName("online reject under max stays REJECTED")
    void markRejected_onlineUnderMax_staysRejected() {
        PrizePayoutRequestModel model = pendingOnline();
        model.markRejected("Sai STK", UUID.randomUUID(), 2, 3);

        assertEquals(PrizePayoutRequestStatus.REJECTED, model.getStatus());
        assertEquals(2, model.getRejectCount());
        assertEquals("Sai STK", model.getRejectReason());
    }

    @Test
    @DisplayName("online reject at max becomes MANUAL_RESOLUTION")
    void markRejected_onlineAtMax_locksManual() {
        PrizePayoutRequestModel model = pendingOnline();
        model.markRejected("Spam", UUID.randomUUID(), 3, 3);

        assertEquals(PrizePayoutRequestStatus.MANUAL_RESOLUTION, model.getStatus());
        assertEquals(3, model.getRejectCount());
        assertEquals(PrizePayoutRequestModel.MANUAL_RESOLUTION_NOTE, model.getRejectReason());
    }

    @Test
    @DisplayName("in-person reject does not use online lock counter")
    void markRejected_inPerson_ignoresRetryCap() {
        PrizePayoutRequestModel model = PrizePayoutRequestModel.builder()
                .channel(PrizePayoutChannel.IN_PERSON)
                .status(PrizePayoutRequestStatus.PENDING)
                .grossAmount(BigDecimal.TEN)
                .build();
        model.markRejected("Thiếu giấy tờ", UUID.randomUUID(), 99, 3);

        assertEquals(PrizePayoutRequestStatus.REJECTED, model.getStatus());
        assertEquals(0, model.getRejectCount());
        assertTrue(model.getRejectReason().contains("Thiếu giấy tờ"));
    }

    @Test
    void markApproved_fromPending() {
        PrizePayoutRequestModel model = PrizePayoutRequestModel.builder()
                .status(PrizePayoutRequestStatus.PENDING)
                .build();
        model.markApproved(UUID.randomUUID());
        assertEquals(PrizePayoutRequestStatus.APPROVED, model.getStatus());
    }

    @Test
    void markRejected_fromApproved() {
        PrizePayoutRequestModel model = PrizePayoutRequestModel.builder()
                .channel(PrizePayoutChannel.IN_PERSON)
                .status(PrizePayoutRequestStatus.APPROVED)
                .build();
        model.markRejected("Sai giấy tờ", UUID.randomUUID(), 0, 3);
        assertEquals(PrizePayoutRequestStatus.REJECTED, model.getStatus());
    }

    @Test
    void markCompleted_fromApproved() {
        PrizePayoutRequestModel model = PrizePayoutRequestModel.builder()
                .status(PrizePayoutRequestStatus.APPROVED)
                .build();
        model.markCompleted(UUID.randomUUID(), PrizePayoutPaymentMethod.CASH, null);
        assertEquals(PrizePayoutRequestStatus.COMPLETED, model.getStatus());
    }

    @Test
    void markApproved_fromCompleted_fails() {
        PrizePayoutRequestModel model = PrizePayoutRequestModel.builder()
                .status(PrizePayoutRequestStatus.COMPLETED)
                .build();
        assertThrows(DomainException.class, () -> model.markApproved(UUID.randomUUID()));
    }

    private static PrizePayoutRequestModel pendingOnline() {
        return PrizePayoutRequestModel.builder()
                .channel(PrizePayoutChannel.ONLINE)
                .status(PrizePayoutRequestStatus.PENDING)
                .grossAmount(BigDecimal.TEN)
                .build();
    }
}
