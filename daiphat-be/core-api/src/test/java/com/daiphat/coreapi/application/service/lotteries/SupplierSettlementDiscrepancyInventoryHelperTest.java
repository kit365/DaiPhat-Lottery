package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.SettlementImportPlaceholderRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementStationInventoryResponse;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.shared.util.ImportBatchCodeGenerator;
import com.daiphat.coreapi.shared.util.ReturnBatchCodeGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SupplierSettlementDiscrepancyInventoryHelper placeholders")
class SupplierSettlementDiscrepancyInventoryHelperTest {

    @Mock private ImportBatchRepositoryPort importBatchRepositoryPort;
    @Mock private ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    @Mock private ImportBatchCodeGenerator importBatchCodeGenerator;
    @Mock private LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    @Mock private LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    @Mock private LotteryStationRepositoryPort lotteryStationRepositoryPort;
    @Mock private ReturnBatchRepositoryPort returnBatchRepositoryPort;
    @Mock private ReturnBatchCodeGenerator returnBatchCodeGenerator;
    @Mock private ReturnBatchImportSyncService returnBatchImportSyncService;

    @InjectMocks
    private SupplierSettlementDiscrepancyInventoryHelper helper;

    private static final UUID ACTOR = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final LocalDate DRAW_DATE = LocalDate.of(2026, 8, 18);
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 8, 18, 10, 0);

    private final AtomicLong lineIds = new AtomicLong(10);
    private final AtomicLong ticketIds = new AtomicLong(100);
    private final AtomicLong serialIds = new AtomicLong(200);
    private final List<ImportBatchLineModel> savedLines = new ArrayList<>();

    @BeforeEach
    void stubPersistence() {
        lenient().when(importBatchCodeGenerator.generateHeaderCode(any())).thenReturn("PN-TEST");
        lenient().when(importBatchCodeGenerator.generateLineCode(any(), any(), any())).thenReturn("LO-TEST");
        lenient().when(importBatchRepositoryPort.save(any())).thenAnswer(inv -> {
            ImportBatchModel batch = inv.getArgument(0);
            if (batch.getId() == null) {
                batch.setId(1L);
            }
            return batch;
        });
        lenient().when(importBatchLineRepositoryPort.save(any())).thenAnswer(inv -> {
            ImportBatchLineModel line = inv.getArgument(0);
            if (line.getId() == null) {
                line.setId(lineIds.incrementAndGet());
            }
            savedLines.removeIf(existing -> Objects.equals(existing.getId(), line.getId()));
            savedLines.add(line);
            return line;
        });
        lenient().when(importBatchLineRepositoryPort.findByImportBatchId(any())).thenAnswer(inv -> List.copyOf(savedLines));
        lenient().when(lotteryTicketRepositoryPort.findByUniqueFields(any(), any(), any())).thenReturn(Optional.empty());
        lenient().when(lotteryTicketRepositoryPort.save(any())).thenAnswer(inv -> {
            LotteryTicketModel ticket = inv.getArgument(0);
            if (ticket.getId() == null) {
                ticket.setId(ticketIds.incrementAndGet());
            }
            return ticket;
        });
        lenient().when(lotteryTicketSerialRepositoryPort.save(any())).thenAnswer(inv -> {
            LotteryTicketSerialModel serial = inv.getArgument(0);
            if (serial.getId() == null) {
                serial.setId(serialIds.incrementAndGet());
            }
            return serial;
        });
        lenient().when(lotteryStationRepositoryPort.findById(5L)).thenReturn(Optional.of(
                LotteryStationModel.builder()
                        .id(5L)
                        .name("Bạc Liêu")
                        .price(new BigDecimal("10000"))
                        .build()
        ));
    }

    private SupplierSettlementModel settlement() {
        return SupplierSettlementModel.builder()
                .id(10L)
                .lotterySupplierId(3L)
                .periodFrom(DRAW_DATE)
                .build();
    }

    @Test
    @DisplayName("UNDER_IMPORTED creates ghost serials with unused 6-digit numbers")
    void underImported_createsGhostSerialsWithSixDigitNumbers() {
        List<Long> created = helper.createLostPlaceholders(
                settlement(),
                List.of(new SettlementImportPlaceholderRequest(5L, 2, TicketCondition.UNDER_IMPORTED)),
                new BigDecimal("10000"),
                ACTOR,
                NOW,
                TicketCondition.UNDER_IMPORTED,
                null,
                "missing"
        );

        assertThat(created).hasSize(2);
        ArgumentCaptor<LotteryTicketModel> ticketCaptor = ArgumentCaptor.forClass(LotteryTicketModel.class);
        verify(lotteryTicketRepositoryPort, times(2)).save(ticketCaptor.capture());
        assertThat(ticketCaptor.getAllValues())
                .extracting(LotteryTicketModel::getNumbers)
                .allMatch(numbers -> numbers != null && numbers.matches("\\d{6}"));
        ArgumentCaptor<LotteryTicketSerialModel> serialCaptor = ArgumentCaptor.forClass(LotteryTicketSerialModel.class);
        verify(lotteryTicketSerialRepositoryPort, times(2)).save(serialCaptor.capture());
        assertThat(serialCaptor.getAllValues())
                .extracting(LotteryTicketSerialModel::getTicketCondition)
                .containsOnly(TicketCondition.UNDER_IMPORTED);
        assertThat(savedLines).anyMatch(line -> Integer.valueOf(2).equals(line.getTotalQuantity()));
    }

    @Test
    @DisplayName("LOST does not create serials but still sets ADJUSTMENT line quantity")
    void lost_doesNotCreateSerialsButSetsLineQuantity() {
        List<Long> created = helper.createLostPlaceholders(
                settlement(),
                List.of(new SettlementImportPlaceholderRequest(5L, 5, TicketCondition.LOST)),
                new BigDecimal("10000"),
                ACTOR,
                NOW,
                TicketCondition.LOST,
                null,
                "lost"
        );

        assertThat(created).isEmpty();
        verify(lotteryTicketRepositoryPort, never()).save(any());
        verify(lotteryTicketSerialRepositoryPort, never()).save(any());
        assertThat(savedLines).anyMatch(line ->
                Integer.valueOf(5).equals(line.getTotalQuantity())
                        && Integer.valueOf(5).equals(line.getDeclareQuantity())
                        && line.getBatchType() == ImportBatchType.ADJUSTMENT
        );
    }

    @Test
    @DisplayName("mixed UNDER_IMPORTED and LOST creates ghosts only for non-LOST qty")
    void mixed_createsGhostsOnlyForNonLostQuantity() {
        List<Long> created = helper.createLostPlaceholders(
                settlement(),
                List.of(
                        new SettlementImportPlaceholderRequest(5L, 3, TicketCondition.UNDER_IMPORTED),
                        new SettlementImportPlaceholderRequest(5L, 2, TicketCondition.LOST)
                ),
                new BigDecimal("10000"),
                ACTOR,
                NOW,
                TicketCondition.UNDER_IMPORTED,
                null,
                "mixed"
        );

        assertThat(created).hasSize(3);
        verify(lotteryTicketSerialRepositoryPort, times(3)).save(any());
        assertThat(savedLines).anyMatch(line -> Integer.valueOf(5).equals(line.getTotalQuantity()));
    }

    @Test
    @DisplayName("DAMAGED without evidence is rejected")
    void damaged_withoutEvidence_rejects() {
        assertThatThrownBy(() -> helper.createLostPlaceholders(
                settlement(),
                List.of(new SettlementImportPlaceholderRequest(5L, 1, TicketCondition.DAMAGED)),
                new BigDecimal("10000"),
                ACTOR,
                NOW,
                TicketCondition.DAMAGED,
                null,
                "damaged"
        )).isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getInternalMessage())
                .asString()
                .contains("minh chứng");
        verify(lotteryTicketSerialRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("mergeUnbackedAdjustmentInventory adds LOST gap onto station imported/lost qty")
    void mergeUnbackedAdjustmentInventory_addsLostGap() {
        ImportBatchModel batch = ImportBatchModel.builder().id(9L).build();
        when(importBatchRepositoryPort.findBySupplierSettlementId(10L)).thenReturn(List.of(batch));
        when(importBatchLineRepositoryPort.findByImportBatchId(9L)).thenReturn(List.of(
                ImportBatchLineModel.builder()
                        .id(44L)
                        .lotteryStationId(5L)
                        .batchType(ImportBatchType.ADJUSTMENT)
                        .totalQuantity(8)
                        .build()
        ));
        when(lotteryTicketSerialRepositoryPort.countByImportBatchLineId(44L)).thenReturn(5L);

        List<SettlementStationInventoryResponse> merged = helper.mergeUnbackedAdjustmentInventory(
                10L,
                List.of(SettlementStationInventoryResponse.builder()
                        .lotteryStationId(5L)
                        .lotteryStationName("Bạc Liêu")
                        .importedQuantity(41)
                        .soldQuantity(0)
                        .remainingQuantity(10)
                        .damagedQuantity(0)
                        .lostQuantity(0)
                        .voidedQuantity(0)
                        .returnQuantity(0)
                        .returnValue(BigDecimal.ZERO)
                        .build())
        );

        assertThat(merged).hasSize(1);
        assertThat(merged.get(0).importedQuantity()).isEqualTo(44);
        assertThat(merged.get(0).lostQuantity()).isEqualTo(3);
        assertThat(merged.get(0).remainingQuantity()).isEqualTo(10);
    }
}
