package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultDetailRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureRepositoryPort;
import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.TicketDrawResultStatus;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutChannel;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutOwnershipVerificationLevel;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutTicketOrigin;
import com.daiphat.coreapi.domain.model.enums.payout.PrizeRedemptionZone;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultDetailModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import com.daiphat.coreapi.domain.model.payout.PrizePayoutRequestModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.domain.service.lottery.TicketPrizeMatcher;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderDetailRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PrizePayoutEligibilityService {

    private static final EnumSet<PrizePayoutRequestStatus> BLOCKING_STATUSES = EnumSet.of(
            PrizePayoutRequestStatus.PENDING,
            PrizePayoutRequestStatus.APPROVED,
            PrizePayoutRequestStatus.COMPLETED);

    private static final EnumSet<PrizePayoutRequestStatus> ONLINE_REJECT_LOCK_STATUSES = EnumSet.of(
            PrizePayoutRequestStatus.REJECTED,
            PrizePayoutRequestStatus.MANUAL_RESOLUTION);

    /** Still held by agent (or expired while held). */
    private static final EnumSet<LotteryTicketSerialStatus> ONLINE_HELD_SERIAL_STATUSES = EnumSet.of(
            LotteryTicketSerialStatus.SOLD,
            LotteryTicketSerialStatus.EXPIRED);

    /** IN_PERSON also allows tickets already handed to the customer. */
    private static final EnumSet<LotteryTicketSerialStatus> IN_PERSON_SERIAL_STATUSES = EnumSet.of(
            LotteryTicketSerialStatus.SOLD,
            LotteryTicketSerialStatus.EXPIRED,
            LotteryTicketSerialStatus.SOLD);

    private final OrderDetailRepository orderDetailRepository;
    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final LotteryResultRepositoryPort lotteryResultRepositoryPort;
    private final LotteryResultDetailRepositoryPort lotteryResultDetailRepositoryPort;
    private final PrizeStructureRepositoryPort prizeStructureRepositoryPort;
    private final PrizePayoutRequestRepositoryPort prizePayoutRequestRepositoryPort;
    private final PrizePayoutCalculationService prizePayoutCalculationService;
    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final PrizeRedemptionDeadlineService prizeRedemptionDeadlineService;

    public record PrizeMatchContext(
            TicketDrawResultStatus drawResultStatus,
            String prizeCode,
            String prizeDisplayName,
            BigDecimal prizeAmount,
            String ticketNumbers,
            String winningNumber,
            String matchFrom,
            Integer matchDigits
    ) {
    }

    public record OwnershipVerificationContext(
            PrizePayoutTicketOrigin ticketOrigin,
            PrizePayoutOwnershipVerificationLevel level,
            boolean requiresManualOwnershipConfirm
    ) {
    }

    public PrizePayoutTicketOrigin resolveTicketOrigin(OrderEntity order) {
        if (order == null || order.getOrderType() == null) {
            return PrizePayoutTicketOrigin.INTERNAL_OFFLINE;
        }
        return order.getOrderType() == OrderType.ONLINE
                ? PrizePayoutTicketOrigin.INTERNAL_ONLINE
                : PrizePayoutTicketOrigin.INTERNAL_OFFLINE;
    }

    /**
     * Verifies serial/order linkage and resolves how strongly ownership can be proven in-system.
     */
    @Transactional(readOnly = true)
    public OwnershipVerificationContext resolveOwnershipVerification(
            OrderDetailEntity detail,
            LotteryTicketSerialEntity serial) {
        if (detail == null || serial == null) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE, "Thiếu thông tin vé để xác minh.");
        }
        LotteryTicketSerialEntity linked = detail.getLotteryTicketSerial();
        if (linked == null || linked.getId() == null || !linked.getId().equals(serial.getId())) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE,
                    "Serial không khớp order detail gốc.");
        }

        LotteryTicketEntity ticket = serial.getTicket() != null ? serial.getTicket() : linked.getTicket();
        if (ticket == null || ticket.getStation() == null || ticket.getDrawDate() == null) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE,
                    "Thiếu đài / ngày quay trên record vé — không thể đối chiếu.");
        }
        if (serial.getSerialNumber() == null || serial.getSerialNumber().isBlank()) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE,
                    "Thiếu số serial trên record vé — không thể đối chiếu.");
        }

        OrderEntity order = detail.getOrder();
        if (order == null) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE, "Không tìm thấy đơn gốc của vé.");
        }

        PrizePayoutTicketOrigin origin = resolveTicketOrigin(order);
        if (origin == PrizePayoutTicketOrigin.INTERNAL_ONLINE) {
            if (order.getUser() == null) {
                throw new DomainException(
                        ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE,
                        "Vé trực tuyến thiếu chủ sở hữu trên hệ thống — không thể trả thưởng tự động đối chiếu.");
            }
            return new OwnershipVerificationContext(
                    origin,
                    PrizePayoutOwnershipVerificationLevel.AUTO_MATCHED,
                    false);
        }

        if (order.getUser() != null) {
            return new OwnershipVerificationContext(
                    origin,
                    PrizePayoutOwnershipVerificationLevel.CUSTOMER_LINKED,
                    false);
        }

        return new OwnershipVerificationContext(
                origin,
                PrizePayoutOwnershipVerificationLevel.MANUAL_ONLY,
                true);
    }

    @Transactional(readOnly = true)
    public OrderDetailEntity resolveOwnedDetail(UUID customerId, Long orderDetailId, Long serialId) {
        OrderDetailEntity detail = resolveDetail(orderDetailId, serialId, null, null, null);
        OrderEntity order = detail.getOrder();
        if (order == null || order.getUser() == null || !order.getUser().getId().equals(customerId)) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_ACCESS_DENIED);
        }
        return detail;
    }

    @Transactional(readOnly = true)
    public OrderDetailEntity resolveDetail(Long orderDetailId, Long serialId) {
        return resolveDetail(orderDetailId, serialId, null, null, null);
    }

    /**
     * Resolves a sold order detail eligible for prize payout (held or already handed over).
     * Staff counter must use orderDetailId (after list pick) or station+drawDate+serial — never serial alone.
     */
    @Transactional(readOnly = true)
    public OrderDetailEntity resolveDetail(
            Long orderDetailId,
            Long serialId,
            String serialNumber,
            String orderCode) {
        return resolveDetail(orderDetailId, serialId, serialNumber, orderCode, null);
    }

    @Transactional(readOnly = true)
    public OrderDetailEntity resolveDetail(
            Long orderDetailId,
            Long serialId,
            String serialNumber,
            String orderCode,
            LocalDate drawDateIgnored) {
        // Keep 5-arg signature for callers that still pass null drawDate; station triple uses dedicated API.
        if (orderDetailId != null) {
            return orderDetailRepository.findById(orderDetailId)
                    .orElseThrow(() -> new DomainException(
                            ErrorCode.ORDER_DETAIL_NOT_FOUND,
                            PrizePayoutRequestModel.OUT_OF_SCOPE_TICKET_MESSAGE));
        }
        if (serialId != null) {
            return orderDetailRepository.findPayoutEligibleBySerialId(serialId)
                    .orElseThrow(() -> new DomainException(
                            ErrorCode.ORDER_DETAIL_NOT_FOUND,
                            PrizePayoutRequestModel.OUT_OF_SCOPE_TICKET_MESSAGE));
        }
        throw new DomainException(
                ErrorCode.INVALID_INPUT,
                "Cần orderDetailId (sau tra cứu) — không tra cứu bằng serial đơn lẻ.");
    }

    @Transactional(readOnly = true)
    public OrderDetailEntity resolveByStationDrawSerial(Long stationId, LocalDate drawDate, String serialNumber) {
        if (stationId == null || drawDate == null || serialNumber == null || serialNumber.isBlank()) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Nhập đủ đài (issuer), ngày quay và số serial.");
        }
        return orderDetailRepository
                .findActiveByStationDrawSerial(stationId, drawDate, serialNumber.trim())
                .orElseThrow(() -> new DomainException(
                        ErrorCode.ORDER_DETAIL_NOT_FOUND,
                        PrizePayoutRequestModel.OUT_OF_SCOPE_TICKET_MESSAGE));
    }

    @Transactional(readOnly = true)
    public List<OrderDetailEntity> resolveAllByOrderCode(String orderCode) {
        if (orderCode == null || orderCode.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Nhập mã đơn.");
        }
        List<OrderDetailEntity> matches = orderDetailRepository.findActiveByOrderCode(orderCode.trim());
        if (matches.isEmpty()) {
            throw new DomainException(
                    ErrorCode.ORDER_DETAIL_NOT_FOUND,
                    PrizePayoutRequestModel.OUT_OF_SCOPE_TICKET_MESSAGE);
        }
        return matches;
    }

    @Transactional(readOnly = true)
    public List<OrderDetailEntity> resolveAllByPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Nhập số điện thoại.");
        }
        List<OrderDetailEntity> matches = orderDetailRepository.searchByPhone(phone.trim());
        if (matches.isEmpty()) {
            throw new DomainException(
                    ErrorCode.ORDER_DETAIL_NOT_FOUND,
                    "Không tìm thấy đơn hàng nào.");
        }
        return matches;
    }

    @Transactional(readOnly = true)
    public List<OrderDetailEntity> resolveAllByEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Nhập email.");
        }
        List<OrderDetailEntity> matches = orderDetailRepository.searchByEmail(email.trim());
        if (matches.isEmpty()) {
            throw new DomainException(
                    ErrorCode.ORDER_DETAIL_NOT_FOUND,
                    "Không tìm thấy đơn hàng nào.");
        }
        return matches;
    }

    @Transactional(readOnly = true)
    public PrizePayoutChannel resolveClaimChannel(
            OrderDetailEntity detail,
            LotteryTicketSerialEntity serial,
            BigDecimal grossAmount) {
        OrderEntity order = detail.getOrder();
        boolean onlineOrder = order != null && order.getOrderType() == OrderType.ONLINE;
        boolean agentHeld = ONLINE_HELD_SERIAL_STATUSES.contains(serial.getStatus());
        BigDecimal onlineMax = prizePayoutCalculationService.resolveOnlineMaxAmount();
        boolean withinOnlineCap = grossAmount != null
                && onlineMax != null
                && grossAmount.compareTo(onlineMax) <= 0;

        if (onlineOrder && agentHeld && withinOnlineCap) {
            return PrizePayoutChannel.ONLINE;
        }
        return PrizePayoutChannel.IN_PERSON;
    }

    @Transactional(readOnly = true)
    public void validateCustomerOnlineCreate(OrderDetailEntity detail, LotteryTicketSerialEntity serial) {
        validateCommonBlocking(serial);
        ensureOnlineClaimNotLocked(serial.getId());
        PrizeMatchContext match = resolvePrizeMatch(detail, serial);
        ensureWonWithAmount(match);

        PrizePayoutChannel channel = resolveClaimChannel(detail, serial, match.prizeAmount());
        if (channel != PrizePayoutChannel.ONLINE) {
            OrderEntity order = detail.getOrder();
            if (order == null || order.getOrderType() != OrderType.ONLINE) {
                throw new DomainException(
                        ErrorCode.PRIZE_PAYOUT_REQUIRES_IN_PERSON,
                        "Vé không mua trực tuyến qua hệ thống — vui lòng đến đại lý đổi thưởng.");
            }
            if (!ONLINE_HELD_SERIAL_STATUSES.contains(serial.getStatus())) {
                throw new DomainException(
                        ErrorCode.PRIZE_PAYOUT_REQUIRES_IN_PERSON,
                        "Vé đã được lấy về hoặc không còn được đại lý giữ hộ — vui lòng đến đại lý đổi thưởng.");
            }
            BigDecimal onlineMax = prizePayoutCalculationService.resolveOnlineMaxAmount();
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_REQUIRES_IN_PERSON,
                    "Giá trị giải vượt hạn mức trả thưởng trực tuyến ("
                            + onlineMax.toPlainString()
                            + "đ) — vui lòng đến đại lý đổi thưởng.");
        }
        enforceCustomerRedemptionWindow(detail, serial);
    }

    @Transactional(readOnly = true)
    public boolean isOnlineClaimLocked(Long serialId) {
        if (serialId == null) {
            return false;
        }
        if (prizePayoutRequestRepositoryPort.existsBySerialIdAndChannelAndStatus(
                serialId, PrizePayoutChannel.ONLINE, PrizePayoutRequestStatus.MANUAL_RESOLUTION)) {
            return true;
        }
        long rejectAttempts = prizePayoutRequestRepositoryPort.countBySerialIdAndChannelAndStatuses(
                serialId, PrizePayoutChannel.ONLINE, ONLINE_REJECT_LOCK_STATUSES);
        return rejectAttempts >= resolveMaxOnlineRejectRetry();
    }

    public int resolveMaxOnlineRejectRetry() {
        String fallback = SystemConfigEnum.MAX_PRIZE_PAYOUT_ONLINE_REJECT.getDefaultValue();
        String raw = systemConfigRepositoryPort
                .findActiveByConfigKey(SystemConfigEnum.MAX_PRIZE_PAYOUT_ONLINE_REJECT.name())
                .map(SystemConfigModel::getConfigValue)
                .orElse(fallback);
        try {
            int value = Integer.parseInt(raw.trim());
            return value > 0 ? value : Integer.parseInt(fallback);
        } catch (NumberFormatException ex) {
            return Integer.parseInt(fallback);
        }
    }

    public long countOnlineRejectAttempts(Long serialId) {
        if (serialId == null) {
            return 0;
        }
        return prizePayoutRequestRepositoryPort.countBySerialIdAndChannelAndStatuses(
                serialId, PrizePayoutChannel.ONLINE, ONLINE_REJECT_LOCK_STATUSES);
    }

    private void ensureOnlineClaimNotLocked(Long serialId) {
        if (isOnlineClaimLocked(serialId)) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_REQUIRES_IN_PERSON,
                    PrizePayoutRequestModel.MANUAL_RESOLUTION_NOTE);
        }
    }

    @Transactional(readOnly = true)
    public void validateStaffInPersonCreate(OrderDetailEntity detail, LotteryTicketSerialEntity serial) {
        validateStaffInPersonCreate(detail, serial, false);
    }

    @Transactional(readOnly = true)
    public void validateStaffInPersonCreate(
            OrderDetailEntity detail,
            LotteryTicketSerialEntity serial,
            boolean acknowledgeLateRedemption) {
        validateCommonBlocking(serial);
        if (!IN_PERSON_SERIAL_STATUSES.contains(serial.getStatus())) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE,
                    "Vé không đủ điều kiện trả thưởng ở trạng thái hiện tại.");
        }
        PrizeMatchContext match = resolvePrizeMatch(detail, serial);
        ensureWonWithAmount(match);
        enforceStaffRedemptionWindow(detail, serial, acknowledgeLateRedemption);
    }

    public PrizeRedemptionDeadlineService.RedemptionDeadlines resolveRedemptionDeadlines(
            OrderDetailEntity detail,
            LotteryTicketSerialEntity serial) {
        LotteryTicketEntity ticket = serial != null ? serial.getTicket() : null;
        if (ticket == null && detail != null && detail.getLotteryTicketSerial() != null) {
            ticket = detail.getLotteryTicketSerial().getTicket();
        }
        if (ticket == null || ticket.getDrawDate() == null) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE, "Thiếu ngày quay để tính hạn đổi thưởng.");
        }
        Long stationId = ticket.getStation() != null ? ticket.getStation().getId() : null;
        return prizeRedemptionDeadlineService.resolve(ticket.getDrawDate(), stationId);
    }

    private void enforceCustomerRedemptionWindow(OrderDetailEntity detail, LotteryTicketSerialEntity serial) {
        PrizeRedemptionDeadlineService.RedemptionDeadlines deadlines = resolveRedemptionDeadlines(detail, serial);
        if (deadlines.zone() == PrizeRedemptionZone.WITHIN_CUSTOMER) {
            return;
        }
        if (deadlines.zone() == PrizeRedemptionZone.PAST_ISSUER_LOCKED) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_ISSUER_REDEMPTION_EXPIRED);
        }
        throw new DomainException(ErrorCode.PRIZE_PAYOUT_CUSTOMER_REDEMPTION_EXPIRED);
    }

    private void enforceStaffRedemptionWindow(
            OrderDetailEntity detail,
            LotteryTicketSerialEntity serial,
            boolean acknowledgeLateRedemption) {
        PrizeRedemptionDeadlineService.RedemptionDeadlines deadlines = resolveRedemptionDeadlines(detail, serial);
        if (deadlines.zone() == PrizeRedemptionZone.WITHIN_CUSTOMER) {
            return;
        }
        if (deadlines.zone() == PrizeRedemptionZone.PAST_ISSUER_LOCKED) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_ISSUER_REDEMPTION_EXPIRED);
        }
        if (!acknowledgeLateRedemption) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_LATE_REDEMPTION_ACK_REQUIRED);
        }
    }

    /** @deprecated Prefer validateCustomerOnlineCreate / validateStaffInPersonCreate. */
    @Transactional(readOnly = true)
    public void validateEligible(OrderDetailEntity detail, LotteryTicketSerialEntity serial) {
        validateCustomerOnlineCreate(detail, serial);
    }

    @Transactional(readOnly = true)
    public PrizeMatchContext resolvePrizeMatch(OrderDetailEntity detail, LotteryTicketSerialEntity serial) {
        LotteryTicketEntity ticket = serial.getTicket();
        String ticketNumbers = ticket != null ? ticket.getNumbers() : null;
        if (ticket == null || ticket.getStation() == null || ticket.getDrawDate() == null) {
            return new PrizeMatchContext(TicketDrawResultStatus.PENDING_DRAW, null, null, null, ticketNumbers, null, null, null);
        }

        if (ticket.getDrawDate().isAfter(LocalDate.now())) {
            return new PrizeMatchContext(TicketDrawResultStatus.PENDING_DRAW, null, null, null, ticketNumbers, null, null, null);
        }

        Optional<LotteryResultModel> resultOpt = lotteryResultRepositoryPort.findByStationIdAndDrawDate(
                ticket.getStation().getId(),
                ticket.getDrawDate());
        if (resultOpt.isEmpty() || resultOpt.get().getStatus() != LotteryResultStatus.COMPLETED) {
            return new PrizeMatchContext(TicketDrawResultStatus.PENDING_DRAW, null, null, null, ticketNumbers, null, null, null);
        }

        List<LotteryResultDetailModel> resultDetails = lotteryResultDetailRepositoryPort
                .findByLotteryResultId(resultOpt.get().getId());
        Optional<TicketPrizeMatcher.MatchResult> match = TicketPrizeMatcher.findFirstMatch(ticketNumbers, resultDetails);
        if (match.isEmpty()) {
            return new PrizeMatchContext(TicketDrawResultStatus.LOST, null, null, null, ticketNumbers, null, null, null);
        }

        BigDecimal prizeAmount = resolvePrizeAmount(match.get().prizeStructureId());
        return new PrizeMatchContext(
                TicketDrawResultStatus.WON,
                match.get().prizeCode(),
                match.get().prizeDisplayName(),
                prizeAmount,
                ticketNumbers,
                match.get().winningNumber(),
                match.get().matchFrom(),
                match.get().matchDigits());
    }

    @Transactional(readOnly = true)
    public PrizeMatchContext resolvePrizeMatchForSerial(Long serialId) {
        LotteryTicketSerialModel serial = lotteryTicketSerialRepositoryPort.findById(serialId)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));
        OrderDetailEntity detail = orderDetailRepository.findPayoutEligibleBySerialId(serialId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_DETAIL_NOT_FOUND));
        LotteryTicketSerialEntity serialEntity = detail.getLotteryTicketSerial();
        if (serialEntity == null) {
            serialEntity = new LotteryTicketSerialEntity();
            serialEntity.setId(serial.getId());
            serialEntity.setStatus(serial.getStatus());
            serialEntity.setPayoutState(serial.getPayoutState());
        }
        return resolvePrizeMatch(detail, serialEntity);
    }

    public BigDecimal resolvePrizeAmount(Long prizeStructureId) {
        if (prizeStructureId == null) {
            return null;
        }
        return prizeStructureRepositoryPort.findById(prizeStructureId)
                .map(PrizeStructureModel::getPrizeValue)
                .orElse(null);
    }

    private void validateCommonBlocking(LotteryTicketSerialEntity serial) {
        if (serial.getTicketCondition() != null && serial.getTicketCondition() == TicketCondition.VOIDED) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE,
                    "Vé đã bị hủy do nhập sai và được thay thế — không thể trả thưởng trên sê-ri này.");
        }
        SerialPayoutState payoutState = serial.getPayoutState() != null ? serial.getPayoutState() : SerialPayoutState.NONE;
        if (payoutState == SerialPayoutState.PAID_OUT) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_ALREADY_REQUESTED, "Vé đã được trả thưởng.");
        }
        if (payoutState == SerialPayoutState.PAYOUT_PENDING) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_ALREADY_REQUESTED, "Vé đang có yêu cầu trả thưởng.");
        }

        if (prizePayoutRequestRepositoryPort.existsBySerialIdAndStatuses(serial.getId(), BLOCKING_STATUSES)) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_ALREADY_REQUESTED);
        }
    }

    private void ensureWonWithAmount(PrizeMatchContext match) {
        validateWonWithProof(match);
    }

    public void validateWonWithProof(PrizeMatchContext match) {
        if (match.drawResultStatus() != TicketDrawResultStatus.WON) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE, "Vé chưa trúng thưởng hoặc chưa có kết quả.");
        }
        if (match.prizeAmount() == null || match.prizeAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE, "Không xác định được số tiền trúng.");
        }
        if (match.ticketNumbers() == null || match.ticketNumbers().isBlank()
                || match.winningNumber() == null || match.winningNumber().isBlank()) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE,
                    "Thiếu bằng chứng đối chiếu số trên vé / số trúng KQXS — không thể trả thưởng.");
        }
    }

    public boolean requiresRecipientIdentity(
            PrizePayoutOwnershipVerificationLevel level,
            BigDecimal grossAmount) {
        // Always capture name + CCCD number for counter payouts; image is separate.
        return true;
    }

    public boolean requiresRecipientIdImage(UUID customerId, BigDecimal grossAmount) {
        if (customerId == null) {
            return true;
        }
        return isAtOrAboveTaxThreshold(grossAmount);
    }

    public boolean requiresFourEyes(BigDecimal grossAmount) {
        return isAtOrAboveTaxThreshold(grossAmount);
    }

    public boolean isAtOrAboveTaxThreshold(BigDecimal grossAmount) {
        if (grossAmount == null) {
            return false;
        }
        BigDecimal threshold = prizePayoutCalculationService.resolveTaxThreshold();
        return threshold != null && grossAmount.compareTo(threshold) >= 0;
    }
}
