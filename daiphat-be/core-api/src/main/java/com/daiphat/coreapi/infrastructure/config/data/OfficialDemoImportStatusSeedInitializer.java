package com.daiphat.coreapi.infrastructure.config.data;

import org.springframework.beans.factory.annotation.Value;
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
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.ImportBatchRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotterySupplierRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Adds only import lifecycle states that can survive at the current draw date. */
@Component
@Order(101)
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "daiphat.official-demo.seed.enabled", havingValue = "true")
public class OfficialDemoImportStatusSeedInitializer implements ApplicationRunner {

    @Value("${daiphat.lottery.seed.rebuild-demo:false}")
    private boolean rebuildDemo;

    private static final String NOTE_PREFIX = SeedDocumentCodes.IMPORT_NOTE_PREFIX + "OFFICIAL-";
    private static final String ACTOR = "official-demo-seed";
    private static final BigDecimal COST = BigDecimal.valueOf(10_000);

    private final SeedAccountResolver accountResolver;
    private final LotterySupplierRepository supplierRepository;
    private final LotteryStationRepository stationRepository;
    private final ImportBatchRepository batchRepository;
    private final LotteryTicketRepository ticketRepository;
    private final LotteryTicketSerialRepository serialRepository;
    private final LotterySerialSeedCleanup serialCleanup;
    private final Clock clock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!rebuildDemo) return;
        LocalDateTime now = LocalDateTime.now(clock);
        resetPrevious();
        LotterySupplierEntity supplier = supplierRepository
                .findByCodeIgnoreCaseAndDeletedAtIsNull(SharedSeedConstants.SUPPLIER_MINH_CHINH_CODE)
                .orElseThrow(() -> new IllegalStateException("Missing official-demo supplier"));
        LocalDate yesterday = now.toLocalDate().minusDays(1);
        LocalDate tomorrow = now.toLocalDate().plusDays(1);
        UserEntity yesterdayStaff = accountResolver.findOfficialDemoStaff(0);
        UserEntity tomorrowStaff = accountResolver.findOfficialDemoStaff(2);
        if (yesterdayStaff == null || tomorrowStaff == null) {
            throw new IllegalStateException("Missing official-demo import staff");
        }

        // A discarded draft retains its header and cancelled line, not imported stock.
        createScenario(supplier, yesterdayStaff, yesterday, ImportBatchStatus.CANCELLED,
                0, 1, yesterday.atTime(8, 0), now);

        if (now.toLocalTime().isBefore(LocalTime.of(8, 0))) {
            log.info("Deferring open official-demo import statuses until today's 08:00 intake.");
            return;
        }
        LocalDateTime openedAt = now.toLocalDate().atTime(8, 0);
        createScenario(supplier, tomorrowStaff, tomorrow, ImportBatchStatus.DRAFT,
                0, 1, openedAt, now);
        createScenario(supplier, tomorrowStaff, tomorrow, ImportBatchStatus.RECEIVING,
                500, 1, openedAt, now);
        createScenario(supplier, tomorrowStaff, tomorrow, ImportBatchStatus.PARTIALLY_IMPORTED,
                500, 2, openedAt, now);
    }

    private void resetPrevious() {
        List<ImportBatchEntity> old = batchRepository.findByNoteStartingWithAndDeletedAtIsNull(NOTE_PREFIX);
        for (ImportBatchEntity batch : old) {
            List<LotteryTicketSerialEntity> serials = serialRepository.findByImportBatch_Id(batch.getId());
            if (!serials.isEmpty()) {
                serialCleanup.clearDependentsBeforeSerialDelete(serials.stream()
                        .map(LotteryTicketSerialEntity::getId).toList());
                Set<Long> ticketIds = new HashSet<>();
                for (LotteryTicketSerialEntity serial : serials) {
                    ticketIds.add(serial.getTicket().getId());
                }
                serialRepository.deleteAll(serials);
                serialRepository.flush();
                for (Long ticketId : ticketIds) {
                    if (serialRepository.findByTicket_IdAndDeletedAtIsNull(ticketId).isEmpty()) {
                        ticketRepository.deleteById(ticketId);
                    }
                }
            }
            batchRepository.delete(batch);
        }
        batchRepository.flush();
    }

    private void createScenario(LotterySupplierEntity supplier, UserEntity staff,
                                LocalDate drawDate, ImportBatchStatus desiredStatus,
                                int importedQuantity, int lineCount,
                                LocalDateTime openedAt, LocalDateTime now) {
        List<LotteryStationEntity> stations = SouthernStationSeedSupport
                .filterCanonical(stationRepository.findAll()).stream()
                .filter(station -> station.getDeletedAt() == null && station.isActive())
                .filter(station -> station.getDrawDays() != null
                        && station.getDrawDays().contains(drawDate.getDayOfWeek()))
                .sorted(Comparator.comparing(LotteryStationEntity::getName))
                .limit(lineCount)
                .toList();
        if (stations.size() != lineCount) {
            throw new IllegalStateException("Insufficient scheduled stations for " + drawDate);
        }
        int lane = switch (desiredStatus) {
            case DRAFT -> 3_101;
            case RECEIVING -> 3_102;
            case PARTIALLY_IMPORTED -> 3_103;
            case CANCELLED -> 3_104;
            default -> throw new IllegalArgumentException("Not an open import scenario");
        };
        int declaredQuantity = desiredStatus == ImportBatchStatus.CANCELLED ? 500
                : desiredStatus == ImportBatchStatus.DRAFT ? 500 : 1_000;
        ImportBatchEntity batch = batchRepository.save(ImportBatchEntity.builder()
                .batchCode(SeedDocumentCodes.importHeader(drawDate, lane))
                .drawDate(drawDate)
                .supplier(supplier)
                .importMode(ImportBatchImportMode.IN_DAY)
                .invoiceEvidenceUrl("https://placehold.co/800x600/png?text=Hoa+don+nhap+ve")
                .ticketListImageUrls(new ArrayList<>(List.of(
                        "https://placehold.co/800x600/png?text=Danh+sach+ve")))
                .importedBy(staff)
                .importedAt(openedAt)
                .status(desiredStatus)
                .lineCount(lineCount)
                .totalDeclareQuantity(declaredQuantity)
                .totalDeclaredCostValue(COST.multiply(BigDecimal.valueOf(declaredQuantity)))
                .totalImportedQuantity(importedQuantity)
                .totalImportedCostValue(COST.multiply(BigDecimal.valueOf(importedQuantity)))
                .submittedAt(openedAt)
                .note(NOTE_PREFIX + desiredStatus + "-" + drawDate)
                .cancelReason(desiredStatus == ImportBatchStatus.CANCELLED
                        ? "Nhân viên hủy phiếu chưa nhập vé." : null)
                .createdAt(openedAt)
                .updatedAt(now)
                .createdBy(ACTOR)
                .lastModifiedBy(ACTOR)
                .build());

        for (int lineIndex = 0; lineIndex < lineCount; lineIndex++) {
            LotteryStationEntity station = stations.get(lineIndex);
            int imported = lineIndex == 0 ? importedQuantity : 0;
            int declared = desiredStatus == ImportBatchStatus.RECEIVING ? 1_000 : 500;
            ImportBatchLineEntity line = ImportBatchLineEntity.builder()
                    .importBatch(batch)
                    .lotteryStation(station)
                    .batchType(ImportBatchType.NEW)
                    .batchCode(SeedDocumentCodes.importLine(drawDate, station.getName(),
                            ImportBatchType.NEW, 31_000 + lane + lineIndex))
                    .declareQuantity(declared)
                    .declaredCostValue(COST.multiply(BigDecimal.valueOf(declared)))
                    .totalQuantity(imported)
                    .importCost(COST)
                    .totalCostValue(COST.multiply(BigDecimal.valueOf(imported)))
                    .status(desiredStatus == ImportBatchStatus.CANCELLED
                            ? ImportBatchLineStatus.CANCELLED
                            : ImportBatchSeedStatusHelper.resolveLineStatus(imported, declared))
                    .cancelReason(desiredStatus == ImportBatchStatus.CANCELLED
                            ? "Phiếu nhập bị hủy trước khi quét vé." : null)
                    .importedAt(imported > 0 ? openedAt : null)
                    .createdAt(openedAt)
                    .updatedAt(now)
                    .createdBy(ACTOR)
                    .lastModifiedBy(ACTOR)
                    .build();
            batch.getLines().add(line);
        }
        batch = batchRepository.save(batch);

        if (importedQuantity > 0) {
            ImportBatchLineEntity line = batch.getLines().getFirst();
            LotteryStationEntity station = line.getLotteryStation();
            List<LotteryTicketSerialEntity> serials = new ArrayList<>(500);
            for (int numberIndex = 0; numberIndex < 50; numberIndex++) {
                String number = String.format("%06d", 850_000 + (lane - 3_100) * 1_000 + numberIndex);
                LotteryTicketEntity ticket = ticketRepository.save(LotteryTicketEntity.builder()
                        .station(station)
                        .numbers(number)
                        .drawDate(drawDate)
                        .batchCode(line.getBatchCode())
                        .ticketImg("https://placehold.co/800x500/png?text=Ve+xo+so")
                        .priceSnapshot(station.getPrice() != null ? station.getPrice() : COST)
                        .status(LotteryTicketStatus.IN_STOCK)
                        .active(true)
                        .createdAt(openedAt)
                        .updatedAt(now)
                        .createdBy(ACTOR)
                        .lastModifiedBy(ACTOR)
                        .build());
                for (int serialIndex = 0; serialIndex < 10; serialIndex++) {
                    serials.add(LotteryTicketSerialEntity.builder()
                            .ticket(ticket)
                            .stationId(station.getId())
                            .drawDate(drawDate)
                            .importBatch(batch)
                            .importBatchLine(line)
                            .ticketImg(ticket.getTicketImg())
                            .serialNumber(number + (char) ('A' + serialIndex))
                            .status(LotteryTicketSerialStatus.IN_STOCK)
                            .ticketCondition(TicketCondition.GOOD)
                            .inputSource(InputSource.MANUAL)
                            .importedBy(staff)
                            .importedAt(openedAt)
                            .verified(true)
                            .verifiedBy(staff)
                            .verifiedAt(openedAt)
                            .createdAt(openedAt)
                            .updatedAt(now)
                            .createdBy(ACTOR)
                            .lastModifiedBy(ACTOR)
                            .build());
                }
            }
            serialRepository.saveAll(serials);
        }
        if (desiredStatus != ImportBatchStatus.CANCELLED) {
            ImportBatchSeedStatusHelper.applyHeaderStatus(batch, batch.getLines(), now);
            if (batch.getStatus() != desiredStatus) {
                throw new IllegalStateException("Invalid import status scenario: " + desiredStatus);
            }
            batchRepository.save(batch);
        }
        log.info("Seeded {} import batch {} with {} imported serials.",
                desiredStatus, batch.getBatchCode(), importedQuantity);
    }
}
