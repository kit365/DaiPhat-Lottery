package com.daiphat.coreapi.domain.model.payout;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PrizePayoutPartialPayoutModelTest {

    private static final Long REQUEST_ID = 1L;
    private static final UUID AGENCY_ID = UUID.randomUUID();

    private PrizePayoutPartialPayoutModel model(
            BigDecimal total,
            BigDecimal paidToDate,
            PrizePayoutRequestStatus status) {
        return new PrizePayoutPartialPayoutModel(
                REQUEST_ID, total, paidToDate, status, AGENCY_ID);
    }

    // ─── remainingAmount ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("remainingAmount()")
    class RemainingAmountTests {

        @Test
        @DisplayName("full payment → remaining = 0")
        void fullPayment_zeroRemaining() {
            PrizePayoutPartialPayoutModel m = model(
                    new BigDecimal("1000000"),
                    new BigDecimal("1000000"),
                    PrizePayoutRequestStatus.COMPLETED);
            assertEquals(BigDecimal.ZERO, m.remainingAmount());
        }

        @Test
        @DisplayName("partial payment → remaining = total - paid")
        void partialPayment_correctRemaining() {
            PrizePayoutPartialPayoutModel m = model(
                    new BigDecimal("1000000"),
                    new BigDecimal("400000"),
                    PrizePayoutRequestStatus.AWAITING_FUND);
            assertEquals(new BigDecimal("600000"), m.remainingAmount());
        }
    }

    // ─── validateInstallmentAmount ───────────────────────────────────────────

    @Nested
    @DisplayName("validateInstallmentAmount() — guard vs remainingAmount")
    class ValidateInstallmentTests {

        @Test
        @DisplayName("amount <= remainingAmount → OK (no exception)")
        void amountWithinRemaining_noException() {
            PrizePayoutPartialPayoutModel m = model(
                    new BigDecimal("1000000"),
                    new BigDecimal("400000"),
                    PrizePayoutRequestStatus.AWAITING_FUND);
            m.validateInstallmentAmount(new BigDecimal("600000"));
            m.validateInstallmentAmount(new BigDecimal("100000"));
        }

        @Test
        @DisplayName("amount > remainingAmount → AmountExceedsRemainingException")
        void amountExceedsRemaining_throws() {
            PrizePayoutPartialPayoutModel m = model(
                    new BigDecimal("1000000"),
                    new BigDecimal("400000"),
                    PrizePayoutRequestStatus.AWAITING_FUND);
            DomainException ex = assertThrows(DomainException.class, () ->
                    m.validateInstallmentAmount(new BigDecimal("600001")));
            assertTrue(ex.getMessage().contains("INVALID_INPUT"));
        }

        @Test
        @DisplayName("zero or null amount → throws")
        void zeroAmount_throws() {
            PrizePayoutPartialPayoutModel m = model(
                    new BigDecimal("1000000"),
                    new BigDecimal("400000"),
                    PrizePayoutRequestStatus.AWAITING_FUND);
            assertThrows(DomainException.class, () -> m.validateInstallmentAmount(BigDecimal.ZERO));
            assertThrows(DomainException.class, () -> m.validateInstallmentAmount(null));
        }
    }

    // ─── ensureAwaitingFund ────────────────────────────────────────────────

    @Nested
    @DisplayName("ensureAwaitingFund()")
    class EnsureAwaitingFundTests {

        @Test
        @DisplayName("AWAITING_FUND → OK (no exception)")
        void awaitingFund_noException() {
            PrizePayoutPartialPayoutModel m = model(
                    new BigDecimal("1000000"),
                    new BigDecimal("400000"),
                    PrizePayoutRequestStatus.AWAITING_FUND);
            m.ensureAwaitingFund();
        }

        @Test
        @DisplayName("PENDING → throws")
        void pending_throws() {
            PrizePayoutPartialPayoutModel m = model(
                    new BigDecimal("1000000"),
                    BigDecimal.ZERO,
                    PrizePayoutRequestStatus.PENDING);
            DomainException ex = assertThrows(DomainException.class, m::ensureAwaitingFund);
            assertTrue(ex.getMessage().contains("không hợp lệ"));
        }

        @Test
        @DisplayName("COMPLETED → throws")
        void completed_throws() {
            PrizePayoutPartialPayoutModel m = model(
                    new BigDecimal("1000000"),
                    new BigDecimal("1000000"),
                    PrizePayoutRequestStatus.COMPLETED);
            DomainException ex = assertThrows(DomainException.class, m::ensureAwaitingFund);
            assertTrue(ex.getMessage().contains("không hợp lệ"));
        }
    }

    // ─── resolveActualPayoutAmount ──────────────────────────────────────────

    @Nested
    @DisplayName("resolveActualPayoutAmount()")
    class ResolvePayoutAmountTests {

        @Test
        @DisplayName("available >= remaining → returns remainingAmount")
        void enoughFunds_returnsRemaining() {
            PrizePayoutPartialPayoutModel m = model(
                    new BigDecimal("1000000"),
                    new BigDecimal("400000"),
                    PrizePayoutRequestStatus.AWAITING_FUND);
            assertEquals(
                    new BigDecimal("600000"),
                    m.resolveActualPayoutAmount(new BigDecimal("900000")));
        }

        @Test
        @DisplayName("available < remaining → returns availableBalance")
        void insufficientFunds_returnsAvailable() {
            PrizePayoutPartialPayoutModel m = model(
                    new BigDecimal("1000000"),
                    new BigDecimal("400000"),
                    PrizePayoutRequestStatus.AWAITING_FUND);
            assertEquals(
                    new BigDecimal("300000"),
                    m.resolveActualPayoutAmount(new BigDecimal("300000")));
        }

        @Test
        @DisplayName("zero balance → returns 0")
        void zeroBalance_returnsZero() {
            PrizePayoutPartialPayoutModel m = model(
                    new BigDecimal("1000000"),
                    new BigDecimal("400000"),
                    PrizePayoutRequestStatus.AWAITING_FUND);
            assertEquals(BigDecimal.ZERO, m.resolveActualPayoutAmount(BigDecimal.ZERO));
            assertEquals(BigDecimal.ZERO, m.resolveActualPayoutAmount(null));
        }
    }

    // ─── requiresManagerApproval ───────────────────────────────────────────

    @Nested
    @DisplayName("requiresManagerApproval()")
    class ManagerApprovalTests {

        @Test
        @DisplayName("remaining < 10M → false")
        void belowThreshold_false() {
            PrizePayoutPartialPayoutModel m = model(
                    new BigDecimal("10000000"),
                    new BigDecimal("5000000"),
                    PrizePayoutRequestStatus.AWAITING_FUND);
            assertFalse(m.requiresManagerApproval());
        }

        @Test
        @DisplayName("remaining >= 10M → true")
        void atOrAboveThreshold_true() {
            PrizePayoutPartialPayoutModel m = model(
                    new BigDecimal("10000000"),
                    new BigDecimal("0"),
                    PrizePayoutRequestStatus.AWAITING_FUND);
            assertTrue(m.requiresManagerApproval());
        }
    }
}
