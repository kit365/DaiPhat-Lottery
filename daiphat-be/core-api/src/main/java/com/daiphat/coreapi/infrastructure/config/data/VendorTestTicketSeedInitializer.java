package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotterySupplierType;
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
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchLineRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotterySupplierRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.DayOfWeek;
import java.util.Comparator;
import java.util.List;

/**
 * Local-only fixture for manually testing vendor allocation.
 *
 * It runs after {@link SouthernLotteryStationSeedInitializer}, so the station
 * catalog exists before tickets are created. It never creates a station. The
 * fixture deliberately uses existing ACTIVE stations without requiring a
 * schedule match, so local test data is available even when the station seed
 * has not recalculated nextDrawDate yet.
 */
@Component
@Order(100)
@ConditionalOnProperty(
        value = "daiphat.vendor.test-seed.enabled",
        havingValue = "true"
)
@Slf4j
public class VendorTestTicketSeedInitializer implements ApplicationRunner {

    private static final String SUPPLIER_CODE = "LOCAL-VENDOR-TEST";
    private static final String SEED_MARKER = "VENDOR_TEST_SEED";
    private static final String BATCH_PREFIX = "LOCAL-VENDOR-";
    private static final int STATION_LIMIT = 2;
    private static final int TICKETS_PER_STATION = 100;
    private static final BigDecimal FACE_VALUE = BigDecimal.valueOf(10_000);

    private final LotteryStationRepository stationRepository;
    private final LotterySupplierRepository supplierRepository;
    private final ImportBatchRepository importBatchRepository;
    private final ImportBatchLineRepository importBatchLineRepository;
    private final LotteryTicketRepository ticketRepository;
    private final LotteryTicketSerialRepository serialRepository;
    private final UserRepository userRepository;
    private final TransactionTemplate transaction;

    public VendorTestTicketSeedInitializer(
            LotteryStationRepository stationRepository,
            LotterySupplierRepository supplierRepository,
            ImportBatchRepository importBatchRepository,
            ImportBatchLineRepository importBatchLineRepository,
            LotteryTicketRepository ticketRepository,
            LotteryTicketSerialRepository serialRepository,
            UserRepository userRepository,
            PlatformTransactionManager transactionManager
    ) {
        this.stationRepository = stationRepository;
        this.supplierRepository = supplierRepository;
        this.importBatchRepository = importBatchRepository;
        this.importBatchLineRepository = importBatchLineRepository;
        this.ticketRepository = ticketRepository;
        this.serialRepository = serialRepository;
        this.userRepository = userRepository;
        this.transaction = new TransactionTemplate(transactionManager);
    }

    @Override
    public void run(ApplicationArguments args) {
        LocalDate today = LocalDate.now();
        transaction.executeWithoutResult(status -> {
            seed(today);
            seed(today.plusDays(1));
        });
    }

