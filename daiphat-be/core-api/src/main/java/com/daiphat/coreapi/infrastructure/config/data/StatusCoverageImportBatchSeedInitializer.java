package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotterySupplierEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotterySupplierRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Seeds one NEW import batch (lô nhập mới) with a single station line for the
 * sellable draw date: today before giờ sổ, otherwise the next scheduled draw day.
 * Creates four lottery tickets covering every {@link LotteryTicketStatus}, each with
 * 20 serials spanning every {@link LotteryTicketSerialStatus} (two per status).
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "daiphat.lottery.seed.status-coverage.enabled", havingValue = "true")
@Order(112)
public class StatusCoverageImportBatchSeedInitializer implements ApplicationRunner {

    private static final String SYSTEM_ACTOR = "status-coverage-seed";
    private static final String SUPPLIER_CODE = "MINH_CHINH";
    private static final String HEADER_CODE_PREFIX = "PN-STATUS-";
    private static final String LINE_CODE_PREFIX = "LO-STATUS-";
    private static final String SERIAL_PREFIX = "IBSTATUS-";
    private static final BigDecimal DEFAULT_IMPORT_COST = BigDecimal.valueOf(10_000);
    private static final DateTimeFormatter BASIC_DATE = DateTimeFormatter.BASIC_ISO_DATE;
    private static final int SERIALS_PER_TICKET = 20;
    private static final LocalTime DEFAULT_DRAW_TIME = LocalTime.of(16, 15);

    private static final List<LotteryTicketSerialStatus> ALL_SERIAL_STATUSES = List.of(
            LotteryTicketSerialStatus.IN_STOCK,
            LotteryTicketSerialStatus.RESERVED,
            LotteryTicketSerialStatus.SOLD,
            LotteryTicketSerialStatus.WITH_STREET_AGENT,
            LotteryTicketSerialStatus.EXPIRED
    );

    /** Per-status serial count on each ticket (sum must equal {@link #SERIALS_PER_TICKET}). */
    private static final int[] SERIAL_COUNTS_BY_STATUS = {
            4, 4, 6, 2, 4
    };

    private final LotterySupplierRepository lotterySupplierRepository;
    private final LotteryStationRepository lotteryStationRepository;
    private final ImportBatchRepository importBatchRepository;
    private final LotteryTicketRepository lotteryTicketRepository;
    private final LotteryTicketSerialRepository lotteryTicketSerialRepository;
    private final LotterySerialSeedCleanup lotterySerialSeedCleanup;
    private final OrderRepository orderRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        UserEntity operator = findSeedOperator();
        if (operator == null) {
            log.warn("Skip status-coverage import-batch seed: no staff operator account found.");
            return;
        }

        LotteryStationEntity station = findFirstActiveStation();
        if (station == null) {
            log.warn("Skip status-coverage import-batch seed: no active lottery station found.");
            return;
        }

        LocalDateTime now = LocalDateTime.now(clock);
        LocalDate drawDate = resolveSellableDrawDate(station, now);

        resetPreviousSeedData();

        LotterySupplierEntity supplier = lotterySupplierRepository
                .findByCodeIgnoreCaseAndDeletedAtIsNull(SUPPLIER_CODE)
                .orElse(null);
        if (supplier == null) {
            log.warn("Skip status-coverage import-batch seed: supplier {} not found (run main lottery seed first).", SUPPLIER_CODE);
            return;
        }

        String dateToken = drawDate.format(BASIC_DATE);
        String stationCode = ImportBatchCodeHelper.toStationCode(station.getName());
        String headerCode = HEADER_CODE_PREFIX + dateToken + "-NEW";
        String lineCode = LINE_CODE_PREFIX + dateToken + "-" + stationCode + "-NEW";

