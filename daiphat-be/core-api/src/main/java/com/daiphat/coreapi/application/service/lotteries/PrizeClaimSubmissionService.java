package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.PrizeClaimEligibleTicketResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeClaimSubmissionLineResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeClaimSubmissionResponse;
import com.daiphat.coreapi.application.event.PrizeClaimSubmissionCompletedEvent;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimRejectionReason;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionSettlementStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementReceivableStatus;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.lotteries.PrizeClaimSubmissionModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.AgencyFundEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeClaimSubmissionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeClaimSubmissionLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.SupplierSettlementReceivableEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.payout.PrizePayoutRequestEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.AgencyFundRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.PrizeClaimSubmissionLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.PrizeClaimSubmissionRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.SupplierSettlementReceivableRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.payout.PrizePayoutRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Service cho PrizeClaimSubmission: tạo phiếu nộp, thêm/từ chối vé, maker-checker, settlement.
 *
 * <p>Unhappy cases được xử lý:
 * <ul>
 *   <li>Race condition serial: unique index → DataIntegrityViolationException
 *   <li>MismatchedStation: serial.stationId != lotterySupplierId
 *   <li>Maker-checker violation
 *   <li>UNDERPAID/OVERPAID settlement
 *   <li>CANCELLED → WITHDRAWN lines
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PrizeClaimSubmissionService {

    private static final Set<PrizeClaimSubmissionLineStatus> INACTIVE_LINE_STATUSES = Set.of(
            PrizeClaimSubmissionLineStatus.REJECTED_FINAL,
            PrizeClaimSubmissionLineStatus.WITHDRAWN);

    private final PrizeClaimSubmissionRepository submissionRepository;
    private final PrizeClaimSubmissionLineRepository lineRepository;
    private final LotteryTicketSerialRepository serialRepository;
    private final LotteryStationRepository stationRepository;
    private final PrizePayoutRequestRepository payoutRequestRepository;
    private final AgencyFundRepository agencyFundRepository;
    private final SupplierSettlementReceivableRepository receivableRepository;
    private final ApplicationEventPublisher eventPublisher;

    // ─── Submission CRUD ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PrizeClaimSubmissionResponse> list(Long supplierId, String status) {
        PrizeClaimSubmissionStatus parsedStatus = null;
        if (status != null && !status.isBlank()) {
            parsedStatus = PrizeClaimSubmissionStatus.valueOf(status.trim().toUpperCase());
        }
        return submissionRepository.findAllFiltered(supplierId, parsedStatus).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PrizeClaimSubmissionResponse getById(Long submissionId) {
        PrizeClaimSubmissionEntity submission = submissionRepository.findByIdWithSupplier(submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));
        return toResponse(submission);
    }

    @Transactional(readOnly = true)
    public List<PrizeClaimSubmissionLineResponse> getLines(Long submissionId) {
        if (!submissionRepository.existsById(submissionId)) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND);
        }
        return lineRepository.findBySubmissionIdWithSerial(submissionId).stream()
                .map(this::toLineResponse)
                .toList();
    }

    @Transactional
    public PrizeClaimSubmissionEntity createDraft(Long supplierId) {
        LotteryStationEntity supplier = stationRepository.findById(supplierId)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND, "Không tìm thấy nhà đài."));

        String code = generateSubmissionCode();
        PrizeClaimSubmissionEntity submission = PrizeClaimSubmissionEntity.builder()
                .submissionCode(code)
                .lotterySupplier(supplier)
                .status(PrizeClaimSubmissionStatus.DRAFT)
                .build();
        return submissionRepository.save(submission);
    }

    @Transactional(readOnly = true)
    public List<PrizeClaimEligibleTicketResponse> listEligibleTickets(
            Long supplierId,
            LocalDate periodFrom,
            LocalDate periodTo) {
        stationRepository.findById(supplierId)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND, "Không tìm thấy nhà đài."));

        return payoutRequestRepository.findEligibleForPrizeClaimSubmission(
                        supplierId,
                        periodFrom,
                        periodTo,
                        PrizePayoutRequestStatus.COMPLETED,
                        SerialPayoutState.PAID_OUT,
                        INACTIVE_LINE_STATUSES)
                .stream()
                .map(this::toEligibleTicketResponse)
                .toList();
    }

    /**
     * Thêm vé vào phiếu nộp.
     *
     * @throws DomainException(MISMATCHED_STATION) nếu serial không thuộc nhà đài của phiếu
     * @throws DomainException(DATA_INTEGRITY) nếu serial đang ở submission active khác (unique index)
     */
    @Transactional
    public PrizeClaimSubmissionLineEntity addLine(Long submissionId, Long serialId) {
        PrizeClaimSubmissionEntity submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));

        if (submission.getStatus() != PrizeClaimSubmissionStatus.DRAFT) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                    "Chỉ thêm vé khi phiếu đang ở trạng thái DRAFT.");
        }

        LotteryTicketSerialEntity serial = serialRepository.findById(serialId)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));

        // Guard: mismatchedStation
        if (!serial.getStationId().equals(submission.getLotterySupplier().getId())) {
            String serialStation = stationRepository.findById(serial.getStationId())
                    .map(LotteryStationEntity::getName).orElse("không rõ");
            String submissionStation = submission.getLotterySupplier().getName();
            throw new DomainException(ErrorCode.INVALID_INPUT,
                    "Vé không thuộc nhà đài này. Vé thuộc [" + serialStation +
                    "], phiếu nộp cho [" + submissionStation + "].");
        }

        // Guard: vé phải đã trả thưởng cho khách
        if (serial.getPayoutState() != SerialPayoutState.PAID_OUT) {
            throw new DomainException(ErrorCode.INVALID_INPUT,
                    "Vé chưa trả thưởng cho khách. Chỉ thêm vé đã PAID_OUT.");
        }

        PrizePayoutRequestEntity payoutRequest = payoutRequestRepository
                .findBySerial_IdAndStatus(serialId, PrizePayoutRequestStatus.COMPLETED)
                .orElseThrow(() -> new DomainException(ErrorCode.INVALID_INPUT,
                        "Không tìm thấy phiếu trả thưởng COMPLETED cho vé này."));

        PrizeClaimSubmissionLineEntity line = PrizeClaimSubmissionLineEntity.builder()
                .prizeClaimSubmission(submission)
                .prizePayoutRequest(payoutRequest)
                .serial(serial)
                .stationId(serial.getStationId())
                .lineStatus(PrizeClaimSubmissionLineStatus.PENDING)
                .submittedAt(LocalDateTime.now())
                .build();
        enrichLineFromPayout(line, serial, payoutRequest);

        try {
            PrizeClaimSubmissionLineEntity saved = lineRepository.save(line);
            recalculateTotals(submission);
            submissionRepository.save(submission);
            return saved;
        } catch (DataIntegrityViolationException ex) {
            throw new DomainException(ErrorCode.INVALID_INPUT,
                    "Vé đang được xử lý bởi phiếu khác. Vui lòng tải lại danh sách.");
        }
    }

    /**
     * Thêm nhiều vé vào phiếu nộp nháp.
     */
    @Transactional
    public List<PrizeClaimSubmissionLineResponse> addLines(Long submissionId, List<Long> serialIds) {
        if (serialIds == null || serialIds.isEmpty()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Chọn ít nhất một vé.");
        }

        List<PrizeClaimSubmissionLineResponse> added = new ArrayList<>();
        for (Long serialId : serialIds) {
            try {
                added.add(toLineResponse(addLine(submissionId, serialId)));
            } catch (DomainException ex) {
                log.warn("SKIP_ADD_LINE: submissionId={}, serialId={}, reason={}",
                        submissionId, serialId, ex.getMessage());
            }
        }

        if (added.isEmpty()) {
            throw new DomainException(ErrorCode.INVALID_INPUT,
                    "Không thêm được vé nào. Vui lòng tải lại danh sách vé đủ điều kiện.");
        }
        return added;
    }

    private void enrichLineFromPayout(
            PrizeClaimSubmissionLineEntity line,
            LotteryTicketSerialEntity serial,
            PrizePayoutRequestEntity payoutRequest) {
        line.setDrawDate(serial.getDrawDate());
        line.setPrizeCode(payoutRequest.getPrizeCode());
        line.setPrizeDisplayName(payoutRequest.getPrizeDisplayName());
        line.setGrossPrizeAmount(payoutRequest.getGrossAmount());
        line.setNetClaimAmount(payoutRequest.getGrossAmount());
        line.setCommissionAmount(payoutRequest.getCommissionAmount());
        line.setTicketSerialNumber(serial.getSerialNumber());
        if (serial.getTicket() != null) {
            line.setTicketNumbers(serial.getTicket().getNumbers());
        }
    }

    private PrizeClaimEligibleTicketResponse toEligibleTicketResponse(PrizePayoutRequestEntity payoutRequest) {
        LotteryTicketSerialEntity serial = payoutRequest.getSerial();
        return PrizeClaimEligibleTicketResponse.builder()
                .prizePayoutRequestId(payoutRequest.getId())
                .payoutRequestCode(payoutRequest.getRequestCode())
                .serialId(serial.getId())
                .serialNumber(serial.getSerialNumber())
                .ticketNumbers(serial.getTicket() != null ? serial.getTicket().getNumbers() : null)
                .stationId(serial.getStationId())
                .drawDate(serial.getDrawDate())
                .prizeCode(payoutRequest.getPrizeCode())
                .prizeDisplayName(payoutRequest.getPrizeDisplayName())
                .grossPrizeAmount(payoutRequest.getGrossAmount())
                .netClaimAmount(payoutRequest.getGrossAmount())
                .commissionAmount(payoutRequest.getCommissionAmount())
                .payoutCompletedAt(payoutRequest.getCompletedAt())
                .build();
    }

    /**
     * Từ chối vé — nhà đài không chấp nhận.
     *
     * @param type    "FINAL" hoặc "RETRYABLE" — kiểm soát trạng thái line + serial lock
     * @param reason  PrizeClaimRejectionReason — lý do chi tiết để log/tracking
     * @param note    ghi chú thêm
     * <ul>
     *   <li>type = "RETRYABLE": line → REJECTED_RETRYABLE, serial được giải phóng
     *   <li>type = "FINAL": line → REJECTED_FINAL, serial → LOCKED_FRAUD_SUSPECTED
     * </ul>
     */
    @Transactional
    public void rejectLine(Long lineId, String type, PrizeClaimRejectionReason reason, String note) {
        PrizeClaimSubmissionLineEntity line = lineRepository.findById(lineId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));

        if (line.getPrizeClaimSubmission().getStatus() != PrizeClaimSubmissionStatus.SUBMITTED) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                    "Chỉ từ chối vé khi phiếu đang SUBMITTED.");
        }

        line.setRejectionReason(reason);
        line.setRejectionNote(note);

        boolean isFinal = "FINAL".equalsIgnoreCase(type);
        if (isFinal) {
            line.setLineStatus(PrizeClaimSubmissionLineStatus.REJECTED_FINAL);
            serialRepository.findById(line.getSerial().getId()).ifPresent(serial -> {
                serial.setPayoutState(
                        com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState.LOCKED_FRAUD_SUSPECTED);
                serialRepository.save(serial);
            });
        } else {
            line.setLineStatus(PrizeClaimSubmissionLineStatus.REJECTED_RETRYABLE);
        }
        lineRepository.save(line);
        log.info("LINE_REJECTED: lineId={}, type={}, reason={}", lineId, type, reason);
    }

    @Transactional
    public void removeLine(Long submissionId, Long lineId) {
        PrizeClaimSubmissionEntity submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));

        if (submission.getStatus() != PrizeClaimSubmissionStatus.DRAFT) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                    "Chỉ xóa vé khi phiếu đang ở trạng thái DRAFT.");
        }

        lineRepository.deleteById(lineId);
        recalculateTotals(submission);
        submissionRepository.save(submission);
    }

    @Transactional
    public void submit(Long submissionId, UUID submittedBy) {
        PrizeClaimSubmissionEntity submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));

        PrizeClaimSubmissionModel model = toModel(submission);
        model.submit(submittedBy);
        applyModel(submission, model);
        submissionRepository.save(submission);
    }

    /**
     * Xác nhận từ nhà đài — maker-checker bắt buộc.
     */
    @Transactional
    public void confirm(Long submissionId, String confRef, String confEvidence, UUID confirmedBy) {
        PrizeClaimSubmissionEntity submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));

        PrizeClaimSubmissionModel model = toModel(submission);
        model.confirm(confRef, confEvidence, confirmedBy);
        applyModel(submission, model);

        // Recalculate totals from lines
        recalculateTotals(submission);
        submissionRepository.save(submission);
    }

    @Transactional
    public void markPaymentPending(Long submissionId) {
        PrizeClaimSubmissionEntity submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));

        PrizeClaimSubmissionModel model = toModel(submission);
        model.markPaymentPending();
        applyModel(submission, model);
        submission.setPaymentDeadline(LocalDate.now().plusDays(7));
        submissionRepository.save(submission);
    }

    /**
     * Hoàn thành — xử lý settlement và ghi nhận tiền về.
     */
    @Transactional
    public void complete(
            Long submissionId,
            BigDecimal paidAmount,
            List<String> paymentEvidenceUrls,
            String paymentNote,
            UUID completedBy) {

        PrizeClaimSubmissionEntity submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));

        PrizeClaimSubmissionModel model = toModel(submission);
        model.complete(paidAmount, paymentEvidenceUrls, paymentNote, completedBy);
        applyModel(submission, model);

        // Update line statuses to PAID
        lineRepository.findByPrizeClaimSubmissionId(submissionId).forEach(line -> {
            line.setLineStatus(PrizeClaimSubmissionLineStatus.PAID);
            lineRepository.save(line);
        });

        // Settlement: nếu UNDERPAID → tạo công nợ
        if (model.getSettlementStatus() == PrizeClaimSubmissionSettlementStatus.UNDERPAID) {
            createOutstandingReceivable(submission, model.getSettlementDifferenceAmount());
        }

        // Credit agency_funds: paidAmount vào quỹ đại lý
        UUID agencyId = resolveAgencyId(submission);
        if (agencyId != null && model.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
            creditAgencyFund(agencyId, model.getPaidAmount());
        }

        submissionRepository.save(submission);

        // Publish event for async processing (credit agency, update supplier settlement)
        publishSubmissionCompletedEvent(submission, model, agencyId);

        log.info("PCS_COMPLETED: submissionId={}, paidAmount={}, settlement={}",
                submissionId, model.getPaidAmount(), model.getSettlementStatus());
    }

    /**
     * Hủy phiếu — nếu SUBMITTED+ phải có maker-checker.
     * Đồng thời set tất cả line → WITHDRAWN để giải phóng serial.
     */
    @Transactional
    public void cancel(Long submissionId, String reason, UUID cancelledBy, UUID approvedBy) {
        PrizeClaimSubmissionEntity submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));

        PrizeClaimSubmissionModel model = toModel(submission);
        model.cancel(reason, cancelledBy, approvedBy);
        applyModel(submission, model);

        // Set all lines → WITHDRAWN
        lineRepository.updateLineStatusBySubmissionId(submissionId, PrizeClaimSubmissionLineStatus.WITHDRAWN);

        submissionRepository.save(submission);
        log.info("PCS_CANCELLED: submissionId={}, reason={}", submissionId, reason);
    }

    // ─── Settlement ──────────────────────────────────────────────────────

    /**
     * Đóng khoản nợ nhà đài — gọi khi nhà đài trả bù ở kỳ sau.
     * Dùng pessimistic lock trên dòng outstanding để tránh race condition.
     */
    @Transactional
    public void settleOutstandingReceivable(
            Long submissionId,
            BigDecimal additionalAmount,
            String evidence,
            UUID settledBy) {

        if (additionalAmount == null || additionalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Số tiền trả bù phải lớn hơn 0.");
        }

        SupplierSettlementReceivableEntity receivable =
                receivableRepository.findBySubmissionIdWithLock(submissionId)
                        .orElseThrow(() -> new DomainException(
                                ErrorCode.PRIZE_PAYOUT_NOT_FOUND,
                                "Không tìm thấy bản ghi công nợ cho submission này."));

        if (additionalAmount.compareTo(receivable.getRemainingAmount()) > 0) {
            throw new DomainException(ErrorCode.INVALID_INPUT,
                    "Số tiền vượt quá số còn nợ. Còn nợ: " + receivable.getRemainingAmount() + " VND");
        }

        receivable.setRemainingAmount(receivable.getRemainingAmount().subtract(additionalAmount));
        if (receivable.getRemainingAmount().compareTo(BigDecimal.ZERO) <= 0) {
            receivable.setStatus(SupplierSettlementReceivableStatus.SETTLED);
            receivable.setSettledAt(LocalDateTime.now());
        } else {
            receivable.setStatus(SupplierSettlementReceivableStatus.PARTIALLY_SETTLED);
        }
        receivable.setSettledBy(settledBy != null ? settledBy.toString() : null);
        receivableRepository.save(receivable);

        log.info("OUTSTANDING_SETTLED: submissionId={}, amount={}, remaining={}, settledBy={}",
                submissionId, additionalAmount, receivable.getRemainingAmount(), settledBy);
    }

    // ─── Scheduled Job Support ─────────────────────────────────────────────

    /**
     * Đánh dấu các submission PAYMENT_PENDING quá hạn.
     * Gọi bởi OverdueNotificationScheduler.
     */
    @Transactional
    public int markOverdueSubmissions() {
        var overdueList = submissionRepository.findPaymentPendingOverdue(
                PrizeClaimSubmissionStatus.PAYMENT_PENDING,
                java.time.LocalDate.now());
        int count = 0;
        for (PrizeClaimSubmissionEntity sub : overdueList) {
            sub.setOverdue(true);
            submissionRepository.save(sub);
            count++;
            log.info("OVERDUE_SUBMISSION: submissionId={}, deadline={}",
                    sub.getId(), sub.getPaymentDeadline());
        }
        return count;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────

    private void createOutstandingReceivable(PrizeClaimSubmissionEntity submission, BigDecimal amount) {
        SupplierSettlementReceivableEntity receivable = SupplierSettlementReceivableEntity.builder()
                .prizeClaimSubmission(submission)
                .lotterySupplier(submission.getLotterySupplier())
                .originalOutstandingAmount(amount)
                .remainingAmount(amount)
                .status(SupplierSettlementReceivableStatus.PENDING)
                .note("Nhà đài trả thiếu - submission: " + submission.getSubmissionCode())
                .build();
        receivableRepository.save(receivable);
        log.info("OUTSTANDING_CREATED: submissionId={}, amount={}", submission.getId(), amount);
    }

    private void publishSubmissionCompletedEvent(
            PrizeClaimSubmissionEntity submission,
            PrizeClaimSubmissionModel model,
            UUID agencyId) {
        eventPublisher.publishEvent(PrizeClaimSubmissionCompletedEvent.builder()
                .submissionId(submission.getId())
                .submissionCode(submission.getSubmissionCode())
                .supplierId(submission.getLotterySupplier() != null ? submission.getLotterySupplier().getId() : null)
                .paidAmount(model.getPaidAmount())
                .totalNetClaimAmount(model.getTotalNetClaimAmount())
                .settlementStatus(model.getSettlementStatus())
                .settlementDifferenceAmount(model.getSettlementDifferenceAmount())
                .agencyId(agencyId)
                .completedBy(model.getCompletedBy())
                .build());
    }

    private void creditAgencyFund(UUID agencyId, BigDecimal amount) {
        AgencyFundEntity fund = agencyFundRepository.findByAgencyId(agencyId)
                .orElseGet(() -> AgencyFundEntity.builder()
                        .agencyId(agencyId)
                        .availableBalance(BigDecimal.ZERO)
                        .updatedAt(LocalDateTime.now())
                        .build());
        fund.setAvailableBalance(fund.getAvailableBalance().add(amount));
        fund.setUpdatedAt(LocalDateTime.now());
        agencyFundRepository.save(fund);
        log.info("AGENCY_FUND_CREDITED: agencyId={}, amount={}", agencyId, amount);
    }

    private UUID resolveAgencyId(PrizeClaimSubmissionEntity submission) {
        // TODO: resolve agency from submission's context (order/retailer)
        // For now, return null — implement based on actual business logic
        return null;
    }

    private void recalculateTotals(PrizeClaimSubmissionEntity submission) {
        List<PrizeClaimSubmissionLineEntity> lines = lineRepository.findByPrizeClaimSubmissionId(submission.getId());
        int ticketCount = 0;
        BigDecimal totalGross = BigDecimal.ZERO;
        BigDecimal totalNet = BigDecimal.ZERO;
        BigDecimal totalCommission = BigDecimal.ZERO;
        for (PrizeClaimSubmissionLineEntity line : lines) {
            if (line.getLineStatus() == PrizeClaimSubmissionLineStatus.CONFIRMED
                    || line.getLineStatus() == PrizeClaimSubmissionLineStatus.PENDING) {
                ticketCount++;
                totalGross = totalGross.add(line.getGrossPrizeAmount() != null ? line.getGrossPrizeAmount() : BigDecimal.ZERO);
                totalNet = totalNet.add(line.getNetClaimAmount() != null ? line.getNetClaimAmount() : BigDecimal.ZERO);
                totalCommission = totalCommission.add(line.getCommissionAmount() != null ? line.getCommissionAmount() : BigDecimal.ZERO);
            }
        }
        submission.setTotalTicketCount(ticketCount);
        submission.setTotalGrossPrizeAmount(totalGross);
        submission.setTotalNetClaimAmount(totalNet);
        submission.setTotalCommissionAmount(totalCommission);
    }

    private PrizeClaimSubmissionModel toModel(PrizeClaimSubmissionEntity entity) {
        return PrizeClaimSubmissionModel.builder()
                .id(entity.getId())
                .submissionCode(entity.getSubmissionCode())
                .lotterySupplierId(entity.getLotterySupplier() != null ? entity.getLotterySupplier().getId() : null)
                .status(entity.getStatus())
                .totalGrossPrizeAmount(entity.getTotalGrossPrizeAmount())
                .totalNetClaimAmount(entity.getTotalNetClaimAmount())
                .totalCommissionAmount(entity.getTotalCommissionAmount())
                .submittedAt(entity.getSubmittedAt())
                .submittedBy(entity.getSubmittedBy())
                .confirmedAt(entity.getConfirmedAt())
                .confirmedBy(entity.getConfirmedBy())
                .completedAt(entity.getCompletedAt())
                .completedBy(entity.getCompletedBy())
                .cancelledAt(entity.getCancelledAt())
                .cancelledBy(entity.getCancelledBy())
                .paidAmount(entity.getPaidAmount())
                .settlementStatus(entity.getSettlementStatus())
                .settlementDifferenceAmount(entity.getSettlementDifferenceAmount())
                .cancelReason(entity.getCancelReason())
                .build();
    }

    private void applyModel(PrizeClaimSubmissionEntity entity, PrizeClaimSubmissionModel model) {
        entity.setStatus(model.getStatus());
        entity.setSubmittedAt(model.getSubmittedAt());
        entity.setSubmittedBy(model.getSubmittedBy());
        entity.setConfirmedAt(model.getConfirmedAt());
        entity.setConfirmedBy(model.getConfirmedBy());
        entity.setCompletedAt(model.getCompletedAt());
        entity.setCompletedBy(model.getCompletedBy());
        entity.setCancelledAt(model.getCancelledAt());
        entity.setCancelledBy(model.getCancelledBy());
        entity.setApprovedBy(model.getApprovedBy());
        entity.setPaidAmount(model.getPaidAmount());
        entity.setSettlementStatus(model.getSettlementStatus());
        entity.setSettlementDifferenceAmount(model.getSettlementDifferenceAmount());
        entity.setCancelReason(model.getCancelReason());
    }

    private String generateSubmissionCode() {
        String date = LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        for (int i = 0; i < 5; i++) {
            String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            String code = "PCS-" + date + "-" + suffix;
            if (!submissionRepository.existsBySubmissionCode(code)) {
                return code;
            }
        }
        throw new DomainException(ErrorCode.INVALID_INPUT, "Không thể tạo mã phiếu nộp.");
    }

    public PrizeClaimSubmissionResponse toResponse(PrizeClaimSubmissionEntity entity) {
        var supplier = entity.getLotterySupplier();
        return PrizeClaimSubmissionResponse.builder()
                .id(entity.getId())
                .submissionCode(entity.getSubmissionCode())
                .supplierId(supplier != null ? supplier.getId() : null)
                .supplierName(supplier != null ? supplier.getName() : null)
                .periodFrom(entity.getPeriodFrom())
                .periodTo(entity.getPeriodTo())
                .totalTicketCount(entity.getTotalTicketCount())
                .totalGrossPrizeAmount(entity.getTotalGrossPrizeAmount())
                .totalNetClaimAmount(entity.getTotalNetClaimAmount())
                .totalCommissionAmount(entity.getTotalCommissionAmount())
                .status(entity.getStatus())
                .submittedAt(entity.getSubmittedAt())
                .submittedBy(entity.getSubmittedBy())
                .confirmedAt(entity.getConfirmedAt())
                .confirmedBy(entity.getConfirmedBy())
                .completedAt(entity.getCompletedAt())
                .completedBy(entity.getCompletedBy())
                .cancelledAt(entity.getCancelledAt())
                .cancelledBy(entity.getCancelledBy())
                .approvedBy(entity.getApprovedBy())
                .confirmationReference(entity.getConfirmationReference())
                .confirmationEvidenceUrl(entity.getConfirmationEvidenceUrl())
                .paymentDeadline(entity.getPaymentDeadline())
                .isOverdue(entity.isOverdue())
                .paidAmount(entity.getPaidAmount())
                .settlementStatus(entity.getSettlementStatus())
                .settlementDifferenceAmount(entity.getSettlementDifferenceAmount())
                .cancelReason(entity.getCancelReason())
                .paymentEvidenceUrls(entity.getPaymentEvidenceUrls())
                .paymentNote(entity.getPaymentNote())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    public PrizeClaimSubmissionLineResponse toLineResponse(PrizeClaimSubmissionLineEntity line) {
        var serial = line.getSerial();
        return PrizeClaimSubmissionLineResponse.builder()
                .id(line.getId())
                .submissionId(line.getPrizeClaimSubmission() != null ? line.getPrizeClaimSubmission().getId() : null)
                .serialId(serial != null ? serial.getId() : null)
                .serialNumber(line.getTicketSerialNumber() != null
                        ? line.getTicketSerialNumber()
                        : serial != null ? serial.getSerialNumber() : null)
                .ticketNumbers(line.getTicketNumbers())
                .stationId(line.getStationId())
                .drawDate(line.getDrawDate())
                .prizeCode(line.getPrizeCode())
                .prizeDisplayName(line.getPrizeDisplayName())
                .grossPrizeAmount(line.getGrossPrizeAmount())
                .netClaimAmount(line.getNetClaimAmount())
                .commissionAmount(line.getCommissionAmount())
                .lineStatus(line.getLineStatus())
                .rejectionReason(line.getRejectionReason())
                .rejectionNote(line.getRejectionNote())
                .build();
    }
}
