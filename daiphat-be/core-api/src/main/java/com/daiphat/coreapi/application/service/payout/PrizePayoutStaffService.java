package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.application.dto.request.payout.CompletePrizePayoutRequest;
import com.daiphat.coreapi.application.dto.request.payout.CreateStaffPrizePayoutBatchRequest;
import com.daiphat.coreapi.application.dto.request.payout.CreateStaffPrizePayoutRequest;
import com.daiphat.coreapi.application.dto.request.payout.RejectPrizePayoutRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutBatchCreateResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutLookupItem;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutLookupResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutLookupStationResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutPreviewResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutRequestResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutStaffListResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.event.PrizePayoutStatusChangedEvent;
import com.daiphat.coreapi.application.mapper.payout.PrizePayoutApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.payout.PrizePayoutStaffServicePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.order.TicketDrawResultStatus;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutChannel;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutPaymentMethod;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.payout.PrizePayoutRequestModel;
import com.daiphat.coreapi.domain.model.refund.UserBankAccountModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderDetailRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.shared.util.PageableUtils;
import com.daiphat.coreapi.shared.util.PersonNameMatchUtils;
import com.daiphat.coreapi.shared.util.SortUtils;
import com.daiphat.coreapi.shared.util.StorageFolderConstants;
import com.daiphat.coreapi.shared.util.StorageUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PrizePayoutStaffService implements PrizePayoutStaffServicePort {

    private final PrizePayoutRequestRepositoryPort prizePayoutRequestRepositoryPort;
    private final PrizePayoutEligibilityService prizePayoutEligibilityService;
    private final PrizePayoutCalculationService prizePayoutCalculationService;
    private final PrizePayoutSerialLockService prizePayoutSerialLockService;
    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final UserBankAccountRepositoryPort userBankAccountRepositoryPort;
    private final PrizePayoutApplicationMapper prizePayoutApplicationMapper;
    private final OrderDetailRepository orderDetailRepository;
    private final UserRepository userRepository;
    private final StoragePort storagePort;
    private final ApplicationEventPublisher eventPublisher;
    private final LotteryStationServicePort lotteryStationServicePort;

    @Override
    @Transactional(readOnly = true)
    public PrizePayoutStaffListResponse getRequestsForStaff(
            int page, int limit, String status, String search, UUID viewerStaffId) {
        Pageable pageable = PageableUtils.of(
                page,
                limit,
                SortUtils.byCreatedAtDesc());

        List<PrizePayoutRequestStatus> statuses = parseStatuses(status);
        PrizePayoutRequestStatus singleStatus = statuses != null && statuses.size() == 1 ? statuses.get(0) : null;

        Page<PrizePayoutRequestModel> resultPage = prizePayoutRequestRepositoryPort.findAll(
                pageable, null, singleStatus, statuses, search);

        Page<PrizePayoutRequestResponse> mapped = resultPage.map(model -> toResponse(model.getId(), viewerStaffId));

        Map<String, Long> statusCounts = new LinkedHashMap<>();
        for (PrizePayoutRequestStatus value : PrizePayoutRequestStatus.values()) {
            statusCounts.put(
                    value.name(),
                    prizePayoutRequestRepositoryPort.countByStatus(value, null, search));
        }

        PageResponse<PrizePayoutRequestResponse> pageResponse = PageResponse.from(
                mapped,
                page,
                limit,
                statusCounts);

        long pendingCount = statusCounts.getOrDefault(PrizePayoutRequestStatus.PENDING.name(), 0L);
        BigDecimal pendingGrossTotal = prizePayoutRequestRepositoryPort
                .sumGrossAmountByStatus(PrizePayoutRequestStatus.PENDING);

        return new PrizePayoutStaffListResponse(pageResponse, pendingCount, pendingGrossTotal);
    }

    @Override
    @Transactional(readOnly = true)
    public PrizePayoutRequestResponse getByIdForStaff(Long id, UUID viewerStaffId) {
        return toResponse(id, viewerStaffId);
    }

    @Override
    @Transactional(readOnly = true)
    public PrizePayoutLookupResponse lookup(
            String orderCode,
            Long stationId,
            LocalDate drawDate,
            String serialNumber) {
        boolean hasOrder = orderCode != null && !orderCode.isBlank();
        boolean hasTriple = stationId != null
                || drawDate != null
                || (serialNumber != null && !serialNumber.isBlank());

        if (hasOrder && hasTriple) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Chọn một chế độ tra cứu: mã đơn, hoặc đài + ngày quay + serial.");
        }
        if (!hasOrder && !hasTriple) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Nhập mã đơn, hoặc đủ đài (issuer) + ngày quay + số serial.");
        }

        List<OrderDetailEntity> details;
        if (hasOrder) {
            details = prizePayoutEligibilityService.resolveAllByOrderCode(orderCode);
        } else {
            if (stationId == null || drawDate == null || serialNumber == null || serialNumber.isBlank()) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Nhập đủ đài (issuer), ngày quay và số serial.");
            }
            details = List.of(prizePayoutEligibilityService.resolveByStationDrawSerial(
                    stationId, drawDate, serialNumber));
        }

        List<PrizePayoutLookupItem> items = details.stream()
                .map(this::toLookupItem)
                .toList();
        return new PrizePayoutLookupResponse(items);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PrizePayoutLookupStationResponse> listLookupStationsByDrawDate(LocalDate drawDate) {
        if (drawDate == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Ngày mở thưởng không được để trống.");
        }
        // Only stations scheduled to draw on that calendar day (drawDays), not every
        // station that happens to have ticket rows for the date (seed/bad data can skew that).
        return lotteryStationServicePort.getByDrawDate(drawDate).stream()
                .map(station -> new PrizePayoutLookupStationResponse(station.id(), station.name()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PrizePayoutPreviewResponse preview(
            Long orderDetailId,
            Long serialId,
            String serialNumber,
            String orderCode) {
        // Prefer orderDetailId / serialId. Reject serial-only / order-only multi-ticket paths.
        if (orderDetailId == null && serialId == null) {
            if (serialNumber != null && !serialNumber.isBlank() && (orderCode == null || orderCode.isBlank())) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Không tra cứu bằng serial đơn lẻ — dùng đài + ngày quay + serial hoặc mã đơn.");
            }
            if (orderCode != null && !orderCode.isBlank()) {
                PrizePayoutLookupResponse lookup = lookup(orderCode, null, null, null);
                if (lookup.items().size() != 1) {
                    throw new DomainException(
                            ErrorCode.INVALID_INPUT,
                            "Đơn có nhiều vé — dùng GET /lookup và chọn vé cần trả thưởng.");
                }
                return toPreviewFromLookup(lookup.items().get(0));
            }
            throw new DomainException(ErrorCode.INVALID_INPUT, "Cần orderDetailId hoặc serialId.");
        }

        OrderDetailEntity detail = prizePayoutEligibilityService.resolveDetail(orderDetailId, serialId);
        return toPreviewFromLookup(toLookupItem(detail));
    }

    @Override
    @Transactional
    public PrizePayoutRequestResponse createInPerson(UUID staffId, CreateStaffPrizePayoutRequest request) {
        CreateStaffPrizePayoutBatchRequest batch = new CreateStaffPrizePayoutBatchRequest(
                List.of(new CreateStaffPrizePayoutBatchRequest.BatchItem(
                        request.orderDetailId() != null
                                ? request.orderDetailId()
                                : resolveOrderDetailId(request))),
                request.bankAccountId(),
                request.bankName(),
                request.bankAccountNumber(),
                request.accountHolderName(),
                request.recipientFullName(),
                request.recipientIdNumber(),
                request.recipientIdImageUrl(),
                request.recipientIdImageBackUrl(),
                request.paymentMethod(),
                request.cashAmount(),
                request.manualOwnershipConfirmed(),
                request.transferEvidenceUrl(),
                request.confirmationContractUrl());
        PrizePayoutBatchCreateResponse response = createInPersonBatch(staffId, batch);
        return response.claims().get(0);
    }

    private Long resolveOrderDetailId(CreateStaffPrizePayoutRequest request) {
        if (request.serialId() != null) {
            OrderDetailEntity detail = prizePayoutEligibilityService.resolveDetail(null, request.serialId());
            return detail.getId();
        }
        throw new DomainException(
                ErrorCode.INVALID_INPUT,
                "Cần orderDetailId (sau tra cứu) — không tạo claim bằng serial đơn lẻ.");
    }

    @Override
    @Transactional
    public PrizePayoutBatchCreateResponse createInPersonBatch(
            UUID staffId,
            CreateStaffPrizePayoutBatchRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Chọn ít nhất một vé để tạo yêu cầu.");
        }

        List<OrderDetailEntity> details = new ArrayList<>();
        for (CreateStaffPrizePayoutBatchRequest.BatchItem item : request.items()) {
            OrderDetailEntity detail = prizePayoutEligibilityService.resolveDetail(item.orderDetailId(), null);
            LotteryTicketSerialEntity serial = detail.getLotteryTicketSerial();
            if (serial == null) {
                throw new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND);
            }
            if (detail.getOrder() == null) {
                throw new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE, "Không tìm thấy đơn gốc của vé.");
            }
            prizePayoutEligibilityService.validateStaffInPersonCreate(detail, serial);
            details.add(detail);
        }

        // Shared recipient identity: always capture both CCCD images for audit.

        if (isBlank(request.recipientFullName()) || isBlank(request.recipientIdNumber())) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_RECIPIENT_IDENTITY_REQUIRED);
        }
        String recipientIdRaw = request.recipientIdNumber().trim();
        if (!recipientIdRaw.matches("\\d{9,12}")) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Số CCCD/CMND phải có từ 9 đến 12 chữ số.");
        }
        if (isBlank(request.recipientIdImageUrl()) || isBlank(request.recipientIdImageBackUrl())) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_RECIPIENT_IDENTITY_REQUIRED,
                    "Cần ảnh CCCD mặt trước và mặt sau.");
        }
        if (!isBlank(request.recipientIdImageUrl())) {
            StorageUtils.validateImageEvidenceUrl(request.recipientIdImageUrl());
        }
        if (!isBlank(request.recipientIdImageBackUrl())) {
            StorageUtils.validateImageEvidenceUrl(request.recipientIdImageBackUrl());
        }

        boolean anyManualConfirm = details.stream().anyMatch(d -> {
            PrizePayoutEligibilityService.OwnershipVerificationContext ownership =
                    prizePayoutEligibilityService.resolveOwnershipVerification(d, d.getLotteryTicketSerial());
            return ownership.requiresManualOwnershipConfirm();
        });
        if (anyManualConfirm && !Boolean.TRUE.equals(request.manualOwnershipConfirmed())) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Cần xác nhận đã đối chiếu giấy tờ tùy thân và vé gốc trước khi tạo yêu cầu.");
        }

        if (isBlank(request.confirmationContractUrl())) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Hợp đồng xác nhận trả thưởng là bắt buộc.");
        }
        StorageUtils.validateImageEvidenceUrl(request.confirmationContractUrl());

        PrizePayoutPaymentMethod requestedMethod = request.paymentMethod();
        String confirmationContractUrl = request.confirmationContractUrl().trim();
        String recipientFullName = request.recipientFullName().trim();
        String recipientIdNumber = request.recipientIdNumber().trim();
        String recipientIdImageUrl = isBlank(request.recipientIdImageUrl())
                ? null
                : request.recipientIdImageUrl().trim();
        String recipientIdImageBackUrl = isBlank(request.recipientIdImageBackUrl())
                ? null
                : request.recipientIdImageBackUrl().trim();
        LocalDateTime recipientIdentityCapturedAt = LocalDateTime.now();

        // Pre-compute per-ticket breakdown so COMBINED cash can be allocated against total net.
        List<PrizePayoutCalculationService.PrizePayoutBreakdown> breakdowns = new ArrayList<>();
        BigDecimal batchTotalNet = BigDecimal.ZERO;
        for (OrderDetailEntity detail : details) {
            LotteryTicketSerialEntity serial = detail.getLotteryTicketSerial();
            PrizePayoutEligibilityService.PrizeMatchContext match =
                    prizePayoutEligibilityService.resolvePrizeMatch(detail, serial);
            PrizePayoutCalculationService.PrizePayoutBreakdown breakdown =
                    prizePayoutCalculationService.calculate(match.prizeAmount());
            breakdowns.add(breakdown);
            batchTotalNet = batchTotalNet.add(breakdown.netAmount());
        }

        PaymentSplit batchSplit = resolvePaymentSplit(requestedMethod, request.cashAmount(), batchTotalNet);
        boolean needsBank = batchSplit.transferAmount().compareTo(BigDecimal.ZERO) > 0;

        String transferEvidenceUrl = null;
        if (needsBank) {
            if (isBlank(request.transferEvidenceUrl())) {
                throw new DomainException(ErrorCode.INVALID_INPUT, "Ảnh biên lai chuyển khoản là bắt buộc.");
            }
            StorageUtils.validateImageEvidenceUrl(request.transferEvidenceUrl());
            transferEvidenceUrl = request.transferEvidenceUrl().trim();
        } else if (!isBlank(request.transferEvidenceUrl())) {
            StorageUtils.validateImageEvidenceUrl(request.transferEvidenceUrl());
            transferEvidenceUrl = request.transferEvidenceUrl().trim();
        }

        List<PrizePayoutRequestResponse> claims = new ArrayList<>();
        BigDecimal totalNet = BigDecimal.ZERO;
        BigDecimal remainingCash = batchSplit.cashAmount();

        for (int i = 0; i < details.size(); i++) {
            OrderDetailEntity detail = details.get(i);
            LotteryTicketSerialEntity serial = detail.getLotteryTicketSerial();
            PrizePayoutEligibilityService.OwnershipVerificationContext ownership =
                    prizePayoutEligibilityService.resolveOwnershipVerification(detail, serial);
            PrizePayoutEligibilityService.PrizeMatchContext match =
                    prizePayoutEligibilityService.resolvePrizeMatch(detail, serial);
            prizePayoutEligibilityService.validateWonWithProof(match);

            UUID customerId = detail.getOrder().getUser() != null ? detail.getOrder().getUser().getId() : null;

            PrizePayoutCalculationService.PrizePayoutBreakdown breakdown = breakdowns.get(i);
            BigDecimal claimNet = breakdown.netAmount();
            BigDecimal claimCash = remainingCash.min(claimNet).max(BigDecimal.ZERO);
            BigDecimal claimTransfer = claimNet.subtract(claimCash);
            remainingCash = remainingCash.subtract(claimCash);
            PrizePayoutPaymentMethod claimMethod = normalizeClaimMethod(claimCash, claimTransfer);

            Long bankAccountId = null;
            String bankName = null;
            String bankAccountNumber = null;
            String accountHolderName = null;

            if (needsBank && claimTransfer.compareTo(BigDecimal.ZERO) > 0) {
                ResolvedBank bank = resolveBankFields(request, customerId);
                bankAccountId = bank.bankAccountId();
                bankName = bank.bankName();
                bankAccountNumber = bank.bankAccountNumber();
                accountHolderName = bank.accountHolderName();
            }

            PrizePayoutRequestModel model = PrizePayoutRequestModel.builder()
                    .requestCode(generateRequestCode())
                    .customerId(customerId)
                    .orderId(detail.getOrder().getId())
                    .orderDetailId(detail.getId())
                    .serialId(serial.getId())
                    .prizeCode(match.prizeCode())
                    .prizeDisplayName(match.prizeDisplayName())
                    .grossAmount(breakdown.grossAmount())
                    .taxAmount(breakdown.taxAmount())
                    .commissionAmount(breakdown.commissionAmount())
                    .netAmount(claimNet)
                    .cashAmount(claimCash.compareTo(BigDecimal.ZERO) > 0 ? claimCash : null)
                    .transferAmount(claimTransfer.compareTo(BigDecimal.ZERO) > 0 ? claimTransfer : null)
                    .channel(PrizePayoutChannel.IN_PERSON)
                    .ticketOrigin(ownership.ticketOrigin())
                    .ownershipVerificationLevel(ownership.level())
                    .manualOwnershipConfirmed(
                            ownership.requiresManualOwnershipConfirm()
                                    || Boolean.TRUE.equals(request.manualOwnershipConfirmed()))
                    .paymentMethod(claimMethod)
                    .bankAccountId(bankAccountId)
                    .bankName(bankName)
                    .bankAccountNumber(bankAccountNumber)
                    .accountHolderName(accountHolderName)
                    .recipientFullName(recipientFullName)
                    .recipientIdNumber(recipientIdNumber)
                    .recipientIdImageUrl(recipientIdImageUrl)
                    .recipientIdImageBackUrl(recipientIdImageBackUrl)
                    .recipientIdentityCapturedAt(recipientIdentityCapturedAt)
                    .confirmationContractUrl(confirmationContractUrl)
                    .createdBy(staffId != null ? staffId.toString() : null)
                    .build();
            model.initializeForCreate();

            PrizePayoutRequestModel saved = prizePayoutRequestRepositoryPort.save(model);
            prizePayoutSerialLockService.lockSerial(serial.getId());

            // Counter flow: creating staff completes payout immediately (same action).
            String claimEvidence = claimMethod.includesTransfer() ? transferEvidenceUrl : null;
            saved.markCompleted(staffId, claimMethod, claimEvidence);
            saved = prizePayoutRequestRepositoryPort.save(saved);
            prizePayoutSerialLockService.markPaidOut(saved.getSerialId());
            publishStatusChanged(saved);

            totalNet = totalNet.add(claimNet);
            claims.add(toResponse(saved.getId(), staffId));
        }

        return new PrizePayoutBatchCreateResponse(claims, totalNet);
    }

    private record PaymentSplit(
            PrizePayoutPaymentMethod method,
            BigDecimal cashAmount,
            BigDecimal transferAmount
    ) {
    }

    private record ResolvedBank(
            Long bankAccountId,
            String bankName,
            String bankAccountNumber,
            String accountHolderName
    ) {
    }

    /**
     * Mirrors counter-order PARTIAL: cash &gt; 0 required for COMBINED; remainder is transfer.
     * cash &gt;= net normalizes to CASH; cash == 0 with COMBINED is rejected.
     */
    private PaymentSplit resolvePaymentSplit(
            PrizePayoutPaymentMethod method,
            BigDecimal cashAmountInput,
            BigDecimal netAmount) {
        if (netAmount == null || netAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE, "Không xác định được số tiền thực nhận.");
        }
        if (method == PrizePayoutPaymentMethod.CASH) {
            return new PaymentSplit(PrizePayoutPaymentMethod.CASH, netAmount, BigDecimal.ZERO);
        }
        if (method == PrizePayoutPaymentMethod.TRANSFER) {
            return new PaymentSplit(PrizePayoutPaymentMethod.TRANSFER, BigDecimal.ZERO, netAmount);
        }
        if (method != PrizePayoutPaymentMethod.COMBINED) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Phương thức thanh toán không hợp lệ.");
        }
        if (cashAmountInput == null || cashAmountInput.compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Thanh toán kết hợp cần có phần tiền mặt lớn hơn 0đ.");
        }
        if (cashAmountInput.compareTo(netAmount) > 0) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Tiền mặt không được vượt quá tổng thực nhận.");
        }
        if (cashAmountInput.compareTo(netAmount) == 0) {
            return new PaymentSplit(PrizePayoutPaymentMethod.CASH, netAmount, BigDecimal.ZERO);
        }
        BigDecimal transfer = netAmount.subtract(cashAmountInput);
        return new PaymentSplit(PrizePayoutPaymentMethod.COMBINED, cashAmountInput, transfer);
    }

    private static PrizePayoutPaymentMethod normalizeClaimMethod(BigDecimal cash, BigDecimal transfer) {
        boolean hasCash = cash != null && cash.compareTo(BigDecimal.ZERO) > 0;
        boolean hasTransfer = transfer != null && transfer.compareTo(BigDecimal.ZERO) > 0;
        if (hasCash && hasTransfer) {
            return PrizePayoutPaymentMethod.COMBINED;
        }
        if (hasTransfer) {
            return PrizePayoutPaymentMethod.TRANSFER;
        }
        return PrizePayoutPaymentMethod.CASH;
    }

    private ResolvedBank resolveBankFields(
            CreateStaffPrizePayoutBatchRequest request,
            UUID customerId) {
        if (request.bankAccountId() != null) {
            if (customerId == null) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Không thể dùng tài khoản đã lưu khi đơn không có khách hàng trên hệ thống.");
            }
            UserBankAccountModel bankAccount = userBankAccountRepositoryPort.findById(request.bankAccountId())
                    .orElseThrow(() -> new DomainException(ErrorCode.USER_BANK_ACCOUNT_NOT_FOUND));
            if (!bankAccount.getUserId().equals(customerId)) {
                throw new DomainException(ErrorCode.PRIZE_PAYOUT_BANK_ACCOUNT_MISMATCH);
            }
            // In-person: allow any holder name (receiver may differ from linked customer).
            return new ResolvedBank(
                    bankAccount.getId(),
                    bankAccount.getBankName(),
                    bankAccount.getBankAccountNo(),
                    bankAccount.getBankAccountName());
        }
        if (isBlank(request.bankName())
                || isBlank(request.bankAccountNumber())
                || isBlank(request.accountHolderName())) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Nhập đầy đủ ngân hàng / STK / chủ TK khi có phần chuyển khoản.");
        }
        String bankName = request.bankName().trim();
        String bankAccountNumber = request.bankAccountNumber().trim();
        String accountHolderName = request.accountHolderName().trim();
        return new ResolvedBank(null, bankName, bankAccountNumber, accountHolderName);
    }

    @Override
    @Transactional
    public PrizePayoutRequestResponse approve(Long id, UUID staffId) {
        PrizePayoutRequestModel model = getRequestOrThrow(id);
        if (!prizePayoutEligibilityService.requiresFourEyes(model.getGrossAmount())) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                    "Yêu cầu dưới ngưỡng thuế không cần duyệt 4 mắt.");
        }
        UUID creatorId = parseUuid(model.getCreatedBy());
        if (staffId != null && creatorId != null && creatorId.equals(staffId)) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_FOUR_EYES_REQUIRED);
        }
        model.markApproved(staffId);
        PrizePayoutRequestModel saved = prizePayoutRequestRepositoryPort.save(model);
        publishStatusChanged(saved);
        return toResponse(saved.getId(), staffId);
    }

    @Override
    @Transactional
    public PrizePayoutRequestResponse complete(Long id, UUID staffId, CompletePrizePayoutRequest request) {
        PrizePayoutRequestModel model = getRequestOrThrow(id);
        LotteryTicketSerialModel serial = lotteryTicketSerialRepositoryPort.findById(model.getSerialId())
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));
        if (serial.getPayoutState() == SerialPayoutState.PAID_OUT) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_ALREADY_REQUESTED, "Vé đã được trả thưởng.");
        }

        boolean fourEyes = prizePayoutEligibilityService.requiresFourEyes(model.getGrossAmount());
        UUID creatorId = parseUuid(model.getCreatedBy());
        if (fourEyes) {
            if (model.getStatus() != PrizePayoutRequestStatus.APPROVED) {
                throw new DomainException(
                        ErrorCode.PRIZE_PAYOUT_INVALID_STATUS,
                        "Giao dịch từ ngưỡng thuế trở lên cần duyệt trước khi hoàn tất.");
            }
            if (staffId != null && creatorId != null && creatorId.equals(staffId)) {
                throw new DomainException(ErrorCode.PRIZE_PAYOUT_FOUR_EYES_REQUIRED);
            }
        } else if (model.getStatus() != PrizePayoutRequestStatus.PENDING) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_INVALID_STATUS);
        }

        PrizePayoutPaymentMethod method = request.paymentMethod();
        if (model.getChannel() == PrizePayoutChannel.ONLINE) {
            if (method != null && method != PrizePayoutPaymentMethod.TRANSFER) {
                throw new DomainException(
                        ErrorCode.INVALID_INPUT,
                        "Yêu cầu trả thưởng online chỉ hỗ trợ chuyển khoản.");
            }
            method = PrizePayoutPaymentMethod.TRANSFER;
        }
        PaymentSplit split = resolvePaymentSplit(
                method,
                request.cashAmount() != null ? request.cashAmount() : model.getCashAmount(),
                model.getNetAmount());
        model.setCashAmount(split.cashAmount().compareTo(BigDecimal.ZERO) > 0 ? split.cashAmount() : null);
        model.setTransferAmount(split.transferAmount().compareTo(BigDecimal.ZERO) > 0 ? split.transferAmount() : null);
        method = split.method();

        if (method.includesTransfer()) {
            if (request.transferEvidenceUrl() == null || request.transferEvidenceUrl().isBlank()) {
                throw new DomainException(ErrorCode.INVALID_INPUT, "Ảnh biên lai chuyển khoản là bắt buộc.");
            }
            StorageUtils.validateImageEvidenceUrl(request.transferEvidenceUrl());
            if (model.getBankAccountId() == null
                    && (model.getBankAccountNumber() == null || model.getBankAccountNumber().isBlank())) {
                throw new DomainException(ErrorCode.INVALID_INPUT, "Thiếu thông tin tài khoản nhận khi chuyển khoản.");
            }
        } else if (request.transferEvidenceUrl() != null && !request.transferEvidenceUrl().isBlank()) {
            StorageUtils.validateImageEvidenceUrl(request.transferEvidenceUrl());
        }

        model.markCompleted(staffId, method, request.transferEvidenceUrl());
        PrizePayoutRequestModel saved = prizePayoutRequestRepositoryPort.save(model);
        prizePayoutSerialLockService.markPaidOut(saved.getSerialId());
        publishStatusChanged(saved);
        return toResponse(saved.getId(), staffId);
    }

    @Override
    @Transactional
    public PrizePayoutRequestResponse reject(Long id, UUID staffId, RejectPrizePayoutRequest request) {
        PrizePayoutRequestModel model = getRequestOrThrow(id);
        int maxRetry = prizePayoutEligibilityService.resolveMaxOnlineRejectRetry();
        int newRejectCount = 0;
        if (model.getChannel() == PrizePayoutChannel.ONLINE) {
            long prior = prizePayoutEligibilityService.countOnlineRejectAttempts(model.getSerialId());
            newRejectCount = (int) prior + 1;
        }
        model.markRejected(request.reason(), staffId, newRejectCount, maxRetry);
        PrizePayoutRequestModel saved = prizePayoutRequestRepositoryPort.save(model);
        prizePayoutSerialLockService.unlockSerial(saved.getSerialId());
        publishStatusChanged(saved);
        return toResponse(saved.getId(), staffId);
    }

    @Override
    public StorageResult uploadTransferEvidence(UploadRequest request) {
        StorageUtils.validateImageUpload(request);
        return storagePort.upload(new UploadRequest(
                request.data(),
                request.fileName(),
                request.contentType(),
                StorageFolderConstants.PRIZE_PAYOUT_TRANSFER_EVIDENCE_FOLDER));
    }

    @Override
    public StorageResult uploadRecipientIdImage(UploadRequest request) {
        StorageUtils.validateImageUpload(request);
        return storagePort.upload(new UploadRequest(
                request.data(),
                request.fileName(),
                request.contentType(),
                StorageFolderConstants.PRIZE_PAYOUT_RECIPIENT_ID_FOLDER));
    }

    @Override
    public StorageResult uploadConfirmationContract(UploadRequest request) {
        StorageUtils.validateImageUpload(request);
        return storagePort.upload(new UploadRequest(
                request.data(),
                request.fileName(),
                request.contentType(),
                StorageFolderConstants.PRIZE_PAYOUT_CONFIRMATION_CONTRACT_FOLDER));
    }

    private PrizePayoutLookupItem toLookupItem(OrderDetailEntity detail) {
        LotteryTicketSerialEntity serial = detail.getLotteryTicketSerial();
        if (serial == null) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND);
        }
        var order = detail.getOrder();
        UserEntity customer = order != null && order.getUser() != null ? order.getUser() : null;
        var ticket = serial.getTicket();

        PrizePayoutEligibilityService.OwnershipVerificationContext ownership =
                prizePayoutEligibilityService.resolveOwnershipVerification(detail, serial);
        PrizePayoutEligibilityService.PrizeMatchContext match =
                prizePayoutEligibilityService.resolvePrizeMatch(detail, serial);

        BigDecimal gross = null;
        BigDecimal tax = null;
        BigDecimal commission = null;
        BigDecimal net = null;
        boolean requiresFourEyes = false;
        boolean requiresIdImage = prizePayoutEligibilityService.requiresRecipientIdImage(
                customer != null ? customer.getId() : null,
                null);

        if (match.drawResultStatus() == TicketDrawResultStatus.WON
                && match.prizeAmount() != null
                && match.prizeAmount().compareTo(BigDecimal.ZERO) > 0) {
            PrizePayoutCalculationService.PrizePayoutBreakdown breakdown =
                    prizePayoutCalculationService.calculate(match.prizeAmount());
            gross = breakdown.grossAmount();
            tax = breakdown.taxAmount();
            commission = breakdown.commissionAmount();
            net = breakdown.netAmount();
            requiresFourEyes = prizePayoutEligibilityService.requiresFourEyes(gross);
            requiresIdImage = prizePayoutEligibilityService.requiresRecipientIdImage(
                    customer != null ? customer.getId() : null,
                    gross);
        } else if (customer == null) {
            requiresIdImage = true;
        }

        boolean alreadyRequested = false;
        SerialPayoutState payoutState = serial.getPayoutState() != null
                ? serial.getPayoutState()
                : SerialPayoutState.NONE;
        if (payoutState == SerialPayoutState.PAYOUT_PENDING || payoutState == SerialPayoutState.PAID_OUT) {
            alreadyRequested = true;
        }

        Long stationId = ticket != null && ticket.getStation() != null
                ? ticket.getStation().getId()
                : serial.getStationId();
        LocalDate drawDate = ticket != null ? ticket.getDrawDate() : serial.getDrawDate();
        String ticketNumbers = match.ticketNumbers() != null && !match.ticketNumbers().isBlank()
                ? match.ticketNumbers()
                : (ticket != null ? ticket.getNumbers() : null);

        return new PrizePayoutLookupItem(
                detail.getId(),
                serial.getId(),
                stationId,
                ticket != null && ticket.getStation() != null ? ticket.getStation().getName() : null,
                drawDate,
                serial.getSerialNumber(),
                ticketNumbers,
                match.drawResultStatus(),
                match.prizeCode(),
                match.prizeDisplayName(),
                gross,
                tax,
                commission,
                net,
                ownership.ticketOrigin(),
                ownership.level(),
                ownership.requiresManualOwnershipConfirm(),
                true,
                requiresIdImage,
                requiresFourEyes,
                prizePayoutCalculationService.resolveTaxThreshold(),
                order != null ? order.getOrderType() : null,
                order != null ? order.getOrderCode() : null,
                customer != null ? customer.getId() : null,
                resolveCustomerName(customer),
                order != null ? order.getName() : null,
                order != null ? order.getPhone() : null,
                match.winningNumber(),
                match.matchFrom(),
                match.matchDigits(),
                alreadyRequested,
                payoutState);
    }

    private PrizePayoutPreviewResponse toPreviewFromLookup(PrizePayoutLookupItem item) {
        if (item.prizeStatus() != TicketDrawResultStatus.WON
                || item.grossAmount() == null
                || item.grossAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE, "Vé chưa trúng thưởng hoặc chưa có kết quả.");
        }
        if (item.ticketNumbers() == null || item.ticketNumbers().isBlank()
                || item.winningNumber() == null || item.winningNumber().isBlank()) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE,
                    "Thiếu bằng chứng đối chiếu số trên vé / số trúng KQXS — không thể trả thưởng.");
        }
        PrizePayoutChannel channel = PrizePayoutChannel.IN_PERSON;
        return new PrizePayoutPreviewResponse(
                item.orderDetailId(),
                item.serialId(),
                item.prizeCode(),
                item.prizeDisplayName(),
                item.grossAmount(),
                item.taxAmount(),
                item.commissionAmount(),
                item.netAmount(),
                channel,
                false,
                item.ticketOrigin(),
                item.ownershipVerificationLevel(),
                item.requiresManualOwnershipConfirm(),
                item.requiresRecipientIdentity(),
                item.requiresRecipientIdImage(),
                item.requiresFourEyes(),
                item.taxThreshold(),
                item.orderType(),
                item.orderCode(),
                item.customerId(),
                item.customerName(),
                item.orderGuestName(),
                item.phone(),
                item.serialNumber(),
                item.stationName(),
                item.drawDate(),
                item.ticketNumbers(),
                item.winningNumber(),
                item.matchFrom(),
                item.matchDigits());
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private PrizePayoutRequestModel getRequestOrThrow(Long id) {
        return prizePayoutRequestRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));
    }

    private PrizePayoutRequestResponse toResponse(Long id, UUID viewerStaffId) {
        PrizePayoutRequestModel model = prizePayoutRequestRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));
        OrderDetailEntity detail = orderDetailRepository.findById(model.getOrderDetailId()).orElse(null);
        UserEntity customer = model.getCustomerId() != null
                ? userRepository.findById(model.getCustomerId()).orElse(null)
                : null;
        UserEntity createdByUser = resolveUserByAuditValue(model.getCreatedBy(), customer);
        UserEntity completedByUser = model.getCompletedBy() != null
                ? userRepository.findById(model.getCompletedBy()).orElse(null)
                : null;
        int maxRetry = prizePayoutEligibilityService.resolveMaxOnlineRejectRetry();
        boolean locked = prizePayoutEligibilityService.isOnlineClaimLocked(model.getSerialId());
        boolean requiresFourEyes = prizePayoutEligibilityService.requiresFourEyes(model.getGrossAmount());
        boolean canApprove = canCurrentStaffApprove(model, viewerStaffId, requiresFourEyes);
        boolean canComplete = canCurrentStaffComplete(model, viewerStaffId, requiresFourEyes);
        return prizePayoutApplicationMapper.toResponse(
                model,
                detail,
                customer,
                createdByUser,
                completedByUser,
                maxRetry,
                locked,
                requiresFourEyes,
                canApprove,
                canComplete);
    }

    private UserEntity resolveUserByAuditValue(String auditValue, UserEntity preferredCustomer) {
        UUID userId = parseUuid(auditValue);
        if (userId == null) {
            return null;
        }
        if (preferredCustomer != null && userId.equals(preferredCustomer.getId())) {
            return preferredCustomer;
        }
        return userRepository.findById(userId).orElse(null);
    }

    private boolean canCurrentStaffApprove(
            PrizePayoutRequestModel model,
            UUID viewerStaffId,
            boolean requiresFourEyes) {
        if (!requiresFourEyes || model.getStatus() != PrizePayoutRequestStatus.PENDING) {
            return false;
        }
        if (viewerStaffId == null) {
            return false;
        }
        UUID creatorId = parseUuid(model.getCreatedBy());
        return creatorId == null || !creatorId.equals(viewerStaffId);
    }

    private boolean canCurrentStaffComplete(
            PrizePayoutRequestModel model,
            UUID viewerStaffId,
            boolean requiresFourEyes) {
        if (requiresFourEyes) {
            if (model.getStatus() != PrizePayoutRequestStatus.APPROVED) {
                return false;
            }
            if (viewerStaffId == null) {
                return false;
            }
            UUID creatorId = parseUuid(model.getCreatedBy());
            return creatorId == null || !creatorId.equals(viewerStaffId);
        }
        return model.getStatus() == PrizePayoutRequestStatus.PENDING;
    }

    private static UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(value.trim());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private List<PrizePayoutRequestStatus> parseStatuses(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        if (status.contains(",")) {
            return Arrays.stream(status.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(PrizePayoutRequestStatus::valueOf)
                    .toList();
        }
        return List.of(PrizePayoutRequestStatus.valueOf(status.trim().toUpperCase()));
    }

    private String generateRequestCode() {
        String date = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        for (int i = 0; i < 5; i++) {
            String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            String code = "PRZ-" + date + "-" + suffix;
            if (!prizePayoutRequestRepositoryPort.existsByRequestCode(code)) {
                return code;
            }
        }
        throw new DomainException(ErrorCode.PRIZE_PAYOUT_CODE_GENERATION_FAILED);
    }

    private void publishStatusChanged(PrizePayoutRequestModel model) {
        eventPublisher.publishEvent(PrizePayoutStatusChangedEvent.builder()
                .requestId(model.getId())
                .requestCode(model.getRequestCode())
                .customerId(model.getCustomerId())
                .status(model.getStatus())
                .grossAmount(model.getGrossAmount())
                .rejectReason(model.getRejectReason())
                .orderDetailId(model.getOrderDetailId())
                .serialId(model.getSerialId())
                .build());
    }

    private String resolveCustomerName(UserEntity customer) {
        if (customer == null) {
            return null;
        }
        return PersonNameMatchUtils.resolveFullName(
                customer.getFirstName(),
                customer.getLastName(),
                customer.getUsername());
    }
}
