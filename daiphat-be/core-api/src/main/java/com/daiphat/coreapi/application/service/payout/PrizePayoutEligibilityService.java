package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultDetailRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureRepositoryPort;
import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.order.TicketDrawResultStatus;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultDetailModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
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
            PrizePayoutRequestStatus.COMPLETED);

    private final OrderDetailRepository orderDetailRepository;
    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final LotteryResultRepositoryPort lotteryResultRepositoryPort;
    private final LotteryResultDetailRepositoryPort lotteryResultDetailRepositoryPort;
    private final PrizeStructureRepositoryPort prizeStructureRepositoryPort;
    private final PrizePayoutRequestRepositoryPort prizePayoutRequestRepositoryPort;

    public record PrizeMatchContext(
            TicketDrawResultStatus drawResultStatus,
            String prizeCode,
            String prizeDisplayName,
            BigDecimal prizeAmount
    ) {
    }

    @Transactional(readOnly = true)
    public OrderDetailEntity resolveOwnedDetail(UUID customerId, Long orderDetailId, Long serialId) {
        OrderDetailEntity detail;
        if (orderDetailId != null) {
            detail = orderDetailRepository.findById(orderDetailId)
                    .orElseThrow(() -> new DomainException(ErrorCode.ORDER_DETAIL_NOT_FOUND));
        } else if (serialId != null) {
            detail = orderDetailRepository.findActiveBySerialId(serialId)
                    .orElseThrow(() -> new DomainException(ErrorCode.ORDER_DETAIL_NOT_FOUND));
        } else {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Cần chỉ định orderDetailId hoặc serialId.");
        }

        OrderEntity order = detail.getOrder();
        if (order == null || order.getUser() == null || !order.getUser().getId().equals(customerId)) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_ACCESS_DENIED);
        }
        return detail;
    }

    @Transactional(readOnly = true)
    public void validateEligible(OrderDetailEntity detail, LotteryTicketSerialEntity serial) {
        if (serial.getStatus() != LotteryTicketSerialStatus.PROXY_HOLDING) {
            throw new DomainException(
                    ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE,
                    "Vé chưa ở trạng thái đang giữ hộ, không thể yêu cầu trả thưởng.");
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

        PrizeMatchContext match = resolvePrizeMatch(detail, serial);
        if (match.drawResultStatus() != TicketDrawResultStatus.WON) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE, "Vé chưa trúng thưởng hoặc chưa có kết quả.");
        }
        if (match.prizeAmount() == null || match.prizeAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_ELIGIBLE, "Không xác định được số tiền trúng.");
        }
    }

    @Transactional(readOnly = true)
    public PrizeMatchContext resolvePrizeMatch(OrderDetailEntity detail, LotteryTicketSerialEntity serial) {
        LotteryTicketEntity ticket = serial.getTicket();
        if (ticket == null || ticket.getStation() == null || ticket.getDrawDate() == null) {
            return new PrizeMatchContext(TicketDrawResultStatus.PENDING_DRAW, null, null, null);
        }

        if (ticket.getDrawDate().isAfter(LocalDate.now())) {
            return new PrizeMatchContext(TicketDrawResultStatus.PENDING_DRAW, null, null, null);
        }

        Optional<LotteryResultModel> resultOpt = lotteryResultRepositoryPort.findByStationIdAndDrawDate(
                ticket.getStation().getId(),
                ticket.getDrawDate());
        if (resultOpt.isEmpty() || resultOpt.get().getStatus() != LotteryResultStatus.COMPLETED) {
            return new PrizeMatchContext(TicketDrawResultStatus.PENDING_DRAW, null, null, null);
        }

        List<LotteryResultDetailModel> resultDetails = lotteryResultDetailRepositoryPort
                .findByLotteryResultId(resultOpt.get().getId());
        Optional<TicketPrizeMatcher.MatchResult> match = TicketPrizeMatcher.findFirstMatch(ticket.getNumbers(), resultDetails);
        if (match.isEmpty()) {
            return new PrizeMatchContext(TicketDrawResultStatus.LOST, null, null, null);
        }

        BigDecimal prizeAmount = resolvePrizeAmount(match.get().prizeStructureId());
        return new PrizeMatchContext(
                TicketDrawResultStatus.WON,
                match.get().prizeCode(),
                match.get().prizeDisplayName(),
                prizeAmount);
    }

  @Transactional(readOnly = true)
    public PrizeMatchContext resolvePrizeMatchForSerial(Long serialId) {
        LotteryTicketSerialModel serial = lotteryTicketSerialRepositoryPort.findById(serialId)
                .orElseThrow(() -> new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND));
        OrderDetailEntity detail = orderDetailRepository.findActiveBySerialId(serialId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_DETAIL_NOT_FOUND));
        LotteryTicketSerialEntity serialEntity = new LotteryTicketSerialEntity();
        serialEntity.setId(serial.getId());
        serialEntity.setStatus(serial.getStatus());
        serialEntity.setPayoutState(serial.getPayoutState());
        LotteryTicketEntity ticketEntity = new LotteryTicketEntity();
        ticketEntity.setId(serial.getTicketId());
        serialEntity.setTicket(ticketEntity);
        if (detail.getLotteryTicketSerial() != null && detail.getLotteryTicketSerial().getTicket() != null) {
            serialEntity.setTicket(detail.getLotteryTicketSerial().getTicket());
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
}
