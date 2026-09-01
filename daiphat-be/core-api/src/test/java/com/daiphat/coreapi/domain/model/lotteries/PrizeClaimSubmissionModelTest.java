package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnDeliveryMode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PrizeClaimSubmissionModelTest {

    private static final UUID STAFF_A = UUID.randomUUID();
    private static final UUID STAFF_B = UUID.randomUUID();

    @Nested
    @DisplayName("startInspection()")
    class StartInspectionTests {

        @Test
        @DisplayName("DRAFT → INSPECTING")
        void startInspection_fromDraft_succeeds() {
            PrizeClaimSubmissionModel model = draft();
            model.startInspection();
            assertEquals(PrizeClaimSubmissionStatus.INSPECTING, model.getStatus());
        }
    }

    @Nested
    @DisplayName("confirmInspection()")
    class ConfirmInspectionTests {

        @Test
        @DisplayName("INSPECTING → PENDING_HANDOVER")
        void confirmInspection_fromInspecting_succeeds() {
            PrizeClaimSubmissionModel model = inspecting();
            model.confirmInspection(ReturnDeliveryMode.RETAILER_DELIVERS, STAFF_A);
            assertEquals(PrizeClaimSubmissionStatus.PENDING_HANDOVER, model.getStatus());
            assertEquals(ReturnDeliveryMode.RETAILER_DELIVERS, model.getDeliveryMode());
        }
    }

    @Nested
    @DisplayName("confirmHandover()")
    class ConfirmHandoverTests {

        @Test
        @DisplayName("PENDING_HANDOVER → HANDED_OVER")
        void confirmHandover_succeeds() {
            PrizeClaimSubmissionModel model = pendingHandover();
            model.confirmHandover(
                    "https://res.cloudinary.com/demo/image.jpg",
                    null,
                    "BL-001",
                    "Đã nộp",
                    STAFF_A);
            assertEquals(PrizeClaimSubmissionStatus.HANDED_OVER, model.getStatus());
            assertEquals(STAFF_A, model.getHandedOverBy());
        }

        @Test
        @DisplayName("evidence required")
        void confirmHandover_noEvidence_throws() {
            PrizeClaimSubmissionModel model = pendingHandover();
            assertThrows(DomainException.class, () -> model.confirmHandover(null, null, null, null, STAFF_A));
        }
    }

    @Nested
    @DisplayName("cancel()")
    class CancelTests {

        @Test
        @DisplayName("DRAFT → CANCELLED")
        void cancel_draft_succeeds() {
            PrizeClaimSubmissionModel model = draft();
            model.cancel("Không cần nữa", STAFF_A);
            assertEquals(PrizeClaimSubmissionStatus.CANCELLED, model.getStatus());
        }

        @Test
        @DisplayName("PENDING_HANDOVER can be cancelled")
        void cancel_pendingHandover_succeeds() {
            PrizeClaimSubmissionModel model = pendingHandover();
            model.cancel("Lý do", STAFF_A);
            assertEquals(PrizeClaimSubmissionStatus.CANCELLED, model.getStatus());
        }

        @Test
        @DisplayName("HANDED_OVER cannot be cancelled")
        void cancel_handedOver_throws() {
            PrizeClaimSubmissionModel model = handedOver();
            assertThrows(DomainException.class, () -> model.cancel("Lý do", STAFF_B));
        }
    }

    @Nested
    @DisplayName("close()")
    class CloseTests {

        @Test
        @DisplayName("HANDED_OVER → CLOSED")
        void close_handedOver_succeeds() {
            PrizeClaimSubmissionModel model = handedOver();
            model.close();
            assertEquals(PrizeClaimSubmissionStatus.CLOSED, model.getStatus());
        }

        @Test
        @DisplayName("DRAFT cannot be closed")
        void close_draft_throws() {
            PrizeClaimSubmissionModel model = draft();
            assertThrows(DomainException.class, model::close);
        }
    }

    private PrizeClaimSubmissionModel draft() {
        return PrizeClaimSubmissionModel.builder()
                .id(1L)
                .submissionCode("PCS-20260830-ABC123")
                .status(PrizeClaimSubmissionStatus.DRAFT)
                .build();
    }

    private PrizeClaimSubmissionModel inspecting() {
        return PrizeClaimSubmissionModel.builder()
                .id(1L)
                .submissionCode("PCS-20260830-ABC123")
                .status(PrizeClaimSubmissionStatus.INSPECTING)
                .build();
    }

    private PrizeClaimSubmissionModel pendingHandover() {
        return PrizeClaimSubmissionModel.builder()
                .id(1L)
                .submissionCode("PCS-20260830-ABC123")
                .status(PrizeClaimSubmissionStatus.PENDING_HANDOVER)
                .deliveryMode(ReturnDeliveryMode.RETAILER_DELIVERS)
                .build();
    }

    private PrizeClaimSubmissionModel handedOver() {
        return PrizeClaimSubmissionModel.builder()
                .id(1L)
                .submissionCode("PCS-20260830-ABC123")
                .status(PrizeClaimSubmissionStatus.HANDED_OVER)
                .handoverEvidenceUrl("https://res.cloudinary.com/demo/image.jpg")
                .handedOverBy(STAFF_A)
                .build();
    }
}
