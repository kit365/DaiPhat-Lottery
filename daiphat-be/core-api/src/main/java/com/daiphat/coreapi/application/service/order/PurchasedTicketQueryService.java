package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.PurchasedTicketResponse;
import com.daiphat.coreapi.application.port.in.order.PurchasedTicketQueryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultDetailRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.PurchasedTicketQueryRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus;
import com.daiphat.coreapi.domain.model.enums.order.TicketDrawResultStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultDetailModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultModel;
import com.daiphat.coreapi.domain.service.lottery.TicketPrizeMatcher;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.infrastructure.persistence.specification.PurchasedTicketSpecification;
import com.daiphat.coreapi.shared.util.SortUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PurchasedTicketQueryService implements PurchasedTicketQueryPort {

    private final PurchasedTicketQueryRepositoryPort purchasedTicketQueryRepositoryPort;
    private final LotteryResultRepositoryPort lotteryResultRepositoryPort;
    private final LotteryResultDetailRepositoryPort lotteryResultDetailRepositoryPort;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PurchasedTicketResponse> getMyTickets(
            UUID userId,
            int page,
            int size,
            TicketDrawResultStatus status,
            LocalDate fromDate,
            LocalDate toDate,
            String ticketNumber,
            String sortBy,
            String direction) {

        PageRequest pageable = PageRequest.of(
                Math.max(0, page - 1),
                size,
                SortUtils.createSort(sortBy, direction)
        );

        Page<OrderDetailEntity> detailPage = purchasedTicketQueryRepositoryPort.findPurchasedTickets(
                PurchasedTicketSpecification.purchasedByUser(userId, fromDate, toDate, ticketNumber),
                pageable
        );

        Map<String, Optional<LotteryResultModel>> resultCache = new HashMap<>();
        Map<Long, List<LotteryResultDetailModel>> detailCache = new HashMap<>();

        List<PurchasedTicketResponse> responses = detailPage.getContent().stream()
                .filter(detail -> detail.getLotteryTicketSerial() != null
                        && detail.getLotteryTicketSerial().getTicket() != null)
                .map(detail -> mapDetail(detail, resultCache, detailCache))
                .filter(response -> status == null || response.drawResultStatus() == status)
                .toList();

        return PageResponse.from(responses, detailPage.getTotalElements(), page, size);
    }

    private PurchasedTicketResponse mapDetail(
            OrderDetailEntity detail,
            Map<String, Optional<LotteryResultModel>> resultCache,
            Map<Long, List<LotteryResultDetailModel>> detailCache) {

        OrderEntity order = detail.getOrder();
        LotteryTicketSerialEntity serial = detail.getLotteryTicketSerial();
        LotteryTicketEntity ticket = serial.getTicket();
        String stationName = ticket.getStation() != null ? ticket.getStation().getName() : null;

        TicketDrawResultStatus drawResultStatus = TicketDrawResultStatus.PENDING_DRAW;
        String matchedPrizeCode = null;
        String matchedPrizeDisplayName = null;

        if (ticket.getDrawDate() != null
                && !ticket.getDrawDate().isAfter(LocalDate.now())
                && ticket.getStation() != null) {
            Optional<LotteryResultModel> resultOpt = resolveResult(
                    ticket.getStation().getId(),
                    ticket.getDrawDate(),
                    resultCache
            );

            if (resultOpt.isPresent() && resultOpt.get().getStatus() == LotteryResultStatus.COMPLETED) {
                List<LotteryResultDetailModel> resultDetails = detailCache.computeIfAbsent(
                        resultOpt.get().getId(),
                        lotteryResultDetailRepositoryPort::findByLotteryResultId
                );
                Optional<TicketPrizeMatcher.MatchResult> match = TicketPrizeMatcher.findFirstMatch(
                        ticket.getNumbers(),
                        resultDetails
                );
                if (match.isPresent()) {
                    drawResultStatus = TicketDrawResultStatus.WON;
                    matchedPrizeCode = match.get().prizeCode();
                    matchedPrizeDisplayName = match.get().prizeDisplayName();
                } else {
                    drawResultStatus = TicketDrawResultStatus.LOST;
                }
            }
        }

        return PurchasedTicketResponse.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .ticketId(ticket.getId())
                .serialNumber(serial.getSerialNumber())
                .numbers(ticket.getNumbers())
                .stationName(stationName)
                .drawDate(ticket.getDrawDate())
                .price(detail.getPrice())
                .purchasedAt(order.getCreatedAt())
                .drawResultStatus(drawResultStatus)
                .matchedPrizeCode(matchedPrizeCode)
                .matchedPrizeDisplayName(matchedPrizeDisplayName)
                .build();
    }

    private Optional<LotteryResultModel> resolveResult(
            Long stationId,
            LocalDate drawDate,
            Map<String, Optional<LotteryResultModel>> resultCache) {
        String key = stationId + "|" + drawDate;
        return resultCache.computeIfAbsent(
                key,
                ignored -> lotteryResultRepositoryPort.findByStationIdAndDrawDate(stationId, drawDate)
        );
    }
}
