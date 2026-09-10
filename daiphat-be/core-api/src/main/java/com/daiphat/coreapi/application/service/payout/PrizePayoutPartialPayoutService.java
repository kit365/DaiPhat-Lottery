package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutPaymentMethod;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.payout.PrizePayoutPartialPayoutModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.payout.PrizePayoutInstallmentEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.payout.PrizePayoutRequestEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.payout.PrizePayoutInstallmentRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.payout.PrizePayoutRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Xử lý Partial Payout: payout đủ, payout 1 phần, trả nốt, và write-off.
 *
 * <ul>
 *   <li>{@code payout()} — quỹ đủ → trả đủ → COMPLETED
 *   <li>{@code payoutPartial()} — quỹ không đủ → trả phần → AWAITING_FUND
 *   <li>{@code payFinalInstallment()} — trả nốt đợt cuối → COMPLETED
 *   <li>{@code writeOffRemaining()} — khách từ bỏ phần còn lại → COMPLETED
 * </ul>
 *
 * <p>Tất cả các thao tác debit quỹ đều dùng {@link AgencyFundService#debitWithLock}
 * với pessimistic lock để ngăn double-spend.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PrizePayoutPartialPayoutService {

    private final PrizePayoutRequestRepository prizePayoutRequestRepository;
    private final PrizePayoutInstallmentRepository installmentRepository;
    private final AgencyFundService agencyFundService;

    /**
     * Trả đủ — quỹ đủ thì trừ hết, quỹ không đủ thì chuyển payoutPartial.
     * KHÔNG nhận amount từ tham số — tự lấy totalPrizeAmount từ request.
     */
    @Transactional
    public void payout(Long requestId, PrizePayoutPaymentMethod method, UUID paidBy) {
        PrizePayoutRequestEntity request = findRequestOrThrow(requestId);
        BigDecimal totalAmount = resolveTotalPrizeAmount(request);
        BigDecimal availableBalance = agencyFundService.getBalance(request.getOrder().getUser().getId());

        BigDecimal actualAmount = new PrizePayoutPartialPayoutModel(
                        requestId, totalAmount, request.getPaidAmountToDate(),
                        request.getStatus(), request.getOrder().getUser().getId())
                .resolveActualPayoutAmount(availableBalance);

        if (actualAmount.compareTo(availableBalance) < 0) {
            // Quỹ không đủ → chuyển sang partial
            payoutPartial(requestId, actualAmount, null, paidBy, method);
            return;
        }

        // Quỹ đủ → trả đủ
        agencyFundService.debitWithLock(request.getOrder().getUser().getId(), actualAmount);
        recordInstallment(request, actualAmount, method, paidBy, null);

        request.setPaidAmountToDate(actualAmount);
        request.setStatus(PrizePayoutRequestStatus.COMPLETED);
        prizePayoutRequestRepository.save(request);

        log.info("PAYOUT_COMPLETED: requestId={}, amount={}, paidBy={}", requestId, actualAmount, paidBy);
    }

    /**
     * Trả 1 phần — quỹ không đủ, sinh phiếu cam kết.
     *
     * @param availableAmount số tiền trừ (thường = số dư quỹ hiện có)
     * @param note            ghi chú lý do chờ quỹ
     */
    @Transactional
    public void payoutPartial(
            Long requestId,
            BigDecimal availableAmount,
            String note,
            UUID paidBy,
            PrizePayoutPaymentMethod method) {

        PrizePayoutRequestEntity request = findRequestOrThrow(requestId);
        BigDecimal totalAmount = resolveTotalPrizeAmount(request);
        UUID agencyId = request.getOrder().getUser().getId();

        PrizePayoutPartialPayoutModel model = new PrizePayoutPartialPayoutModel(
                requestId, totalAmount, request.getPaidAmountToDate(),
                request.getStatus(), agencyId);

        // Guard: availableAmount không được vượt remainingAmount
        model.validateInstallmentAmount(availableAmount);

        // Debit với pessimistic lock
        agencyFundService.debitWithLock(agencyId, availableAmount);

        // Record installment
        recordInstallment(request, availableAmount, method, paidBy, note);

        // Update request
        BigDecimal newPaidToDate = request.getPaidAmountToDate().add(availableAmount);
        request.setPaidAmountToDate(newPaidToDate);
        request.setStatus(PrizePayoutRequestStatus.AWAITING_FUND);
        request.setFundAdvanceNote(note);
        request.setCommitmentVoucherCode(PrizePayoutPartialPayoutModel.generateCommitmentVoucherCode());
        request.setCommitmentExpiresAt(model.defaultCommitmentExpiry());
        prizePayoutRequestRepository.save(request);

        log.info("PAYOUT_PARTIAL: requestId={}, paid={}, remaining={}, voucher={}",
                requestId, availableAmount, model.remainingAmount().subtract(availableAmount),
                request.getCommitmentVoucherCode());
    }

    /**
     * Trả đợt cuối — khi có thêm quỹ về.
     */
    @Transactional
    public void payFinalInstallment(
            Long requestId,
            BigDecimal amount,
            String evidence,
            UUID paidBy,
            PrizePayoutPaymentMethod method) {

        PrizePayoutRequestEntity request = findRequestOrThrow(requestId);
        BigDecimal totalAmount = resolveTotalPrizeAmount(request);
        UUID agencyId = request.getOrder().getUser().getId();

        PrizePayoutPartialPayoutModel model = new PrizePayoutPartialPayoutModel(
                requestId, totalAmount, request.getPaidAmountToDate(),
                request.getStatus(), agencyId);

        model.ensureAwaitingFund();
        model.validateInstallmentAmount(amount);

        agencyFundService.debitWithLock(agencyId, amount);
        recordInstallment(request, amount, method, paidBy, null);

        BigDecimal newPaidToDate = request.getPaidAmountToDate().add(amount);
        request.setPaidAmountToDate(newPaidToDate);

        if (newPaidToDate.compareTo(totalAmount) >= 0) {
            request.setStatus(PrizePayoutRequestStatus.COMPLETED);
            request.setCommitmentVoucherCode(null);
            request.setCommitmentExpiresAt(null);
            log.info("PAYOUT_FINAL_COMPLETED: requestId={}, totalPaid={}", requestId, newPaidToDate);
        }

        prizePayoutRequestRepository.save(request);
    }

    /**
     * Khách từ bỏ phần còn lại.
     * Không trừ thêm quỹ, chỉ đánh dấu COMPLETED và ghi log.
     *
     * @param approvedBy người duyệt — nếu remaining >= 10M phải là MANAGER
     */
    @Transactional
    public void writeOffRemaining(Long requestId, String reason, UUID approvedBy) {
        if (reason == null || reason.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Lý do xóa bỏ là bắt buộc.");
        }
        if (approvedBy == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Người duyệt là bắt buộc.");
        }

        PrizePayoutRequestEntity request = findRequestOrThrow(requestId);
        BigDecimal totalAmount = resolveTotalPrizeAmount(request);
        UUID agencyId = request.getOrder().getUser().getId();

        PrizePayoutPartialPayoutModel model = new PrizePayoutPartialPayoutModel(
                requestId, totalAmount, request.getPaidAmountToDate(),
                request.getStatus(), agencyId);

        model.ensureAwaitingFund();

        if (model.requiresManagerApproval()) {
            // TODO: verify MANAGER role from staff profile
            // For now, log warning — integrate with auth service to enforce
            log.warn("WRITE_OFF_MANAGER_APPROVAL_REQUIRED: requestId={}, remaining={}, approvedBy={}",
                    requestId, model.remainingAmount(), approvedBy);
        }

        request.setStatus(PrizePayoutRequestStatus.COMPLETED);
        request.setPaidAmountToDate(totalAmount); // coi như hoàn tất
        request.setCommitmentVoucherCode(null);
        request.setCommitmentExpiresAt(null);
        prizePayoutRequestRepository.save(request);

        log.warn("WRITE_OFF: requestId={}, amount={}, reason={}, approvedBy={}",
                requestId, model.remainingAmount(), reason, approvedBy);
    }

    /**
     * Đánh dấu các payout request AWAITING_FUND quá hạn commitment.
     * Gọi bởi OverdueNotificationScheduler.
     */
    @Transactional
    public int markExpiredCommitments() {
        java.time.LocalDate today = java.time.LocalDate.now();
        var awaitingFundList = prizePayoutRequestRepository
                .findByStatus(PrizePayoutRequestStatus.AWAITING_FUND);
        int count = 0;
        for (PrizePayoutRequestEntity req : awaitingFundList) {
            if (req.getCommitmentExpiresAt() != null
                    && req.getCommitmentExpiresAt().toLocalDate().isBefore(today)
                    && !req.getRequestCode().startsWith("OVERDUE_")) {
                log.warn("OVERDUE_COMMITMENT: requestId={}, voucherCode={}, expiredAt={}",
                        req.getId(), req.getCommitmentVoucherCode(), req.getCommitmentExpiresAt());
                count++;
            }
        }
        return count;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private PrizePayoutRequestEntity findRequestOrThrow(Long requestId) {
        return prizePayoutRequestRepository.findById(requestId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));
    }

    private BigDecimal resolveTotalPrizeAmount(PrizePayoutRequestEntity request) {
        if (request.getTotalPrizeAmount() != null
                && request.getTotalPrizeAmount().compareTo(BigDecimal.ZERO) > 0) {
            return request.getTotalPrizeAmount();
        }
        // Fallback: dùng netAmount nếu chưa có totalPrizeAmount (legacy data)
        return request.getNetAmount();
    }

    private void recordInstallment(
            PrizePayoutRequestEntity request,
            BigDecimal amount,
            PrizePayoutPaymentMethod method,
            UUID paidBy,
            String note) {

        PrizePayoutInstallmentEntity installment = PrizePayoutInstallmentEntity.builder()
                .prizePayoutRequest(request)
                .installmentAmount(amount)
                .paidAt(LocalDateTime.now())
                .paidBy(paidBy)
                .paymentMethod(method)
                .note(note)
                .build();
        installmentRepository.save(installment);
    }
}