        ImportBatchEntity batch = ImportBatchEntity.builder()
                        .batchCode(headerCode)
                        .drawDate(drawDate)
                        .supplier(supplier)
                        .importMode(ImportBatchImportMode.IN_DAY)
                        .invoiceEvidenceUrl("https://picsum.photos/seed/" + headerCode + "-invoice/800/500")
                        .ticketListImageUrls(new ArrayList<>(List.of(
                                "https://picsum.photos/seed/" + headerCode + "-list-1/800/500"
                        )))
                        .importedBy(operator)
                        .importedAt(now.minusHours(1))
                        .status(ImportBatchStatus.RECEIVING)
                        .lineCount(1)
                        .totalDeclareQuantity(4 * SERIALS_PER_TICKET)
                        .totalDeclaredCostValue(
                                DEFAULT_IMPORT_COST.multiply(BigDecimal.valueOf(4 * SERIALS_PER_TICKET))
                        )
                        .totalImportedQuantity(0)
                        .totalImportedCostValue(BigDecimal.ZERO)
                        .submittedAt(now.minusHours(1))
                        .completedAt(null)
                        .note("Status-coverage NEW import batch for draw " + drawDate)
                        .createdAt(now)
                        .updatedAt(now)
                        .createdBy(SYSTEM_ACTOR)
                        .lastModifiedBy(SYSTEM_ACTOR)
                        .build();

        ImportBatchLineEntity line = ImportBatchLineEntity.builder()
                .importBatch(batch)
                .lotteryStation(station)
                .batchType(ImportBatchType.NEW)
                .batchCode(lineCode)
                .declareQuantity(4 * SERIALS_PER_TICKET)
                .declaredCostValue(
                        DEFAULT_IMPORT_COST.multiply(BigDecimal.valueOf(4 * SERIALS_PER_TICKET))
                )
                .totalQuantity(0)
                .importCost(DEFAULT_IMPORT_COST)
                .totalCostValue(BigDecimal.ZERO)
                .status(ImportBatchLineStatus.OPEN)
                .importedAt(null)
                .createdAt(now)
                .updatedAt(now)
                .createdBy(SYSTEM_ACTOR)
                .lastModifiedBy(SYSTEM_ACTOR)
                .build();

        List<ImportBatchLineEntity> lines = new ArrayList<>();
        lines.add(line);
        batch.setLines(lines);
        batch = importBatchRepository.save(batch);
        line = batch.getLines().getFirst();

        BigDecimal price = station.getPrice() != null ? station.getPrice() : DEFAULT_IMPORT_COST;
        int createdSerials = 0;

        for (int ticketIndex = 0; ticketIndex < 4; ticketIndex++) {
            String numbers = String.format("%06d", 910_000 + ticketIndex + 1);
            String ticketSeedKey = SERIAL_PREFIX + dateToken + "-" + station.getId() + "-T" + (ticketIndex + 1);

            LotteryTicketEntity ticket = lotteryTicketRepository.save(
                    LotteryTicketEntity.builder()
                            .station(station)
                            .ticketImg("https://picsum.photos/seed/" + ticketSeedKey + "/800/500")
                            .numbers(numbers)
                            .drawDate(drawDate)
                            .batchCode(lineCode)
                            .priceSnapshot(price)
                            .status(LotteryTicketStatus.IN_STOCK)
                            .active(true)
                            .createdAt(now.minusMinutes(40))
                            .updatedAt(now)
                            .createdBy(SYSTEM_ACTOR)
                            .lastModifiedBy(SYSTEM_ACTOR)
                            .build()
            );

            List<LotteryTicketSerialStatus> serialStatuses = buildSerialStatusSpread();
            for (int serialIndex = 0; serialIndex < serialStatuses.size(); serialIndex++) {
                LotteryTicketSerialStatus serialStatus = serialStatuses.get(serialIndex);
                String serialNumber = ticketSeedKey + "-" + String.format("%02d", serialIndex + 1);
                saveSeedSerial(ticket, line, operator, serialNumber, serialStatus, now, serialIndex);
                createdSerials++;
            }

            List<LotteryTicketSerialEntity> ticketSerials =
                    lotteryTicketSerialRepository.findByTicket_IdAndDeletedAtIsNull(ticket.getId());
            StatusCoverageTicketStatusHelper.syncTicketStatusFromSerials(
                    ticket,
                    station,
                    ticketSerials,
                    now,
                    SYSTEM_ACTOR,
                    lotteryTicketRepository
            );
        }

