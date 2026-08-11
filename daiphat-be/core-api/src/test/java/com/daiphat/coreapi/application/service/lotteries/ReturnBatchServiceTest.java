package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.AttachReturnSerialItem;
import com.daiphat.coreapi.application.dto.request.lotteries.AttachReturnSerialsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateReturnBatchLineRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateReturnBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateReturnBatchLineStatusRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.ReturnBatchResponse;
import com.daiphat.coreapi.application.mapper.lotteries.ReturnBatchApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotterySupplierServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnBatchRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchType;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import com.daiphat.coreapi.shared.util.ImportBatchConfigResolver;
import com.daiphat.coreapi.shared.util.ReturnBatchCodeGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ReturnBatchService")
class ReturnBatchServiceTest {

    private static final LocalDate DRAW_DATE = LocalDate.of(2026, 7, 31);
    private static final UUID OPERATOR_ID = UUID.randomUUID();
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Mock
    private ReturnBatchRepositoryPort returnBatchRepositoryPort;
    @Mock
    private LotterySupplierServicePort lotterySupplierServicePort;
    @Mock
    private SupplierSettlementServicePort supplierSettlementServicePort;
    @Mock
    private LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;
    @Mock
    private LotteryTicketRepositoryPort lotteryTicketRepositoryPort;
    @Mock
    private ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    @Mock
    private ReturnBatchApplicationMapper returnBatchApplicationMapper;
    @Mock
    private ReturnBatchSummaryCalculator returnBatchSummaryCalculator;
    @Mock
    private ImportBatchConfigResolver importBatchConfigResolver;
    @Mock
    private ReturnBatchAutoCancelService returnBatchAutoCancelService;
    @Mock
    private ReturnBatchCodeGenerator returnBatchCodeGenerator;
    @Mock
    private Clock clock;

    @InjectMocks
    private ReturnBatchService returnBatchService;

    private LotterySupplierModel supplier;

    @BeforeEach
    void setUp() {
        supplier = LotterySupplierModel.builder()
                .id(7L)
                .name("Minh Chinh")
                .code("MC")
                .paymentTermDays(0)
                .build();
        when(clock.instant()).thenReturn(Instant.parse("2026-07-31T10:00:00Z"));
        when(clock.getZone()).thenReturn(ZONE);
        when(returnBatchCodeGenerator.generateHeaderCode(any(LocalDate.class))).thenReturn("RB-TEST-001");
        when(lotterySupplierServicePort.getActiveModelById(7L)).thenReturn(supplier);
        when(supplierSettlementServicePort.findOrCreateForImport(any(), eq(DRAW_DATE)))
                .thenReturn(SupplierSettlementModel.builder().id(50L).lotterySupplierId(7L).periodFrom(DRAW_DATE).build());
        when(returnBatchApplicationMapper.toResponse(any(), any()))
                .thenAnswer(invocation -> {
                    ReturnBatchModel model = invocation.getArgument(0);
                    return ReturnBatchResponse.builder()
                            .id(model.getId())
                            .lotterySupplierId(model.getLotterySupplierId())
                            .drawDate(model.getDrawDate())
                            .supplierSettlementId(model.getSupplierSettlementId())
                            .status(model.getStatus())
                            .lines(invocation.getArgument(1))
                            .build();
                });
    }

