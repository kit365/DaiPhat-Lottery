package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.application.dto.request.payout.CompletePrizePayoutRequest;
import com.daiphat.coreapi.application.dto.request.payout.RejectPrizePayoutRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutRequestResponse;
import com.daiphat.coreapi.application.dto.response.payout.PrizePayoutStaffListResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.event.PrizePayoutStatusChangedEvent;
import com.daiphat.coreapi.application.mapper.payout.PrizePayoutApplicationMapper;
import com.daiphat.coreapi.application.port.in.payout.PrizePayoutStaffServicePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.payout.PrizePayoutRequestModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderDetailRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.shared.util.PageableUtils;
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
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PrizePayoutStaffService implements PrizePayoutStaffServicePort {

    private final PrizePayoutRequestRepositoryPort prizePayoutRequestRepositoryPort;
    private final PrizePayoutSerialLockService prizePayoutSerialLockService;
    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final PrizePayoutApplicationMapper prizePayoutApplicationMapper;
    private final OrderDetailRepository orderDetailRepository;
    private final UserRepository userRepository;
    private final StoragePort storagePort;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional(readOnly = true)
    public PrizePayoutStaffListResponse getRequestsForStaff(int page, int limit, String status, String search) {
        Pageable pageable = PageableUtils.of(
                page,
                limit,
                SortUtils.byCreatedAtDesc());

        List<PrizePayoutRequestStatus> statuses = parseStatuses(status);
        PrizePayoutRequestStatus singleStatus = statuses != null && statuses.size() == 1 ? statuses.get(0) : null;

        Page<PrizePayoutRequestModel> resultPage = prizePayoutRequestRepositoryPort.findAll(
                pageable, null, singleStatus, statuses, search);

        Page<PrizePayoutRequestResponse> mapped = resultPage.map(model -> toResponse(model.getId()));

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
    public PrizePayoutRequestResponse getByIdForStaff(Long id) {
        PrizePayoutRequestModel model = getRequestOrThrow(id);
        return toResponse(model.getId());
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

        StorageUtils.validateImageEvidenceUrl(request.transferEvidenceUrl());
        model.markCompleted(staffId, request.transferEvidenceUrl());
        PrizePayoutRequestModel saved = prizePayoutRequestRepositoryPort.save(model);
        prizePayoutSerialLockService.markPaidOut(saved.getSerialId());
        publishStatusChanged(saved);
        return toResponse(saved.getId());
    }

    @Override
    @Transactional
    public PrizePayoutRequestResponse reject(Long id, UUID staffId, RejectPrizePayoutRequest request) {
        PrizePayoutRequestModel model = getRequestOrThrow(id);
        model.markRejected(request.reason(), staffId);
        PrizePayoutRequestModel saved = prizePayoutRequestRepositoryPort.save(model);
        prizePayoutSerialLockService.unlockSerial(saved.getSerialId());
        publishStatusChanged(saved);
        return toResponse(saved.getId());
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

    private PrizePayoutRequestModel getRequestOrThrow(Long id) {
        return prizePayoutRequestRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));
    }

    private PrizePayoutRequestResponse toResponse(Long id) {
        PrizePayoutRequestModel model = prizePayoutRequestRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));
        OrderDetailEntity detail = orderDetailRepository.findById(model.getOrderDetailId()).orElse(null);
        UserEntity customer = model.getCustomerId() != null
                ? userRepository.findById(model.getCustomerId()).orElse(null)
                : null;
        return prizePayoutApplicationMapper.toResponse(model, detail, customer);
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