        line.setTotalQuantity(createdSerials);
        line.setTotalCostValue(line.getImportCost().multiply(BigDecimal.valueOf(createdSerials)));
        batch.setTotalImportedQuantity(createdSerials);
        batch.setTotalImportedCostValue(line.getTotalCostValue());
        ImportBatchSeedStatusHelper.applyLineStatus(line, now);
        ImportBatchSeedStatusHelper.applyHeaderStatus(batch, batch.getLines(), now);
        importBatchRepository.save(batch);

        lotteryTicketRepository.flush();
        log.info(
                "Status-coverage import-batch seed complete: batch={}, line={}, station={}, drawDate={}, tickets={}, serialsPerTicket={}.",
                headerCode,
                lineCode,
                station.getName(),
                drawDate,
                4,
                SERIALS_PER_TICKET
        );
    }

    /**
     * Spread serial statuses across {@link #SERIALS_PER_TICKET} rows.
     * Transaction statuses: RESERVED 4 + SOLD 6 (3 sold orders + 3 company-hold orders).
     */
    private List<LotteryTicketSerialStatus> buildSerialStatusSpread() {
        List<LotteryTicketSerialStatus> specs = new ArrayList<>(SERIALS_PER_TICKET);
        for (int i = 0; i < ALL_SERIAL_STATUSES.size(); i++) {
            LotteryTicketSerialStatus status = ALL_SERIAL_STATUSES.get(i);
            int count = SERIAL_COUNTS_BY_STATUS[i];
            for (int copy = 0; copy < count; copy++) {
                specs.add(status);
            }
        }
        return specs;
    }

    private void saveSeedSerial(
            LotteryTicketEntity ticket,
            ImportBatchLineEntity line,
            UserEntity operator,
            String serialNumber,
            LotteryTicketSerialStatus serialStatus,
            LocalDateTime now,
            int serialIndex
    ) {
        var builder = LotteryTicketSerialEntity.builder()
                .ticket(ticket)
                .stationId(ticket.getStation().getId())
                .drawDate(ticket.getDrawDate())
                .importBatch(line.getImportBatch())
                .importBatchLine(line)
                .ticketImg(ticket.getTicketImg())
                .serialNumber(serialNumber)
                .status(serialStatus)
                .ticketCondition(TicketCondition.GOOD)
                .inputSource(InputSource.MANUAL)
                .importedBy(operator)
                .importedAt(now.minusMinutes(35))
                .verified(true)
                .verifiedBy(operator)
                .verifiedAt(now.minusMinutes(30))
                .createdAt(now.minusMinutes(35))
                .updatedAt(now)
                .createdBy(SYSTEM_ACTOR)
                .lastModifiedBy(SYSTEM_ACTOR);

        if (serialStatus == LotteryTicketSerialStatus.RESERVED) {
            // reservedByOrderId is set by StatusCoverageOrderSeedInitializer when orders are linked.
            builder.reservedAt(now.minusMinutes(10));
            builder.reservationExpiresAt(now.plusMinutes(20));
        }

        lotteryTicketSerialRepository.save(builder.build());
    }

    /**
     * Sellable draw date: if today is a draw day and current time is after giờ sổ,
     * use the next scheduled draw day; otherwise use today (when it is a draw day)
     * or the nearest upcoming draw day.
     */
    private LocalDate resolveSellableDrawDate(LotteryStationEntity station, LocalDateTime now) {
        LocalDate today = now.toLocalDate();
        LocalTime drawTime = station.getDrawTime() != null ? station.getDrawTime() : DEFAULT_DRAW_TIME;

        if (isDrawDay(station, today)) {
            if (now.toLocalTime().isAfter(drawTime)) {
                return findNextDrawDate(station, today.plusDays(1));
            }
            return today;
        }
        return findNextDrawDate(station, today);
    }

    private LocalDate findNextDrawDate(LotteryStationEntity station, LocalDate fromInclusive) {
        for (int offset = 0; offset < 14; offset++) {
            LocalDate candidate = fromInclusive.plusDays(offset);
            if (isDrawDay(station, candidate)) {
                return candidate;
            }
        }
        return fromInclusive;
    }

    private boolean isDrawDay(LotteryStationEntity station, LocalDate date) {
        List<DayOfWeek> drawDays = station.getDrawDays();
        return drawDays != null && drawDays.contains(date.getDayOfWeek());
    }

    private LotteryStationEntity findFirstActiveStation() {
        return lotteryStationRepository.findAll().stream()
                .filter(station -> station.getDeletedAt() == null)
                .filter(LotteryStationEntity::isActive)
                .filter(station -> station.getDrawDays() != null && !station.getDrawDays().isEmpty())
                .sorted((a, b) -> String.CASE_INSENSITIVE_ORDER.compare(
                        a.getName() != null ? a.getName() : "",
                        b.getName() != null ? b.getName() : ""
                ))
                .findFirst()
                .orElse(null);
    }

    private void resetPreviousSeedData() {
        // Orders (order 113) are created after this seeder, so reset must drop them first
        // or FK fk_order_details_ticket blocks serial deletion on restart.
        StatusCoverageSeedCleanup.resetOrders(transactionRepository, orderRepository);

        List<LotteryTicketSerialEntity> seedSerials =
                lotteryTicketSerialRepository.findBySerialNumberStartingWith(SERIAL_PREFIX);
        Set<Long> ticketIds = new HashSet<>();
        if (!seedSerials.isEmpty()) {
            List<Long> seedSerialIds = seedSerials.stream().map(LotteryTicketSerialEntity::getId).toList();
            lotterySerialSeedCleanup.clearDependentsBeforeSerialDelete(seedSerialIds);
            for (LotteryTicketSerialEntity serial : seedSerials) {
                if (serial.getTicket() != null && serial.getTicket().getId() != null) {
                    ticketIds.add(serial.getTicket().getId());
                }
                lotteryTicketSerialRepository.delete(serial);
            }
            lotteryTicketSerialRepository.flush();
        }

        for (Long ticketId : ticketIds) {
            if (lotteryTicketSerialRepository.findByTicket_IdAndDeletedAtIsNull(ticketId).isEmpty()) {
                lotteryTicketRepository.deleteById(ticketId);
            }
        }
        lotteryTicketRepository.flush();

        List<ImportBatchEntity> seedBatches =
                importBatchRepository.findByBatchCodeStartingWithAndDeletedAtIsNull(HEADER_CODE_PREFIX);
        if (!seedBatches.isEmpty()) {
            importBatchRepository.deleteAll(seedBatches);
            importBatchRepository.flush();
        }

        if (!seedSerials.isEmpty() || !seedBatches.isEmpty()) {
            log.info(
                    "Removed previous status-coverage seed data: serials={}, batches={}.",
                    seedSerials.size(),
                    seedBatches.size()
            );
        }
    }

    private UserEntity findSeedOperator() {
        List<UserEntity> operators = userRepository.findAllByRole_CodeIn(List.of(RoleConstants.ROLE_STAFF_OPERATOR));
        if (!operators.isEmpty()) {
            return operators.getFirst();
        }
        List<UserEntity> admins = userRepository.findAllByRole_CodeIn(List.of(RoleConstants.ADMIN));
        return admins.isEmpty() ? null : admins.getFirst();
    }

    private static final class ImportBatchCodeHelper {
        private ImportBatchCodeHelper() {
        }

        static String toStationCode(String stationName) {
            if (stationName == null || stationName.isBlank()) {
                return "STATION";
            }
            String normalized = java.text.Normalizer.normalize(stationName.trim(), java.text.Normalizer.Form.NFD)
                    .replaceAll("\\p{M}+", "")
                    .replace('đ', 'd')
                    .replace('Đ', 'D')
                    .replaceAll("[^A-Za-z0-9]+", "")
                    .toUpperCase(java.util.Locale.ROOT);
            if (normalized.isBlank()) {
                return "STATION";
            }
            return normalized.length() > 16 ? normalized.substring(0, 16) : normalized;
        }
    }
}