    @Test
    @DisplayName("create links settlement for supplier + drawDate")
    void create_linksSettlement() {
        when(returnBatchRepositoryPort.findBySupplierAndDrawDate(7L, DRAW_DATE))
                .thenReturn(Optional.empty());
        when(returnBatchRepositoryPort.save(any())).thenAnswer(invocation -> {
            ReturnBatchModel model = invocation.getArgument(0);
            if (model.getId() == null) {
                model.setId(10L);
            }
            return model;
        });
        when(returnBatchRepositoryPort.saveLine(any())).thenAnswer(invocation -> {
            ReturnBatchLineModel line = invocation.getArgument(0);
            line.setId(100L);
            return line;
        });
        when(returnBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(ReturnBatchModel.builder()
                .id(10L)
                .lotterySupplierId(7L)
                .drawDate(DRAW_DATE)
                .supplierSettlementId(50L)
                .status(ReturnBatchStatus.PENDING_INSPECTION)
                .build()));
        when(returnBatchRepositoryPort.findLinesByBatchId(10L)).thenReturn(List.of(
                ReturnBatchLineModel.builder().id(100L).returnBatchId(10L).lotteryStationId(1L).build()
        ));
        when(lotteryTicketSerialRepositoryPort.countByReturnBatchLineId(anyLong())).thenReturn(0L);

        ReturnBatchResponse response = returnBatchService.create(
                new CreateReturnBatchRequest(7L, DRAW_DATE, null, List.of(new CreateReturnBatchLineRequest(1L))),
                OPERATOR_ID
        );

        assertThat(response.supplierSettlementId()).isEqualTo(50L);
        assertThat(response.status()).isEqualTo(ReturnBatchStatus.PENDING_INSPECTION);
        verify(supplierSettlementServicePort).findOrCreateForImport(supplier, DRAW_DATE);
    }

