package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.event.PrizeClaimSubmissionCompletedEvent;
import com.daiphat.coreapi.application.service.payout.AgencyFundService;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.AgencyFundEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SupplierSettlementReceivableEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SupplierSettlementEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.AgencyFundRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.SupplierSettlementRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.SupplierSettlementReceivableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Listener xử lý PrizeClaimSubmissionCompletedEvent.
 *
 * <ul>
 *   <li>Credit agency_funds với paidAmount — đây là nguồn tiền để trả khách sau này
 *   <li>Cập nhật SupplierSettlement liên quan (total_paid_amount)
 *   <li>Nếu UNDERPAID → tạo SupplierSettlementReceivable để tracking công nợ
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PrizeClaimSubmissionCompletedListener {

    private final AgencyFundService agencyFundService;
    private final AgencyFundRepository agencyFundRepository;
    private final SupplierSettlementRepository supplierSettlementRepository;
    private final SupplierSettlementReceivableRepository receivableRepository;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleSubmissionCompleted(PrizeClaimSubmissionCompletedEvent event) {
        if (event.submissionId() == null) {
            return;
        }

        log.info("Handling PrizeClaimSubmissionCompletedEvent: submissionId={}, paidAmount={}",
                event.submissionId(), event.paidAmount());

        // 1. Credit agency_funds
        if (event.agencyId() != null && event.paidAmount() != null
                && event.paidAmount().compareTo(BigDecimal.ZERO) > 0) {
            try {
                agencyFundService.credit(event.agencyId(), event.paidAmount());
                log.info("AGENCY_FUND_CREDITED: agencyId={}, amount={}",
                        event.agencyId(), event.paidAmount());
            } catch (Exception ex) {
                log.error("Failed to credit agency fund: agencyId={}, amount={}, error={}",
                        event.agencyId(), event.paidAmount(), ex.getMessage());
            }
        }

        // 2. Cập nhật SupplierSettlement nếu có
        // (Tìm settlement theo supplier + period, cập nhật total_paid_amount)

        // 3. Nếu UNDERPAID → tạo receivable record (đã xử lý trong service complete() rồi,
        // nhưng giữ lại đây để tham khảo nếu cần tách riêng)
        if (event.settlementStatus() == com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionSettlementStatus.UNDERPAID
                && event.settlementDifferenceAmount() != null
                && event.settlementDifferenceAmount().compareTo(BigDecimal.ZERO) > 0) {
            log.warn("PCS_UNDERPAID: submissionId={}, difference={}",
                    event.submissionId(), event.settlementDifferenceAmount());
        }
    }
}
