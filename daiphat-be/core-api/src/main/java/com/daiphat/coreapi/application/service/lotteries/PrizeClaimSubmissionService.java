package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.lotteries.PrizeClaimSubmissionDocument;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmPrizeClaimHandoverRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmPrizeClaimInspectionRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdatePrizeClaimActualReceivedRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeClaimEligibleTicketResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeClaimSubmissionExportResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeClaimSubmissionLineResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeClaimSubmissionResponse;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimLineOutcome;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimRejectionReason;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeClaimSubmissionStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.lotteries.PrizeClaimSubmissionModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeClaimSubmissionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeClaimSubmissionLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.payout.PrizePayoutRequestEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.PrizeClaimSubmissionLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.PrizeClaimSubmissionRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.payout.PrizePayoutRequestRepository;
import com.daiphat.coreapi.shared.util.BusinessDocumentIssuer;
import com.daiphat.coreapi.shared.util.PrizeClaimSubmissionDocumentWriter;
import com.daiphat.coreapi.shared.util.StorageUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service cho PrizeClaimSubmission: kiểm → bàn giao → ghi nhận kết quả từng dòng.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PrizeClaimSubmissionService {

    private static final int MAX_RETRYABLE_REJECTIONS = 2;

    private static final Set<PrizeClaimSubmissionLineStatus> ACTIVE_LINE_STATUSES = EnumSet.of(
            PrizeClaimSubmissionLineStatus.SELECTED,
            PrizeClaimSubmissionLineStatus.INSPECTED,
            PrizeClaimSubmissionLineStatus.AWAITING_OUTCOME);

    private static final Set<PrizeClaimSubmissionStatus> EXPORTABLE_STATUSES = EnumSet.of(
            PrizeClaimSubmissionStatus.PENDING_HANDOVER,
            PrizeClaimSubmissionStatus.HANDED_OVER,
            PrizeClaimSubmissionStatus.CLOSED);

    private static final DateTimeFormatter DATE_DISPLAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATE_TIME_DISPLAY =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final PrizeClaimSubmissionRepository submissionRepository;
    private final PrizeClaimSubmissionLineRepository lineRepository;
    private final LotteryTicketSerialRepository serialRepository;
    private final LotteryStationRepository stationRepository;
    private final PrizePayoutRequestRepository payoutRequestRepository;
    private final PrizeClaimSubmissionDocumentWriter documentWriter;
    private final BusinessDocumentIssuer businessDocumentIssuer;
    private final UserLookupServicePort userLookupServicePort;

    @Transactional(readOnly = true)
    public List<PrizeClaimSubmissionResponse> list(Long supplierId, String status, String search) {
        List<PrizeClaimSubmissionStatus> parsedStatuses = parseStatuses(status);
        String normalizedSearch = search != null && !search.isBlank() ? search.trim() : null;
        List<PrizeClaimSubmissionEntity> submissions = submissionRepository.findAllFiltered(
                supplierId, parsedStatuses, normalizedSearch);
        Map<Long, Integer> pendingOutcomeCounts = loadPendingOutcomeCounts(submissions);
        return submissions.stream()
                .map(entity -> toResponse(entity, pendingOutcomeCounts.getOrDefault(entity.getId(), 0)))
                .toList();
    }

    private List<PrizeClaimSubmissionStatus> parseStatuses(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        if (status.contains(",")) {
            return Arrays.stream(status.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(s -> PrizeClaimSubmissionStatus.valueOf(s.toUpperCase()))
                    .toList();
        }
        return List.of(PrizeClaimSubmissionStatus.valueOf(status.trim().toUpperCase()));
    }

    @Transactional(readOnly = true)
    public PrizeClaimSubmissionResponse getById(Long submissionId) {
        PrizeClaimSubmissionEntity submission = submissionRepository.findByIdWithSupplier(submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));
        return toResponse(submission);
    }

    @Transactional(readOnly = true)
    public long countSubmissionsWithPendingOutcome() {
        return lineRepository.countSubmissionsWithPendingOutcome();
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

    @Transactional(readOnly = true)
    public PrizeClaimSubmissionExportResponse export(Long submissionId) {
        PrizeClaimSubmissionEntity submission = submissionRepository.findByIdWithSupplier(submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));

        if (!EXPORTABLE_STATUSES.contains(submission.getStatus())) {
            throw new DomainException(ErrorCode.PRIZE_CLAIM_EXPORT_NOT_READY);
        }

        List<PrizeClaimSubmissionLineEntity> lines =
                lineRepository.findBySubmissionIdWithSerial(submissionId);
        if (lines.isEmpty()) {
            throw new DomainException(ErrorCode.PRIZE_CLAIM_EXPORT_EMPTY);
        }

        PrizeClaimSubmissionDocument document = assembleDocument(submission, lines);
        return PrizeClaimSubmissionExportResponse.builder()
                .fileName(exportFileName(submission))
                .content(documentWriter.write(document))
                .build();
    }

    private PrizeClaimSubmissionDocument assembleDocument(
            PrizeClaimSubmissionEntity submission,
            List<PrizeClaimSubmissionLineEntity> lines
    ) {
        Map<Long, LotteryStationEntity> stationsById = loadStations(lines);
        List<PrizeClaimSubmissionDocument.TicketLine> ticketLines = new ArrayList<>();
        Map<Long, StationAccumulator> stationTotals = new LinkedHashMap<>();

        for (PrizeClaimSubmissionLineEntity line : lines) {
            LotteryStationEntity station = stationsById.get(line.getStationId());
            String stationCode = station != null ? nullToEmpty(station.getCode()) : "";
            String stationName = station != null ? nullToEmpty(station.getName()) : "";
            String drawDate = line.getDrawDate() != null ? line.getDrawDate().format(DATE_DISPLAY) : "";
            String prizeName = line.getPrizeDisplayName() != null
                    ? line.getPrizeDisplayName()
                    : nullToEmpty(line.getPrizeCode());

            BigDecimal gross = nullSafe(line.getGrossPrizeAmount());
            BigDecimal tax = nullSafe(line.getTaxAmount());
            BigDecimal net = computeSupplierExpectedAmount(gross, tax);

            ticketLines.add(new PrizeClaimSubmissionDocument.TicketLine(
                    stationCode,
                    stationName,
                    drawDate,
                    nullToEmpty(line.getTicketNumbers()),
                    nullToEmpty(line.getTicketSerialNumber()),
                    prizeName,
                    gross,
                    tax,
                    BigDecimal.ZERO,
                    net
            ));

            StationAccumulator accumulator = stationTotals.computeIfAbsent(
                    line.getStationId(),
                    key -> new StationAccumulator(stationCode, stationName));
            accumulator.add(gross, tax, net);
        }

        ticketLines.sort(Comparator
                .comparing(PrizeClaimSubmissionDocument.TicketLine::drawDate)
                .thenComparing(PrizeClaimSubmissionDocument.TicketLine::stationName)
                .thenComparing(PrizeClaimSubmissionDocument.TicketLine::serialNumber));

        List<PrizeClaimSubmissionDocument.StationSummary> stationSummaries = stationTotals.values().stream()
                .map(StationAccumulator::toSummary)
                .sorted(Comparator.comparing(PrizeClaimSubmissionDocument.StationSummary::stationName))
                .toList();

        BusinessDocumentIssuer.Issuer issuer = businessDocumentIssuer.resolve();
        PrizeClaimSubmissionDocument.Party submitter = new PrizeClaimSubmissionDocument.Party(
                issuer.legalName(),
                null,
                issuer.taxCode(),
                issuer.representative(),
                issuer.phone(),
                issuer.email(),
                issuer.address());

        var supplier = submission.getLotterySupplier();
        PrizeClaimSubmissionDocument.Party recipient = supplier != null
                ? new PrizeClaimSubmissionDocument.Party(
                        supplier.getName(),
                        supplier.getCode(),
                        null,
                        null,
                        null,
                        null,
                        supplier.getProvince())
                : new PrizeClaimSubmissionDocument.Party(
                        CONSOLIDATED_SUBMISSION_LABEL,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null);

        String deliveryModeLabel = submission.getDeliveryMode() != null
                ? submission.getDeliveryMode().getLabel()
                : "—";
        String statusLabel = submission.getStatus() != null
                ? submission.getStatus().getLabel()
                : "—";

        return new PrizeClaimSubmissionDocument(
                new PrizeClaimSubmissionDocument.Header(
                        submission.getSubmissionCode(),
                        describePeriod(submission, lines),
                        statusLabel,
                        deliveryModeLabel,
                        submission.getSupplierReference(),
                        submission.getHandoverNote(),
                        formatMoment(submission.getSubmittedAt()),
                        formatMoment(submission.getHandedOverAt()),
                        formatMoment(submission.getCreatedAt())
                ),
                submitter,
                recipient,
                toOperator(submission.getSubmittedBy()),
                toOperator(submission.getHandedOverBy()),
                new PrizeClaimSubmissionDocument.Totals(
                        lines.size(),
                        nullSafe(submission.getTotalGrossPrizeAmount()),
                        nullSafe(submission.getTotalTaxAmount()),
                        BigDecimal.ZERO,
                        computeSupplierExpectedAmount(
                                nullSafe(submission.getTotalGrossPrizeAmount()),
                                nullSafe(submission.getTotalTaxAmount())),
                        stationSummaries.size()
                ),
                List.copyOf(ticketLines),
                stationSummaries
        );
    }

    private Map<Long, LotteryStationEntity> loadStations(List<PrizeClaimSubmissionLineEntity> lines) {
        Set<Long> stationIds = lines.stream()
                .map(PrizeClaimSubmissionLineEntity::getStationId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        if (stationIds.isEmpty()) {
            return Map.of();
        }
        return stationRepository.findAllById(stationIds).stream()
                .collect(Collectors.toMap(LotteryStationEntity::getId, station -> station));
    }

    private String describePeriod(
            PrizeClaimSubmissionEntity submission,
            List<PrizeClaimSubmissionLineEntity> lines
    ) {
        if (submission.getPeriodFrom() != null && submission.getPeriodTo() != null) {
            return submission.getPeriodFrom().format(DATE_DISPLAY)
                    + " – "
                    + submission.getPeriodTo().format(DATE_DISPLAY);
        }
        LocalDate min = lines.stream()
                .map(PrizeClaimSubmissionLineEntity::getDrawDate)
                .filter(date -> date != null)
                .min(LocalDate::compareTo)
                .orElse(null);
        LocalDate max = lines.stream()
                .map(PrizeClaimSubmissionLineEntity::getDrawDate)
                .filter(date -> date != null)
                .max(LocalDate::compareTo)
                .orElse(null);
        if (min == null || max == null) {
            return "—";
        }
        if (min.equals(max)) {
            return min.format(DATE_DISPLAY);
        }
        return min.format(DATE_DISPLAY) + " – " + max.format(DATE_DISPLAY);
    }

    private PrizeClaimSubmissionDocument.Operator toOperator(UUID userId) {
        if (userId == null) {
            return new PrizeClaimSubmissionDocument.Operator(null, null, null, null);
        }
        return userLookupServicePort.findById(userId)
                .map(this::toOperator)
                .orElseGet(() -> new PrizeClaimSubmissionDocument.Operator(null, null, null, null));
    }

    private PrizeClaimSubmissionDocument.Operator toOperator(UserModel user) {
        return new PrizeClaimSubmissionDocument.Operator(
                user.getFullName(),
                user.getRole() == null ? null : user.getRole().getName(),
                user.getPhoneNumber(),
                user.getEmail());
    }

    private String formatMoment(LocalDateTime moment) {
        return moment == null ? null : moment.format(DATE_TIME_DISPLAY);
    }

    private String exportFileName(PrizeClaimSubmissionEntity submission) {
        String code = Optional.ofNullable(submission.getSubmissionCode())
                .orElse("PCS-" + submission.getId());
        return "phieu-nop-" + code.replaceAll("[^A-Za-z0-9._-]", "-") + ".xlsx";
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static final class StationAccumulator {
        private final String stationCode;
        private final String stationName;
        private int ticketCount;
        private BigDecimal gross = BigDecimal.ZERO;
        private BigDecimal tax = BigDecimal.ZERO;
        private BigDecimal net = BigDecimal.ZERO;

        private StationAccumulator(String stationCode, String stationName) {
            this.stationCode = stationCode;
            this.stationName = stationName;
        }

        private void add(BigDecimal grossAmount, BigDecimal taxAmount, BigDecimal netAmount) {
            ticketCount++;
            gross = gross.add(grossAmount);
            tax = tax.add(taxAmount);
            net = net.add(netAmount);
        }

        private PrizeClaimSubmissionDocument.StationSummary toSummary() {
            return new PrizeClaimSubmissionDocument.StationSummary(
                    stationCode,
                    stationName,
                    ticketCount,
                    gross,
                    tax,
                    BigDecimal.ZERO,
                    net);
        }
    }

    @Transactional
    public PrizeClaimSubmissionEntity createDraft() {
        String code = generateSubmissionCode();
        PrizeClaimSubmissionEntity submission = PrizeClaimSubmissionEntity.builder()
                .submissionCode(code)
                .status(PrizeClaimSubmissionStatus.DRAFT)
                .build();
        return submissionRepository.save(submission);
    }

    @Transactional(readOnly = true)
    public List<PrizeClaimEligibleTicketResponse> listEligibleTickets(
            LocalDate periodFrom,
            LocalDate periodTo) {
        LocalDate effectiveFrom = periodFrom != null ? periodFrom : LocalDate.of(1900, 1, 1);
        LocalDate effectiveTo = periodTo != null ? periodTo : LocalDate.of(2100, 12, 31);

        return payoutRequestRepository.findEligibleForPrizeClaimSubmission(
                        effectiveFrom,
                        effectiveTo,
                        PrizePayoutRequestStatus.COMPLETED,
                        SerialPayoutState.PAID_OUT,
                        List.copyOf(ACTIVE_LINE_STATUSES),
                        PrizeClaimSubmissionLineStatus.REJECTED_RETRYABLE)
                .stream()
                .map(this::toEligibleTicketResponse)
                .toList();
    }

    @Transactional
    public PrizeClaimSubmissionLineEntity addLine(Long submissionId, Long serialId) {
        PrizeClaimSubmissionEntity submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));

        if (!submission.getStatus().isOpenForEditing()) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                    "Chỉ thêm vé khi phiếu đang ở trạng thái DRAFT hoặc INSPECTING.");
        }

        LotteryTicketSerialEntity serial = serialRepository.findById(serialId)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));

        if (serial.getPayoutState() != SerialPayoutState.PAID_OUT) {
            throw new DomainException(ErrorCode.INVALID_INPUT,
                    "Vé không đủ điều kiện nộp. Trạng thái payout: " + serial.getPayoutState());
        }

        long retryCount = lineRepository.countBySerialIdAndLineStatus(
                serialId, PrizeClaimSubmissionLineStatus.REJECTED_RETRYABLE);
        if (retryCount >= MAX_RETRYABLE_REJECTIONS) {
            throw new DomainException(ErrorCode.INVALID_INPUT,
                    "Vé đã bị từ chối tối đa số lần cho phép. Không thể thêm vào phiếu nộp.");
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
                .lineStatus(PrizeClaimSubmissionLineStatus.SELECTED)
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

    @Transactional
    public PrizeClaimSubmissionResponse startInspection(Long submissionId) {
        PrizeClaimSubmissionEntity submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));

        if (submission.getStatus() == PrizeClaimSubmissionStatus.INSPECTING) {
            return toResponse(submission);
        }

        PrizeClaimSubmissionModel model = toModel(submission);
        model.startInspection();
        applyModel(submission, model);
        submissionRepository.save(submission);
        log.info("PCS_INSPECTION_STARTED: submissionId={}", submissionId);
        return toResponse(submission);
    }

    @Transactional
    public PrizeClaimSubmissionResponse confirmInspection(
            Long submissionId,
            ConfirmPrizeClaimInspectionRequest request,
            UUID operatorId) {
        PrizeClaimSubmissionEntity submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));

        if (lineRepository.countByPrizeClaimSubmissionId(submissionId) == 0) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Phiếu nộp phải có ít nhất một vé.");
        }

        if (submission.getStatus() == PrizeClaimSubmissionStatus.DRAFT) {
            PrizeClaimSubmissionModel draftModel = toModel(submission);
            draftModel.startInspection();
            applyModel(submission, draftModel);
        }

        List<PrizeClaimSubmissionLineEntity> lines = lineRepository.findByPrizeClaimSubmissionId(submissionId);
        for (PrizeClaimSubmissionLineEntity line : lines) {
            if (line.getLineStatus() != PrizeClaimSubmissionLineStatus.SELECTED) {
                throw new DomainException(ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                        "Tất cả vé phải ở trạng thái đã chọn trước khi xác nhận kiểm.");
            }
            line.setLineStatus(PrizeClaimSubmissionLineStatus.INSPECTED);
            lineRepository.save(line);
        }

        PrizeClaimSubmissionModel model = toModel(submission);
        model.confirmInspection(request.deliveryMode(), operatorId);
        applyModel(submission, model);
        recalculateTotals(submission);
        submissionRepository.save(submission);
        log.info("PCS_INSPECTION_CONFIRMED: submissionId={}, deliveryMode={}", submissionId, request.deliveryMode());
        return toResponse(submission);
    }

    @Transactional
    public PrizeClaimSubmissionResponse confirmHandover(
            Long submissionId,
            ConfirmPrizeClaimHandoverRequest request,
            UUID operatorId) {
        PrizeClaimSubmissionEntity submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));

        String evidenceUrl = requireUploadedUrl(request.handoverEvidenceUrl(), "handoverEvidenceUrl");

        PrizeClaimSubmissionModel model = toModel(submission);
        model.confirmHandover(
                evidenceUrl,
                request.handoverReceiptUrl(),
                request.supplierReference(),
                request.note(),
                operatorId);
        applyModel(submission, model);

        List<PrizeClaimSubmissionLineEntity> lines = lineRepository.findByPrizeClaimSubmissionId(submissionId);
        for (PrizeClaimSubmissionLineEntity line : lines) {
            if (line.getLineStatus() != PrizeClaimSubmissionLineStatus.INSPECTED) {
                throw new DomainException(ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                        "Tất cả vé phải được kiểm xong trước khi bàn giao.");
            }
            line.setLineStatus(PrizeClaimSubmissionLineStatus.AWAITING_OUTCOME);
            line.setSubmittedAt(LocalDateTime.now());
            lineRepository.save(line);
        }

        submissionRepository.save(submission);
        log.info("PCS_HANDOVER_CONFIRMED: submissionId={}", submissionId);
        return toResponse(submission);
    }

    @Transactional
    public PrizeClaimSubmissionResponse updateActualReceivedAmount(
            Long submissionId,
            UpdatePrizeClaimActualReceivedRequest request) {
        PrizeClaimSubmissionEntity submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));

        if (submission.getStatus() == PrizeClaimSubmissionStatus.CANCELLED) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                    "Không thể cập nhật số tiền thực nhận cho phiếu đã hủy.");
        }

        submission.setActualReceivedAmount(request.actualReceivedAmount());
        if (request.actualReceivedEvidenceUrl() != null) {
            String evidenceUrl = request.actualReceivedEvidenceUrl().trim();
            if (evidenceUrl.isEmpty()) {
                submission.setActualReceivedEvidenceUrl(null);
            } else {
                StorageUtils.validateImageEvidenceUrl(evidenceUrl);
                submission.setActualReceivedEvidenceUrl(evidenceUrl);
            }
        }
        submissionRepository.save(submission);
        log.info("PCS_ACTUAL_RECEIVED_UPDATED: submissionId={}, amount={}",
                submissionId, request.actualReceivedAmount());
        return toResponse(submission);
    }

    /**
     * Ghi nhận kết quả xử lý từng vé khi phiếu đang HANDED_OVER.
     */
    @Transactional
    public void recordOutcome(
            Long submissionId,
            Long lineId,
            PrizeClaimLineOutcome outcome,
            PrizeClaimRejectionReason reason,
            String note,
            String outcomeEvidenceUrl) {

        PrizeClaimSubmissionLineEntity line = lineRepository
                .findByIdAndPrizeClaimSubmissionId(lineId, submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));

        PrizeClaimSubmissionEntity submission = line.getPrizeClaimSubmission();
        if (submission.getStatus() != PrizeClaimSubmissionStatus.HANDED_OVER) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                    "Chỉ ghi nhận kết quả khi phiếu đã bàn giao (HANDED_OVER).");
        }

        if (line.getLineStatus() != PrizeClaimSubmissionLineStatus.AWAITING_OUTCOME) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                    "Vé đã có kết quả. Không thể ghi nhận lại.");
        }

        if (outcome != PrizeClaimLineOutcome.HANDED_OVER && reason == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT,
                    "Lý do là bắt buộc khi kết quả khác NHÀ ĐÀI ĐÃ NHẬN.");
        }

        if (outcome == PrizeClaimLineOutcome.HANDED_OVER) {
            line.setOutcomeEvidenceUrl(requireUploadedUrl(outcomeEvidenceUrl, "outcomeEvidenceUrl"));
        } else if (outcomeEvidenceUrl != null && !outcomeEvidenceUrl.isBlank()) {
            line.setOutcomeEvidenceUrl(requireUploadedUrl(outcomeEvidenceUrl, "outcomeEvidenceUrl"));
        }

        line.setRejectionReason(reason);
        line.setRejectionNote(note);

        switch (outcome) {
            case HANDED_OVER -> line.setLineStatus(PrizeClaimSubmissionLineStatus.HANDED_OVER);
            case REJECTED_RETRYABLE -> line.setLineStatus(PrizeClaimSubmissionLineStatus.REJECTED_RETRYABLE);
            case REJECTED_LOSS -> {
                line.setLineStatus(PrizeClaimSubmissionLineStatus.REJECTED_LOSS);
                updateSerialPayoutState(line.getSerial().getId(), SerialPayoutState.UNRECOVERABLE);
            }
            case REJECTED_FRAUD -> {
                line.setLineStatus(PrizeClaimSubmissionLineStatus.REJECTED_FRAUD);
                updateSerialPayoutState(line.getSerial().getId(), SerialPayoutState.LOCKED_FRAUD_SUSPECTED);
            }
            case LOST -> {
                line.setLineStatus(PrizeClaimSubmissionLineStatus.LOST);
                updateSerialPayoutState(line.getSerial().getId(), SerialPayoutState.LOST);
            }
        }

        lineRepository.save(line);
        log.info("LINE_OUTCOME_RECORDED: submissionId={}, lineId={}, outcome={}", submissionId, lineId, outcome);

        maybeCloseSubmission(submission);
    }

    @Transactional
    public void removeLine(Long submissionId, Long lineId) {
        PrizeClaimSubmissionEntity submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));

        if (!submission.getStatus().isOpenForEditing()) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                    "Chỉ xóa vé khi phiếu đang ở trạng thái DRAFT hoặc INSPECTING.");
        }

        lineRepository.deleteById(lineId);
        recalculateTotals(submission);
        submissionRepository.save(submission);
    }

    @Transactional
    public void cancel(Long submissionId, String reason, UUID cancelledBy) {
        PrizeClaimSubmissionEntity submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));

        PrizeClaimSubmissionModel model = toModel(submission);
        model.cancel(reason, cancelledBy);
        applyModel(submission, model);

        lineRepository.deleteByPrizeClaimSubmissionId(submissionId);
        recalculateTotals(submission);

        submissionRepository.save(submission);
        log.info("PCS_CANCELLED: submissionId={}, reason={}", submissionId, reason);
    }

    @Transactional
    public int markStaleSubmissionsNeedingOutcome() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(3);
        var staleList = submissionRepository.findStaleSubmissionsNeedingOutcome(
                PrizeClaimSubmissionStatus.HANDED_OVER,
                cutoff,
                PrizeClaimSubmissionLineStatus.AWAITING_OUTCOME);
        for (PrizeClaimSubmissionEntity sub : staleList) {
            sub.setNeedsOutcome(true);
            submissionRepository.save(sub);
            log.info("STALE_SUBMISSION_NEEDS_OUTCOME: submissionId={}, handedOverAt={}",
                    sub.getId(), sub.getHandedOverAt());
        }
        return staleList.size();
    }

    private void maybeCloseSubmission(PrizeClaimSubmissionEntity submission) {
        long awaiting = lineRepository.countByPrizeClaimSubmissionIdAndLineStatus(
                submission.getId(), PrizeClaimSubmissionLineStatus.AWAITING_OUTCOME);
        if (awaiting == 0) {
            PrizeClaimSubmissionModel model = toModel(submission);
            model.close();
            applyModel(submission, model);
            submissionRepository.save(submission);
            log.info("PCS_CLOSED: submissionId={}", submission.getId());
        }
    }

    private void updateSerialPayoutState(Long serialId, SerialPayoutState newState) {
        serialRepository.findById(serialId).ifPresent(serial -> {
            serial.setPayoutState(newState);
            serialRepository.save(serial);
        });
    }

    private String requireUploadedUrl(String url, String fieldName) {
        String trimmed = trimToNull(url);
        if (trimmed == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT,
                    fieldName + " là bắt buộc. Vui lòng tải ảnh lên trước khi xác nhận.");
        }
        if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
            throw new DomainException(ErrorCode.INVALID_INPUT,
                    fieldName + " không hợp lệ. Vui lòng tải ảnh lên Cloudinary trước khi xác nhận.");
        }
        return trimmed;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void enrichLineFromPayout(
            PrizeClaimSubmissionLineEntity line,
            LotteryTicketSerialEntity serial,
            PrizePayoutRequestEntity payoutRequest) {
        line.setDrawDate(serial.getDrawDate());
        line.setPrizeCode(payoutRequest.getPrizeCode());
        line.setPrizeDisplayName(payoutRequest.getPrizeDisplayName());
        BigDecimal gross = nullSafe(payoutRequest.getGrossAmount());
        BigDecimal tax = nullSafe(payoutRequest.getTaxAmount());
        BigDecimal net = computeSupplierExpectedAmount(gross, tax);
        line.setGrossPrizeAmount(gross);
        line.setTaxAmount(tax);
        line.setCommissionAmount(BigDecimal.ZERO);
        line.setNetClaimAmount(net);
        line.setTicketSerialNumber(serial.getSerialNumber());
        if (serial.getTicket() != null) {
            line.setTicketNumbers(serial.getTicket().getNumbers());
        }
    }

    private static final String CONSOLIDATED_SUBMISSION_LABEL = "Gom chung (mọi đài)";

    private PrizeClaimEligibleTicketResponse toEligibleTicketResponse(PrizePayoutRequestEntity payoutRequest) {
        LotteryTicketSerialEntity serial = payoutRequest.getSerial();
        BigDecimal gross = nullSafe(payoutRequest.getGrossAmount());
        BigDecimal tax = nullSafe(payoutRequest.getTaxAmount());
        BigDecimal net = computeSupplierExpectedAmount(gross, tax);
        String stationName = serial.getStationId() != null
                ? stationRepository.findById(serial.getStationId()).map(LotteryStationEntity::getName).orElse(null)
                : null;
        return PrizeClaimEligibleTicketResponse.builder()
                .prizePayoutRequestId(payoutRequest.getId())
                .payoutRequestCode(payoutRequest.getRequestCode())
                .serialId(serial.getId())
                .serialNumber(serial.getSerialNumber())
                .ticketNumbers(serial.getTicket() != null ? serial.getTicket().getNumbers() : null)
                .stationId(serial.getStationId())
                .stationName(stationName)
                .drawDate(serial.getDrawDate())
                .prizeCode(payoutRequest.getPrizeCode())
                .prizeDisplayName(payoutRequest.getPrizeDisplayName())
                .grossPrizeAmount(gross)
                .netClaimAmount(net)
                .taxAmount(tax)
                .commissionAmount(BigDecimal.ZERO)
                .payoutCompletedAt(payoutRequest.getCompletedAt())
                .build();
    }

    private BigDecimal nullSafe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private void recalculateTotals(PrizeClaimSubmissionEntity submission) {
        List<PrizeClaimSubmissionLineEntity> lines = lineRepository.findByPrizeClaimSubmissionId(submission.getId());
        int ticketCount = lines.size();
        BigDecimal totalGross = BigDecimal.ZERO;
        BigDecimal totalNet = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;
        for (PrizeClaimSubmissionLineEntity line : lines) {
            BigDecimal gross = nullSafe(line.getGrossPrizeAmount());
            BigDecimal tax = nullSafe(line.getTaxAmount());
            totalGross = totalGross.add(gross);
            totalTax = totalTax.add(tax);
            totalNet = totalNet.add(computeSupplierExpectedAmount(gross, tax));
        }
        submission.setTotalTicketCount(ticketCount);
        submission.setTotalGrossPrizeAmount(totalGross);
        submission.setTotalNetClaimAmount(totalNet);
        submission.setTotalTaxAmount(totalTax);
        submission.setTotalCommissionAmount(BigDecimal.ZERO);
    }

    private BigDecimal computeSupplierExpectedAmount(BigDecimal gross, BigDecimal tax) {
        return nullSafe(gross).subtract(nullSafe(tax));
    }

    private PrizeClaimSubmissionModel toModel(PrizeClaimSubmissionEntity entity) {
        return PrizeClaimSubmissionModel.builder()
                .id(entity.getId())
                .submissionCode(entity.getSubmissionCode())
                .lotterySupplierId(entity.getLotterySupplier() != null ? entity.getLotterySupplier().getId() : null)
                .status(entity.getStatus())
                .deliveryMode(entity.getDeliveryMode())
                .handoverEvidenceUrl(entity.getHandoverEvidenceUrl())
                .handoverReceiptUrl(entity.getHandoverReceiptUrl())
                .supplierReference(entity.getSupplierReference())
                .handoverNote(entity.getHandoverNote())
                .handedOverAt(entity.getHandedOverAt())
                .handedOverBy(entity.getHandedOverBy())
                .totalGrossPrizeAmount(entity.getTotalGrossPrizeAmount())
                .totalNetClaimAmount(entity.getTotalNetClaimAmount())
                .totalTaxAmount(entity.getTotalTaxAmount())
                .totalCommissionAmount(entity.getTotalCommissionAmount())
                .submittedAt(entity.getSubmittedAt())
                .submittedBy(entity.getSubmittedBy())
                .cancelledAt(entity.getCancelledAt())
                .cancelledBy(entity.getCancelledBy())
                .cancelReason(entity.getCancelReason())
                .needsOutcome(entity.isNeedsOutcome())
                .build();
    }

    private void applyModel(PrizeClaimSubmissionEntity entity, PrizeClaimSubmissionModel model) {
        entity.setStatus(model.getStatus());
        entity.setDeliveryMode(model.getDeliveryMode());
        entity.setHandoverEvidenceUrl(model.getHandoverEvidenceUrl());
        entity.setHandoverReceiptUrl(model.getHandoverReceiptUrl());
        entity.setSupplierReference(model.getSupplierReference());
        entity.setHandoverNote(model.getHandoverNote());
        entity.setHandedOverAt(model.getHandedOverAt());
        entity.setHandedOverBy(model.getHandedOverBy());
        entity.setSubmittedAt(model.getSubmittedAt());
        entity.setSubmittedBy(model.getSubmittedBy());
        entity.setCancelledAt(model.getCancelledAt());
        entity.setCancelledBy(model.getCancelledBy());
        entity.setCancelReason(model.getCancelReason());
        entity.setNeedsOutcome(model.isNeedsOutcome());
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
        int pendingOutcomeCount = (int) lineRepository.countByPrizeClaimSubmissionIdAndLineStatus(
                entity.getId(), PrizeClaimSubmissionLineStatus.AWAITING_OUTCOME);
        return toResponse(entity, pendingOutcomeCount);
    }

    private PrizeClaimSubmissionResponse toResponse(PrizeClaimSubmissionEntity entity, int pendingOutcomeCount) {
        var supplier = entity.getLotterySupplier();
        return PrizeClaimSubmissionResponse.builder()
                .id(entity.getId())
                .submissionCode(entity.getSubmissionCode())
                .supplierId(supplier != null ? supplier.getId() : null)
                .supplierName(supplier != null ? supplier.getName() : CONSOLIDATED_SUBMISSION_LABEL)
                .periodFrom(entity.getPeriodFrom())
                .periodTo(entity.getPeriodTo())
                .totalTicketCount(entity.getTotalTicketCount())
                .totalGrossPrizeAmount(entity.getTotalGrossPrizeAmount())
                .totalNetClaimAmount(computeSupplierExpectedAmount(
                        entity.getTotalGrossPrizeAmount(),
                        entity.getTotalTaxAmount()))
                .totalTaxAmount(entity.getTotalTaxAmount())
                .totalCommissionAmount(BigDecimal.ZERO)
                .actualReceivedAmount(entity.getActualReceivedAmount())
                .actualReceivedEvidenceUrl(entity.getActualReceivedEvidenceUrl())
                .status(entity.getStatus())
                .deliveryMode(entity.getDeliveryMode())
                .handoverEvidenceUrl(entity.getHandoverEvidenceUrl())
                .handoverReceiptUrl(entity.getHandoverReceiptUrl())
                .supplierReference(entity.getSupplierReference())
                .handoverNote(entity.getHandoverNote())
                .handedOverAt(entity.getHandedOverAt())
                .handedOverBy(entity.getHandedOverBy())
                .submittedAt(entity.getSubmittedAt())
                .submittedBy(entity.getSubmittedBy())
                .cancelledAt(entity.getCancelledAt())
                .cancelledBy(entity.getCancelledBy())
                .cancelReason(entity.getCancelReason())
                .needsOutcome(entity.isNeedsOutcome())
                .pendingOutcomeCount(pendingOutcomeCount)
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private Map<Long, Integer> loadPendingOutcomeCounts(List<PrizeClaimSubmissionEntity> submissions) {
        if (submissions.isEmpty()) {
            return Map.of();
        }
        List<Long> submissionIds = submissions.stream().map(PrizeClaimSubmissionEntity::getId).toList();
        Map<Long, Integer> counts = new HashMap<>();
        for (Object[] row : lineRepository.countBySubmissionIdsAndLineStatus(
                submissionIds, PrizeClaimSubmissionLineStatus.AWAITING_OUTCOME)) {
            counts.put((Long) row[0], ((Number) row[1]).intValue());
        }
        return counts;
    }

    public PrizeClaimSubmissionLineResponse toLineResponse(PrizeClaimSubmissionLineEntity line) {
        var serial = line.getSerial();
        Long serialId = serial != null ? serial.getId() : null;
        long retryCount = serialId != null
                ? lineRepository.countBySerialIdAndLineStatus(serialId, PrizeClaimSubmissionLineStatus.REJECTED_RETRYABLE)
                : 0L;
        String stationName = line.getStationId() != null
                ? stationRepository.findById(line.getStationId()).map(LotteryStationEntity::getName).orElse(null)
                : null;
        return PrizeClaimSubmissionLineResponse.builder()
                .id(line.getId())
                .submissionId(line.getPrizeClaimSubmission() != null ? line.getPrizeClaimSubmission().getId() : null)
                .serialId(serialId)
                .serialNumber(line.getTicketSerialNumber() != null
                        ? line.getTicketSerialNumber()
                        : serial != null ? serial.getSerialNumber() : null)
                .ticketNumbers(line.getTicketNumbers())
                .stationId(line.getStationId())
                .stationName(stationName)
                .drawDate(line.getDrawDate())
                .prizeCode(line.getPrizeCode())
                .prizeDisplayName(line.getPrizeDisplayName())
                .grossPrizeAmount(line.getGrossPrizeAmount())
                .netClaimAmount(computeSupplierExpectedAmount(
                        line.getGrossPrizeAmount(),
                        line.getTaxAmount()))
                .taxAmount(line.getTaxAmount())
                .commissionAmount(BigDecimal.ZERO)
                .lineStatus(line.getLineStatus())
                .rejectionReason(line.getRejectionReason())
                .rejectionNote(line.getRejectionNote())
                .outcomeEvidenceUrl(line.getOutcomeEvidenceUrl())
                .retryCount(retryCount)
                .build();
    }
}