    @Test
    @DisplayName("getAll defaults to supplier return batches when no type is supplied")
    void getAll_defaultsToSupplierReturnType() {
        when(returnBatchRepositoryPort.findAll(
                any(), any(), any(), any(), any(), any(), any(), any()
        )).thenReturn(Page.empty());

        returnBatchService.getAll(
                1,
                10,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        verify(returnBatchRepositoryPort).findAll(
                any(),
                isNull(),
                isNull(),
                eq(ReturnBatchType.SUPPLIER_RETURN),
                isNull(),
                isNull(),
                isNull(),
                isNull()
        );
    }

    @Test
    @DisplayName("getAll forwards an explicit street-agent return type")
    void getAll_forwardsStreetAgentReturnType() {
        when(returnBatchRepositoryPort.findAll(
                any(), any(), any(), any(), any(), any(), any(), any()
        )).thenReturn(Page.empty());

        returnBatchService.getAll(
                1,
                10,
                null,
                null,
                ReturnBatchType.STREET_AGENT_RETURN,
                null,
                null,
                null,
                null,
                null,
                null
        );

        verify(returnBatchRepositoryPort).findAll(
                any(),
                isNull(),
                isNull(),
                eq(ReturnBatchType.STREET_AGENT_RETURN),
                isNull(),
                isNull(),
                isNull(),
                isNull()
        );
    }

    @Test
    @DisplayName("attach serials then SUCCESS line refreshes settlement return value")
    void updateLineStatus_success_recalculatesSettlement() {
        ReturnBatchModel batch = ReturnBatchModel.builder()
                .id(10L)
                .lotterySupplierId(7L)
                .drawDate(DRAW_DATE)
                .supplierSettlementId(50L)
                .status(ReturnBatchStatus.PENDING_INSPECTION)
                .build();
        ReturnBatchLineModel line = ReturnBatchLineModel.builder()
                .id(100L)
                .returnBatchId(10L)
                .lotteryStationId(1L)
                .status(ReturnBatchLineStatus.PENDING)
                .build();
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .id(501L)
                .ticketId(90L)
                .importBatchLineId(20L)
                .returnBatchLineId(100L)
                .status(LotteryTicketSerialStatus.IN_STOCK)
                .build();

        when(returnBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));
        when(returnBatchRepositoryPort.findLineById(100L)).thenReturn(Optional.of(line));
        when(returnBatchRepositoryPort.findLinesByBatchId(10L)).thenReturn(List.of(line));
        when(returnBatchRepositoryPort.saveLine(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(returnBatchRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(lotteryTicketSerialRepositoryPort.findAllByReturnBatchLineId(100L)).thenReturn(List.of(serial));
        when(lotteryTicketSerialRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(importBatchLineRepositoryPort.findById(20L)).thenReturn(Optional.of(
                ImportBatchLineModel.builder().id(20L).importCost(new BigDecimal("9500.000")).build()
        ));
        when(lotteryTicketSerialRepositoryPort.countByReturnBatchLineId(100L)).thenReturn(1L);

        returnBatchService.updateLineStatus(10L, 100L, new UpdateReturnBatchLineStatusRequest(ReturnBatchLineStatus.SUCCESS));

        ArgumentCaptor<LotteryTicketSerialModel> serialCaptor = ArgumentCaptor.forClass(LotteryTicketSerialModel.class);
        verify(lotteryTicketSerialRepositoryPort).save(serialCaptor.capture());
        assertThat(serialCaptor.getValue().getStatus()).isEqualTo(LotteryTicketSerialStatus.IN_STOCK);
        assertThat(serialCaptor.getValue().getReturnedAt()).isNotNull();
        verify(supplierSettlementServicePort).recalculateTotalReturnValue(50L);
    }

    @Test
    @DisplayName("attachSerials links serial to return line and stores override fields")
    void attachSerials_manualOverride() {
        ReturnBatchModel batch = ReturnBatchModel.builder()
                .id(10L)
                .lotterySupplierId(7L)
                .drawDate(DRAW_DATE)
                .supplierSettlementId(50L)
                .status(ReturnBatchStatus.PENDING_INSPECTION)
                .build();
        ReturnBatchLineModel line = ReturnBatchLineModel.builder()
                .id(100L)
                .returnBatchId(10L)
                .lotteryStationId(1L)
                .status(ReturnBatchLineStatus.PENDING)
                .build();
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .id(501L)
                .ticketId(90L)
                .importBatchLineId(20L)
                .status(LotteryTicketSerialStatus.IN_STOCK)
                .build();

        when(returnBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));
        when(returnBatchRepositoryPort.findLineById(100L)).thenReturn(Optional.of(line));
        when(returnBatchRepositoryPort.findLinesByBatchId(10L)).thenReturn(List.of(line));
        when(returnBatchRepositoryPort.saveLine(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(returnBatchRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(lotteryTicketSerialRepositoryPort.findAllByIds(any())).thenReturn(List.of(serial));
        when(lotteryTicketSerialRepositoryPort.findAllByReturnBatchLineId(100L)).thenReturn(List.of(serial));
        when(lotteryTicketSerialRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(lotteryTicketRepositoryPort.findById(90L)).thenReturn(Optional.of(
                LotteryTicketModel.builder().id(90L).stationId(1L).drawDate(DRAW_DATE).build()
        ));
        when(importBatchLineRepositoryPort.findById(20L)).thenReturn(Optional.of(
                ImportBatchLineModel.builder().id(20L).importCost(new BigDecimal("9500.000")).build()
        ));
        when(lotteryTicketSerialRepositoryPort.countByReturnBatchLineId(100L)).thenReturn(1L);

        returnBatchService.attachSerials(
                10L,
                100L,
                new AttachReturnSerialsRequest(List.of(
                        new AttachReturnSerialItem(501L, true, "Máy đọc lệch", "https://cdn/evidence.jpg")
                ))
        );

        ArgumentCaptor<LotteryTicketSerialModel> captor = ArgumentCaptor.forClass(LotteryTicketSerialModel.class);
        verify(lotteryTicketSerialRepositoryPort).save(captor.capture());
        LotteryTicketSerialModel saved = captor.getValue();
        assertThat(saved.getReturnBatchLineId()).isEqualTo(100L);
        assertThat(saved.getStatus()).isEqualTo(LotteryTicketSerialStatus.IN_STOCK);
        assertThat(saved.isManualOverride()).isTrue();
        assertThat(saved.getOverrideReason()).isEqualTo("Máy đọc lệch");
        assertThat(saved.getOverrideEvidenceUrl()).isEqualTo("https://cdn/evidence.jpg");
    }
}
