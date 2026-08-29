package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimRejectionReason;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionSettlementStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PrizeClaimSubmissionModelTest {

    private static final UUID STAFF_A = UUID.randomUUID();
    private static final UUID STAFF_B = UUID.randomUUID();

    // ─── Maker-checker tests ───────────────────────────────────────────────

    @Nested
    @DisplayName("Maker-checker: confirm()")
    class ConfirmTests {

        @Test
        @DisplayName("confirmedBy == submittedBy throws SegregationOfDutiesViolationException")
        void confirm_sameStaff_throws() {
            PrizeClaimSubmissionModel model = draft(STAFF_A);
            model.submit(STAFF_A);

            DomainException ex = assertThrows(DomainException.class, () ->
                    model.confirm("REF-001", "https://evidence.com/ref.jpg", STAFF_A));

            assertTrue(ex.getErrorCode().getCode().contains("ORD_048"));
        }

        @Test
        @DisplayName("confirmedBy != submittedBy succeeds")
        void confirm_differentStaff_succeeds() {
            PrizeClaimSubmissionModel model = draft(STAFF_A);
            model.submit(STAFF_A);
            model.confirm("REF-001", "https://evidence.com/ref.jpg", STAFF_B);

            assertEquals(PrizeClaimSubmissionStatus.CONFIRMED, model.getStatus());
            assertEquals(STAFF_B, model.getConfirmedBy());
        }

        @Test
        @DisplayName("confirmationReference required")
        void confirm_noRef_throws() {
            PrizeClaimSubmissionModel model = draft(STAFF_A);
            model.submit(STAFF_A);

            assertThrows(DomainException.class, () ->
                    model.confirm(null, "https://evidence.com/ref.jpg", STAFF_B));
            assertThrows(DomainException.class, () ->
                    model.confirm("", "https://evidence.com/ref.jpg", STAFF_B));
        }

        @Test
        @DisplayName("confirmationEvidence required")
        void confirm_noEvidence_throws() {
            PrizeClaimSubmissionModel model = draft(STAFF_A);
            model.submit(STAFF_A);

            assertThrows(DomainException.class, () ->
                    model.confirm("REF-001", null, STAFF_B));
            assertThrows(DomainException.class, () ->
                    model.confirm("REF-001", "", STAFF_B));
        }
    }

    @Nested
    @DisplayName("Maker-checker: complete()")
    class CompleteTests {

        @Test
        @DisplayName("completedBy == submittedBy throws SegregationOfDutiesViolationException")
        void complete_sameStaff_throws() {
            PrizeClaimSubmissionModel model = draft(STAFF_A);
            model.submit(STAFF_A);
            model.confirm("REF-001", "https://evidence.com/ref.jpg", STAFF_B);
            model.markPaymentPending();

            DomainException ex =             assertThrows(DomainException.class, () ->
                    model.complete(
                            new BigDecimal("1000000"),
                            List.of("https://payment.com/receipt.jpg"),
                            "note",
                            STAFF_A));

            assertTrue(ex.getErrorCode().getCode().contains("ORD_048"));
        }

        @Test
        @DisplayName("completedBy != submittedBy succeeds")
        void complete_differentStaff_succeeds() {
            PrizeClaimSubmissionModel model = draft(STAFF_A);
            model.submit(STAFF_A);
            model.confirm("REF-001", "https://evidence.com/ref.jpg", STAFF_B);
            model.markPaymentPending();
            model.complete(
                    new BigDecimal("1000000"),
                    List.of("https://payment.com/receipt.jpg"),
                    "note",
                    STAFF_B);

            assertEquals(PrizeClaimSubmissionStatus.COMPLETED, model.getStatus());
        }

        @Test
        @DisplayName("paymentEvidenceUrls required")
        void complete_noEvidence_throws() {
            PrizeClaimSubmissionModel model = draft(STAFF_A);
            model.submit(STAFF_A);
            model.confirm("REF-001", "https://evidence.com/ref.jpg", STAFF_B);
            model.markPaymentPending();

            assertThrows(DomainException.class, () ->
                    model.complete(new BigDecimal("1000000"), List.of(), "note", STAFF_B));
            assertThrows(DomainException.class, () ->
                    model.complete(new BigDecimal("1000000"), null, "note", STAFF_B));
        }
    }

    @Nested
    @DisplayName("Settlement logic")
    class SettlementTests {

        @Test
        @DisplayName("FULL when paidAmount == totalNetClaimAmount")
        void complete_exactMatch_full() {
            PrizeClaimSubmissionModel model = draftWithClaim(STAFF_A, new BigDecimal("1000000"));
            submitToCompleted(model, STAFF_A, STAFF_B, new BigDecimal("1000000"));

            assertEquals(PrizeClaimSubmissionSettlementStatus.FULL, model.getSettlementStatus());
            assertEquals(BigDecimal.ZERO, model.getSettlementDifferenceAmount());
        }

        @Test
        @DisplayName("UNDERPAID when paidAmount < totalNetClaimAmount")
        void complete_underpaid_underpaid() {
            PrizeClaimSubmissionModel model = draftWithClaim(STAFF_A, new BigDecimal("1000000"));
            submitToCompleted(model, STAFF_A, STAFF_B, new BigDecimal("800000"));

            assertEquals(PrizeClaimSubmissionSettlementStatus.UNDERPAID, model.getSettlementStatus());
            assertEquals(new BigDecimal("200000"), model.getSettlementDifferenceAmount());
        }

        @Test
        @DisplayName("OVERPAID when paidAmount > totalNetClaimAmount")
        void complete_overpaid_overpaid() {
            PrizeClaimSubmissionModel model = draftWithClaim(STAFF_A, new BigDecimal("1000000"));
            submitToCompleted(model, STAFF_A, STAFF_B, new BigDecimal("1200000"));

            assertEquals(PrizeClaimSubmissionSettlementStatus.OVERPAID, model.getSettlementStatus());
            assertEquals(new BigDecimal("200000"), model.getSettlementDifferenceAmount());
        }
    }

    // ─── Cancel tests ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("Cancel")
    class CancelTests {

        @Test
        @DisplayName("DRAFT cancel: no reason required, no maker-checker")
        void cancel_draft_noReason_succeeds() {
            PrizeClaimSubmissionModel model = draft(STAFF_A);

            model.cancel(null, STAFF_A, null);

            assertEquals(PrizeClaimSubmissionStatus.CANCELLED, model.getStatus());
            assertEquals(STAFF_A, model.getCancelledBy());
        }

        @Test
        @DisplayName("SUBMITTED cancel: reason required + maker-checker")
        void cancel_submitted_requiresReasonAndApprover() {
            PrizeClaimSubmissionModel model = draft(STAFF_A);
            model.submit(STAFF_A);

            // Missing reason
            assertThrows(DomainException.class, () ->
                    model.cancel(null, STAFF_B, STAFF_B));

            // Missing approver
            assertThrows(DomainException.class, () ->
                    model.cancel("Sai serial", STAFF_B, null));

            // Same as submittedBy
            assertThrows(DomainException.class, () ->
                    model.cancel("Sai serial", STAFF_A, STAFF_A));
        }

        @Test
        @DisplayName("SUBMITTED cancel: valid reason + different approver succeeds")
        void cancel_submitted_validApprover_succeeds() {
            PrizeClaimSubmissionModel model = draft(STAFF_A);
            model.submit(STAFF_A);

            model.cancel("Sai serial", STAFF_B, STAFF_B);

            assertEquals(PrizeClaimSubmissionStatus.CANCELLED, model.getStatus());
            assertEquals("Sai serial", model.getCancelReason());
            assertEquals(STAFF_B, model.getApprovedBy());
        }

        @Test
        @DisplayName("COMPLETED cannot be cancelled")
        void cancel_completed_throws() {
            PrizeClaimSubmissionModel model = draft(STAFF_A);
            submitToCompleted(model, STAFF_A, STAFF_B, new BigDecimal("1000000"));

            assertThrows(DomainException.class, () ->
                    model.cancel("Sai serial", STAFF_B, STAFF_B));
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────

    private PrizeClaimSubmissionModel draft(UUID submittedBy) {
        return PrizeClaimSubmissionModel.builder()
                .id(1L)
                .submissionCode("PCS-20260827-ABC123")
                .status(PrizeClaimSubmissionStatus.DRAFT)
                .submittedBy(submittedBy)
                .build();
    }

    private PrizeClaimSubmissionModel draftWithClaim(UUID submittedBy, BigDecimal netClaim) {
        return PrizeClaimSubmissionModel.builder()
                .id(1L)
                .submissionCode("PCS-20260827-ABC123")
                .status(PrizeClaimSubmissionStatus.DRAFT)
                .submittedBy(submittedBy)
                .totalNetClaimAmount(netClaim)
                .build();
    }

    private void submitToCompleted(
            PrizeClaimSubmissionModel model,
            UUID submittedBy,
            UUID completedBy,
            BigDecimal paidAmount) {
        model.submit(submittedBy);
        model.confirm("REF-001", "https://evidence.com/ref.jpg",
                submittedBy.equals(STAFF_A) ? STAFF_B : submittedBy);
        model.markPaymentPending();
        model.complete(
                paidAmount,
                List.of("https://payment.com/receipt.jpg"),
                "settlement note",
                completedBy);
    }
}