    private void seed(LocalDate drawDate) {
        UserEntity actor = userRepository.findAll().stream().findFirst().orElse(null);
        if (actor == null) {
            log.warn("Skip vendor test ticket seed: no user exists yet.");
            return;
        }

        List<LotteryStationEntity> activeStations = stationRepository.findAll().stream()
                .filter(station -> station.getDeletedAt() == null)
                .filter(station -> station.isActive())
                .sorted(Comparator.comparing(LotteryStationEntity::getId))
                .toList();

        // Vendor allocation itself is date-aware. Prefer stations that actually
        // draw on the seeded date so the fixture appears in the vendor candidate
        // screen; fall back to active stations only when a local catalog has no
        // schedule yet.
        DayOfWeek drawDay = drawDate.getDayOfWeek();
        List<LotteryStationEntity> stations = activeStations.stream()
                .filter(station -> station.getDrawDays() != null && station.getDrawDays().contains(drawDay))
                .limit(STATION_LIMIT)
                .toList();
        if (stations.isEmpty()) {
            stations = activeStations.stream().limit(STATION_LIMIT).toList();
        }

        if (stations.isEmpty()) {
            log.warn("Skip vendor test ticket seed: no active station exists.");
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        LotterySupplierEntity supplier = supplierRepository
                .findByCodeIgnoreCaseAndDeletedAtIsNull(SUPPLIER_CODE)
                .orElseGet(() -> supplierRepository.save(LotterySupplierEntity.builder()
                        .name("Nhà cung cấp test vendor local")
                        .code(SUPPLIER_CODE)
                        .type(LotterySupplierType.DISTRIBUTOR)
                        .contactName("Local Vendor Test")
                        .contactPhone("0900000000")
                        .address("LOCAL")
                        .paymentTermDays(0)
                        .defaultImportCost(FACE_VALUE)
                        .importAllowFrom(LocalTime.of(8, 0))
                        .returnCutOffTime(LocalTime.of(14, 30))
                        .isActive(true)
                        .createdBy(SEED_MARKER)
                        .lastModifiedBy(SEED_MARKER)
                        .build()));

        String batchCode = BATCH_PREFIX + drawDate.toString().replace("-", "");
        ImportBatchEntity batch = importBatchRepository
                .findByBatchCodeAndDeletedAtIsNull(batchCode)
                .orElseGet(() -> importBatchRepository.save(ImportBatchEntity.builder()
                        .batchCode(batchCode)
                        .drawDate(drawDate)
                        .supplier(supplier)
                        .importMode(ImportBatchImportMode.IN_DAY)
                        .importedBy(actor)
                        .importedAt(now)
                        .status(ImportBatchStatus.IMPORTED)
                        .completedAt(now)
                        .note("Local fixture for vendor allocation.")
                        .createdBy(SEED_MARKER)
                        .lastModifiedBy(SEED_MARKER)
                        .build()));

        int createdSerials = 0;
        int stationOrder = 0;
        for (LotteryStationEntity station : stations) {
            stationOrder++;
            String lineCode = batchCode + "-" + station.getId();
            ImportBatchLineEntity line = importBatchLineRepository
                    .findByBatchCodeAndDeletedAtIsNull(lineCode)
                    .orElseGet(() -> importBatchLineRepository.save(ImportBatchLineEntity.builder()
                            .importBatch(batch)
                            .lotteryStation(station)
                            .batchType(ImportBatchType.NEW)
                            .batchCode(lineCode)
                            .declareQuantity(TICKETS_PER_STATION)
                            .declaredCostValue(FACE_VALUE.multiply(BigDecimal.valueOf(TICKETS_PER_STATION)))
                            .totalQuantity(0)
                            .importCost(FACE_VALUE)
                            .totalCostValue(BigDecimal.ZERO)
                            .status(ImportBatchLineStatus.IMPORTED)
                            .importedAt(now)
                            .createdBy(SEED_MARKER)
                            .lastModifiedBy(SEED_MARKER)
                            .build()));

            int stationCreated = 0;
            for (int ticketIndex = 1; ticketIndex <= TICKETS_PER_STATION; ticketIndex++) {
                String numbers = resolveTicketNumber(station.getId(), drawDate, stationOrder, ticketIndex);
                LotteryTicketEntity ticket = ticketRepository
                        .findByStation_IdAndNumbersAndDrawDateAndDeletedAtIsNull(
                                station.getId(), numbers, drawDate
                        )
                        .orElseGet(() -> ticketRepository.save(LotteryTicketEntity.builder()
                                .station(station)
                                .numbers(numbers)
                                .drawDate(drawDate)
                                .batchCode(lineCode)
                                .priceSnapshot(FACE_VALUE)
                                .status(LotteryTicketStatus.IN_STOCK)
                                .active(true)
                                .createdBy(SEED_MARKER)
                                .lastModifiedBy(SEED_MARKER)
                                .build()));

                String serialNumber = "VENDOR-TEST-" + station.getId() + "-" + numbers;
                boolean serialExists = serialRepository.findByTicket_IdAndDeletedAtIsNull(ticket.getId()).stream()
                        .anyMatch(serial -> serialNumber.equals(serial.getSerialNumber()));
                if (serialExists) {
                    continue;
                }

                serialRepository.save(LotteryTicketSerialEntity.builder()
                        .ticket(ticket)
                        .importBatch(batch)
                        .importBatchLine(line)
                        .serialNumber(serialNumber)
                        .stationId(station.getId())
                        .drawDate(drawDate)
                        .status(LotteryTicketSerialStatus.IN_STOCK)
                        .ticketCondition(TicketCondition.GOOD)
                        .inputSource(InputSource.MANUAL)
                        .importedBy(actor)
                        .importedAt(now)
                        .verified(true)
                        .createdBy(SEED_MARKER)
                        .lastModifiedBy(SEED_MARKER)
                        .build());
                createdSerials++;
                stationCreated++;
            }

            line.setTotalQuantity(TICKETS_PER_STATION);
            line.setTotalCostValue(FACE_VALUE.multiply(BigDecimal.valueOf(TICKETS_PER_STATION)));
            line.setStatus(ImportBatchLineStatus.IMPORTED);
            line.setImportedAt(now);
            importBatchLineRepository.save(line);

            station.setInventoryCount((station.getInventoryCount() == null ? 0 : station.getInventoryCount()) + stationCreated);
            stationRepository.save(station);
        }

        batch.setLineCount(stations.size());
        batch.setTotalDeclareQuantity(stations.size() * TICKETS_PER_STATION);
        batch.setTotalDeclaredCostValue(FACE_VALUE.multiply(BigDecimal.valueOf(batch.getTotalDeclareQuantity())));
        batch.setTotalImportedQuantity(stations.size() * TICKETS_PER_STATION);
        batch.setTotalImportedCostValue(FACE_VALUE.multiply(BigDecimal.valueOf(batch.getTotalImportedQuantity())));
        batch.setStatus(ImportBatchStatus.IMPORTED);
        batch.setCompletedAt(now);
        importBatchRepository.save(batch);

        log.info("Vendor test ticket seed finished: {} serials across {} existing stations for {}.",
                createdSerials, stations.size(), drawDate);
    }

    private String resolveTicketNumber(Long stationId, LocalDate drawDate, int stationOrder, int ticketIndex) {
        int candidate = 700_000 + stationOrder * 1000 + ticketIndex;
        for (int offset = 0; offset < 100_000; offset++) {
            String numbers = String.format("%06d", (candidate + offset) % 1_000_000);
            if (!ticketRepository.existsByStation_IdAndNumbersAndDrawDateAndDeletedAtIsNull(
                    stationId, numbers, drawDate
            )) {
                return numbers;
            }
        }
        throw new IllegalStateException("Unable to allocate a local vendor test ticket number.");
    }

}
