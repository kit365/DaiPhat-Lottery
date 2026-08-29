package com.daiphat.coreapi.domain.model.payout;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutPaymentMethod;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Domain logic cho Partial Payout (PrizePayoutRequest).
 *
 * <p>Luồng:
 * <ul>
 *   <li>{@code payout()} — quỹ đủ → trả đủ → COMPLETED
 *   <li>{@code payoutPartial()} — quỹ không đủ → trả 1 phần → AWAITING_FUND
 *   <li>{@code payFinalInstallment()} — trả nốt → COMPLETED
 *   <li>{@code writeOffRemaining()} — khách từ bỏ phần còn lại → COMPLETED
 * </ul>
 *
 * <p>Pessimistic lock (SELECT FOR UPDATE) được áp dụng ở tầng repository/repository adapter,
 * không phải ở domain model này.
 */
@Getter
public class PrizePayoutPartialPayoutModel {

    private static final BigDecimal WRITE_OFF_THRESHOLD = new BigDecimal("10000000");

    private final Long requestId;
    private final BigDecimal totalPrizeAmount;
    private final BigDecimal paidAmountToDate;
    private final PrizePayoutRequestStatus status;
    private final UUID agencyId;

    public PrizePayoutPartialPayoutModel(
            Long requestId,
            BigDecimal totalPrizeAmount,
            BigDecimal paidAmountToDate,
            PrizePayoutRequestStatus status,
            UUID agencyId) {
        this.requestId = requestId;
        this.totalPrizeAmount = totalPrizeAmount;
        this.paidAmountToDate = paidAmountToDate != null ? paidAmountToDate : BigDecimal.ZERO;
        this.status = status;
        this.agencyId = agencyId;
    }

    /** Số tiền còn phải trả. */
    public BigDecimal remainingAmount() {
        return totalPrizeAmount.subtract(paidAmountToDate);
    }

    /**
     * Kiểm tra xem payout request có ở trạng thái chờ quỹ không.
     * Chỉ AWAITING_FUND mới được phép payoutPartial hoặc writeOffRemaining.
     */
    public void ensureAwaitingFund() {
        if (status != PrizePayoutRequestStatus.AWAITING_FUND) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                    "Yêu cầu không ở trạng thái chờ quỹ (AWAITING_FUND). Trạng thái hiện tại: " + status);
        }
    }

    /**
     * Guard: số tiền trả mỗi lần không được vượt remainingAmount.
     * Nếu vượt → throw AmountExceedsRemainingException.
     */
    public void validateInstallmentAmount(BigDecimal installmentAmount) {
        if (installmentAmount == null || installmentAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Số tiền trả phải lớn hơn 0.");
        }
        if (installmentAmount.compareTo(remainingAmount()) > 0) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Số tiền vượt quá số còn phải trả. Còn thiếu: " + remainingAmount() + " VND");
        }
    }

    /**
     * Xác định số tiền payout thực tế cho lần này.
     * Nếu availableBalance >= remainingAmount → trả hết (remainingAmount).
     * Ngược lại → trả hết quỹ hiện có (availableBalance).
     *
     * @param availableBalance số dư khả dụng của agency
     * @return số tiền thực sự trừ
     */
    public BigDecimal resolveActualPayoutAmount(BigDecimal availableBalance) {
        if (availableBalance == null || availableBalance.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        if (availableBalance.compareTo(remainingAmount()) >= 0) {
            return remainingAmount();
        }
        return availableBalance;
    }

    /**
     * Tính commitment voucher expiry — mặc định 7 ngày sau khi tạo.
     */
    public LocalDateTime defaultCommitmentExpiry() {
        return LocalDateTime.now().plusDays(7);
    }

    /**
     * Tạo commitment voucher code.
     * Format: PCK-YYYYMMDD-XXXXXX
     */
    public static String generateCommitmentVoucherCode() {
        String date = java.time.LocalDate.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        return "PCK-" + date + "-" + suffix;
    }

    /**
     * Kiểm tra xem writeOffAmount có vượt ngưỡng manager hay không.
     * Nếu vượt ngưỡng (mặc định 10M) → cần MANAGER role.
     * Ngưỡng >= 10M VND mới cần manager.
     */
    public boolean requiresManagerApproval() {
        return remainingAmount().compareTo(WRITE_OFF_THRESHOLD) >= 0;
    }

    /** Ngưỡng để xác định cần MANAGER duyệt writeOff. */
    public static BigDecimal getWriteOffThreshold() {
        return WRITE_OFF_THRESHOLD;
    }
}
