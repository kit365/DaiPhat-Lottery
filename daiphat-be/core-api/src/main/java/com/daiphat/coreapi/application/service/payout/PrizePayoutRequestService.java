package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.application.dto.request.payout.CreatePrizePayoutRequestRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutRequestResponse;
import com.daiphat.coreapi.application.event.PrizePayoutStatusChangedEvent;
import com.daiphat.coreapi.application.mapper.payout.PrizePayoutApplicationMapper;
import com.daiphat.coreapi.application.port.in.payout.PrizePayoutRequestServicePort;
import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.payout.PrizePayoutRequestModel;
import com.daiphat.coreapi.domain.model.refund.UserBankAccountModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderDetailRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.shared.util.PageableUtils;
import com.daiphat.coreapi.shared.util.SortUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PrizePayoutRequestService implements PrizePayoutRequestServicePort {

    private final PrizePayoutRequestRepositoryPort prizePayoutRequestRepositoryPort;
    private final UserBankAccountRepositoryPort userBankAccountRepositoryPort;
    private final PrizePayoutEligibilityService prizePayoutEligibilityService;
    private final PrizePayoutSerialLockService prizePayoutSerialLockService;
    private final PrizePayoutApplicationMapper prizePayoutApplicationMapper;
    private final OrderDetailRepository orderDetailRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public PrizePayoutRequestResponse create(UUID customerId, CreatePrizePayoutRequestRequest request) {
        OrderDetailEntity detail = prizePayoutEligibilityService.resolveOwnedDetail(
                customerId, request.orderDetailId(), request.serialId());
        LotteryTicketSerialEntity serial = detail.getLotteryTicketSerial();
        if (serial == null) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND);
        }

        prizePayoutEligibilityService.validateEligible(detail, serial);
        PrizePayoutEligibilityService.PrizeMatchContext match =
                prizePayoutEligibilityService.resolvePrizeMatch(detail, serial);

        UserBankAccountModel bankAccount = userBankAccountRepositoryPort.findById(request.bankAccountId())
                .orElseThrow(() -> new DomainException(ErrorCode.USER_BANK_ACCOUNT_NOT_FOUND));
        if (!bankAccount.getUserId().equals(customerId)) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_BANK_ACCOUNT_MISMATCH);
        }

        PrizePayoutRequestModel model = PrizePayoutRequestModel.builder()
                .requestCode(generateRequestCode())
                .customerId(customerId)
                .orderId(detail.getOrder().getId())
                .orderDetailId(detail.getId())
                .serialId(serial.getId())
                .prizeCode(match.prizeCode())
                .prizeDisplayName(match.prizeDisplayName())
                .grossAmount(match.prizeAmount())
                .bankAccountId(bankAccount.getId())
                .bankName(bankAccount.getBankName())
                .bankAccountNumber(bankAccount.getBankAccountNo())
                .accountHolderName(bankAccount.getBankAccountName())
                .build();
        model.initializeForCreate();

        PrizePayoutRequestModel saved = prizePayoutRequestRepositoryPort.save(model);
        prizePayoutSerialLockService.lockSerial(serial.getId());

        publishStatusChanged(saved);
        return toResponse(saved.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PrizePayoutRequestResponse> getMyRequests(
            UUID customerId,
            int page,
            int limit,
            String status,
            String search) {
        Pageable pageable = PageableUtils.of(
                page,
                limit,
                SortUtils.byCreatedAtDesc());

        PrizePayoutRequestStatus parsedStatus = parseStatus(status);
        Page<PrizePayoutRequestModel> resultPage = prizePayoutRequestRepositoryPort.findAll(
                pageable, customerId, parsedStatus, null, search);

        Page<PrizePayoutRequestResponse> mapped = resultPage.map(model -> toResponse(model.getId()));

        Map<String, Long> statusCounts = buildStatusCounts(customerId, search);
        return PageResponse.from(mapped, page, limit, statusCounts);
    }

    @Override
    @Transactional(readOnly = true)
    public PrizePayoutRequestResponse getById(Long id, UUID customerId) {
        PrizePayoutRequestModel model = getOwnedOrThrow(id, customerId);
        return toResponse(model.getId());
    }

    @Override
    @Transactional
    public PrizePayoutRequestResponse cancel(Long id, UUID customerId) {
        PrizePayoutRequestModel model = getOwnedOrThrow(id, customerId);
        model.markCancelled();
        PrizePayoutRequestModel saved = prizePayoutRequestRepositoryPort.save(model);
        prizePayoutSerialLockService.unlockSerial(saved.getSerialId());
        publishStatusChanged(saved);
        return toResponse(saved.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnumOptionResponse> getStatuses() {
        return Arrays.stream(PrizePayoutRequestStatus.values())
                .map(status -> new EnumOptionResponse(status.name(), resolveStatusLabel(status)))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long countPendingByCustomerId(UUID customerId) {
        return prizePayoutRequestRepositoryPort.countPendingByCustomerId(customerId);
    }

    private PrizePayoutRequestModel getOwnedOrThrow(Long id, UUID customerId) {
        PrizePayoutRequestModel model = prizePayoutRequestRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));
        if (!model.getCustomerId().equals(customerId)) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_ACCESS_DENIED);
        }
        return model;
    }

    private PrizePayoutRequestResponse toResponse(Long id) {
        PrizePayoutRequestModel model = prizePayoutRequestRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));
        OrderDetailEntity detail = orderDetailRepository.findById(model.getOrderDetailId())
                .orElse(null);
        UserEntity customer = model.getCustomerId() != null
                ? userRepository.findById(model.getCustomerId()).orElse(null)
                : null;
        return prizePayoutApplicationMapper.toResponse(model, detail, customer);
    }

    private Map<String, Long> buildStatusCounts(UUID customerId, String search) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (PrizePayoutRequestStatus status : PrizePayoutRequestStatus.values()) {
            counts.put(
                    status.name(),
                    prizePayoutRequestRepositoryPort.countByStatus(status, customerId, search));
        }
        return counts;
    }

    private PrizePayoutRequestStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return PrizePayoutRequestStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Trạng thái yêu cầu trả thưởng không hợp lệ.");
        }
    }

    private String resolveStatusLabel(PrizePayoutRequestStatus status) {
        return switch (status) {
            case PENDING -> "Cần xử lý";
            case COMPLETED -> "Đã chuyển";
            case REJECTED -> "Từ chối";
            case CANCELLED -> "Đã hủy";
        };
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
}
