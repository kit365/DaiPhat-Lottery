package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.PurchasedTicketResponse;
import com.daiphat.coreapi.application.port.in.order.PurchasedTicketQueryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultDetailRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureRepositoryPort;
import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryResultRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.PurchasedTicketQueryRepositoryPort;
import com.daiphat.coreapi.application.service.payout.PrizePayoutEligibilityService;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SerialPayoutState;
import com.daiphat.coreapi.domain.model.enums.order.TicketDrawResultStatus;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutChannel;
import com.daiphat.coreapi.domain.model.enums.payout.PrizeRedemptionZone;
import com.daiphat.coreapi.domain.model.lotteries.LotteryResultDetailModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import com.daiphat.coreapi.domain.model.payout.PrizePayoutRequestModel;
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

import java.math.BigDecimal;
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
    private final PrizeStructureRepositoryPort prizeStructureRepositoryPort;
    private final PrizePayoutRequestRepositoryPort prizePayoutRequestRepositoryPort;
    private final PrizePayoutEligibilityService prizePayoutEligibilityService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PurchasedTicketResponse> getMyTickets(
            UUID userId,
            int page,
            int size,
            TicketDrawResultStatus status,
            Boolean redeemed,
            LocalDate fromDate,
            LocalDate toDate,
            String ticketNumber,
            String sortBy,
            String direction) {

        var spec = PurchasedTicketSpecification.purchasedByUser(userId, fromDate, toDate, ticketNumber);
        var sort = SortUtils.createSort(sortBy, direction);
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, size);

        // Draw result (WON/LOST/PENDING) and redemption state are computed in-memory,
        // so these filters must paginate after mapping — not at the DB page boundary.
        if (status != null || redeemed != null) {
            Page<OrderDetailEntity> allDetails = purchasedTicketQueryRepositoryPort.findPurchasedTickets(
                    spec,
                    PageRequest.of(0, Integer.MAX_VALUE, sort)
            );
            List<PurchasedTicketResponse> filtered = mapDetails(allDetails.getContent()).stream()
                    .filter(response -> status == null || response.drawResultStatus() == status)
                    .filter(response -> matchesRedeemedFilter(response, redeemed))
                    .toList();
            int fromIndex = Math.min((safePage - 1) * safeSize, filtered.size());
            int toIndex = Math.min(fromIndex + safeSize, filtered.size());
            return PageResponse.from(filtered.subList(fromIndex, toIndex), filtered.size(), safePage, safeSize);
        }

        Page<OrderDetailEntity> detailPage = purchasedTicketQueryRepositoryPort.findPurchasedTickets(
                spec,
                PageRequest.of(safePage - 1, safeSize, sort)
        );
        List<PurchasedTicketResponse> responses = mapDetails(detailPage.getContent());
        return PageResponse.from(responses, detailPage.getTotalElements(), safePage, safeSize);
    }

    private static boolean matchesRedeemedFilter(PurchasedTicketResponse response, Boolean redeemed) {
        if (redeemed == null) {
            return true;
        }
        // Redemption filter only applies to winning tickets.
        if (response.drawResultStatus() != TicketDrawResultStatus.WON) {
            return false;
        }
        boolean isRedeemed = response.payoutState() == SerialPayoutState.PAID_OUT
                || response.activePayoutStatus()
                == com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus.COMPLETED;
        return redeemed == isRedeemed;
    }

    private List<PurchasedTicketResponse> mapDetails(List<OrderDetailEntity> details) {
        Map<String, Optional<LotteryResultModel>> resultCache = new HashMap<>();
        Map<Long, List<LotteryResultDetailModel>> detailCache = new HashMap<>();
        List<Long> serialIds = details.stream()
                .map(OrderDetailEntity::getLotteryTicketSerial)
                .filter(serial -> serial != null)
                .map(LotteryTicketSerialEntity::getId)
                .toList();
        Map<Long, PrizePayoutRequestModel> latestPayouts =
                prizePayoutRequestRepositoryPort.findLatestBySerialIds(serialIds);
        if (latestPayouts == null) {
            latestPayouts = Map.of();
        }
        final Map<Long, PrizePayoutRequestModel> payoutBySerial = latestPayouts;

        return details.stream()
                .filter(detail -> detail.getLotteryTicketSerial() != null
                        && detail.getLotteryTicketSerial().getTicket() != null)
                .map(detail -> mapDetail(detail, resultCache, detailCache, payoutBySerial))
                .toList();
    }

    private PurchasedTicketResponse mapDetail(
            OrderDetailEntity detail,
            Map<String, Optional<LotteryResultModel>> resultCache,
            Map<Long, List<LotteryResultDetailModel>> detailCache,
            Map<Long, PrizePayoutRequestModel> latestPayouts) {

        OrderEntity order = detail.getOrder();
        LotteryTicketSerialEntity serial = detail.getLotteryTicketSerial();
        LotteryTicketEntity ticket = serial.getTicket();
        String stationName = ticket.getStation() != null ? ticket.getStation().getName() : null;

        TicketDrawResultStatus drawResultStatus = TicketDrawResultStatus.PENDING_DRAW;
        String matchedPrizeCode = null;
        String matchedPrizeDisplayName = null;
        BigDecimal prizeAmount = null;

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
                    prizeAmount = resolvePrizeAmount(match.get().prizeStructureId());
                } else {
                    drawResultStatus = TicketDrawResultStatus.LOST;
                }
            }
        }

        SerialPayoutState payoutState = serial.getPayoutState() != null
                ? serial.getPayoutState()
                : SerialPayoutState.NONE;
        PrizePayoutRequestModel latestRequest = latestPayouts.get(serial.getId());

        PrizePayoutChannel claimChannel = null;
        boolean canClaimOnline = false;
        boolean requiresStationOfficeRedemption = "DB".equalsIgnoreCase(matchedPrizeCode);
        LocalDate customerRedemptionDeadline = null;
        LocalDate issuerRedemptionDeadline = null;
        PrizeRedemptionZone redemptionZone = null;
        Integer daysRemainingToIssuer = null;
        if (drawResultStatus == TicketDrawResultStatus.WON && prizeAmount != null) {
            claimChannel = prizePayoutEligibilityService.resolveClaimChannel(detail, serial, prizeAmount);
            boolean onlineLocked = prizePayoutEligibilityService.isOnlineClaimLocked(serial.getId());
            if (onlineLocked) {
                claimChannel = PrizePayoutChannel.IN_PERSON;
            }
            try {
                var deadlines = prizePayoutEligibilityService.resolveRedemptionDeadlines(detail, serial);
                customerRedemptionDeadline = deadlines.customerDeadlineDate();
                issuerRedemptionDeadline = deadlines.issuerDeadlineDate();
                redemptionZone = deadlines.zone();
                daysRemainingToIssuer = deadlines.daysRemainingToIssuer();
            } catch (DomainException ignored) {
                // Still return the ticket row without deadline metadata.
            }
            boolean withinCustomerWindow = redemptionZone == null
                    || redemptionZone == PrizeRedemptionZone.WITHIN_CUSTOMER;
            canClaimOnline = claimChannel == PrizePayoutChannel.ONLINE
                    && !onlineLocked
                    && !requiresStationOfficeRedemption
                    && withinCustomerWindow
                    && (payoutState == SerialPayoutState.NONE)
                    && (latestRequest == null
                    || (latestRequest.getStatus() != com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus.PENDING
                    && latestRequest.getStatus() != com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus.COMPLETED));
        }

        return PurchasedTicketResponse.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .orderDetailId(detail.getId())
                .ticketId(ticket.getId())
                .serialId(serial.getId())
                .serialNumber(serial.getSerialNumber())
                .serialStatus(serial.getStatus())
                .orderDetailStatus(detail.getStatus())
                .payoutState(payoutState)
                .numbers(ticket.getNumbers())
                .stationName(stationName)
                .drawDate(ticket.getDrawDate())
                .price(detail.getPrice())
                .purchasedAt(order.getCreatedAt())
                .drawResultStatus(drawResultStatus)
                .matchedPrizeCode(matchedPrizeCode)
                .matchedPrizeDisplayName(matchedPrizeDisplayName)
                .prizeAmount(prizeAmount)
                .activePayoutRequestId(latestRequest != null ? latestRequest.getId() : null)
                .activePayoutStatus(latestRequest != null ? latestRequest.getStatus() : null)
                .orderType(order.getOrderType())
                .receiveType(order.getReceiveType())
                // Prefer line handover time so mixed orders do not mark rejected lines as picked up.
                .actualPickedUpAt(detail.getHandedOverAt())
                .handedOverAt(detail.getHandedOverAt())
                .rejectedAt(detail.getRejectedAt())
                .claimChannel(claimChannel)
                .canClaimOnline(canClaimOnline)
                .requiresStationOfficeRedemption(requiresStationOfficeRedemption)
                .customerRedemptionDeadline(customerRedemptionDeadline)
                .issuerRedemptionDeadline(issuerRedemptionDeadline)
                .redemptionZone(redemptionZone)
                .daysRemainingToIssuer(daysRemainingToIssuer)
                .build();
    }

    private BigDecimal resolvePrizeAmount(Long prizeStructureId) {
        if (prizeStructureId == null) {
            return null;
        }
        return prizeStructureRepositoryPort.findById(prizeStructureId)
                .map(PrizeStructureModel::getPrizeValue)
                .orElse(null);
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
