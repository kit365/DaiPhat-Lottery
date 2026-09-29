package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.shared.time.VietnamClock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;

/**
 * Single source of truth for customer ticket sales and order-preparation cutoffs.
 * Supplier return cutoff wins; legacy serials without a supplier fall back to the
 * lottery station draw time.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TicketSalesCutoffPolicy {

    private final LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    private final ImportBatchRepositoryPort importBatchRepositoryPort;
    private final LotterySupplierRepositoryPort lotterySupplierRepositoryPort;
    private final LotteryStationServicePort lotteryStationServicePort;
    private final VietnamClock vietnamClock;

    public Optional<LocalDateTime> resolveCutoffAt(Long serialId) {
        if (serialId == null) {
            return Optional.empty();
        }
        return lotteryTicketSerialRepositoryPort.findById(serialId).flatMap(this::resolveCutoffAt);
    }

    public Optional<LocalDateTime> resolveCutoffAt(LotteryTicketSerialModel serial) {
        if (serial == null || serial.getDrawDate() == null) {
            return Optional.empty();
        }

        LocalTime supplierCutoff = resolveSupplierCutoff(serial).orElse(null);
        if (supplierCutoff != null) {
            return Optional.of(LocalDateTime.of(serial.getDrawDate(), supplierCutoff));
        }

        LocalTime stationDrawTime = serial.getStationId() == null
                ? null
                : lotteryStationServicePort.findModelById(serial.getStationId())
                        .map(station -> station.getDrawTime())
                        .orElse(null);
        if (stationDrawTime == null) {
            log.warn("Cannot resolve sales cutoff for legacy ticket serial {}", serial.getId());
            return Optional.empty();
        }
        return Optional.of(LocalDateTime.of(serial.getDrawDate(), stationDrawTime));
    }

    public boolean isClosed(LotteryTicketSerialModel serial) {
        return isClosed(serial, vietnamClock.now());
    }

    public boolean isClosed(LotteryTicketSerialModel serial, LocalDateTime now) {
        return resolveCutoffAt(serial)
                .map(cutoff -> !now.isBefore(cutoff))
                .orElse(true);
    }

    public Optional<LocalDateTime> resolveEarliestCutoff(OrderModel order) {
        if (order == null || order.getOrderDetails() == null) {
            return Optional.empty();
        }
        return order.getOrderDetails().stream()
                .flatMap(detail -> effectiveSerialIds(detail).stream())
                .map(this::resolveCutoffAt)
                .flatMap(Optional::stream)
                .min(LocalDateTime::compareTo);
    }

    private Optional<LocalTime> resolveSupplierCutoff(LotteryTicketSerialModel serial) {
        if (serial.getImportBatchId() == null) {
            return Optional.empty();
        }
        return importBatchRepositoryPort.findById(serial.getImportBatchId())
                .map(ImportBatchModel::getSupplierId)
                .flatMap(lotterySupplierRepositoryPort::findById)
                .map(supplier -> supplier.getReturnCutOffTime());
    }

    private Set<Long> effectiveSerialIds(OrderDetailModel detail) {
        Set<Long> ids = new LinkedHashSet<>();
        if (detail.getReplacedByTicketSerialId() != null) {
            ids.add(detail.getReplacedByTicketSerialId());
            return ids;
        }
        if (detail.getAllocatedSerialIds() != null) {
            ids.addAll(detail.getAllocatedSerialIds());
        }
        if (ids.isEmpty() && detail.getLotteryTicketSerialId() != null) {
            ids.add(detail.getLotteryTicketSerialId());
        }
        return ids;
    }
}
