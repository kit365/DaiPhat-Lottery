package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.service.streetagent.LuckySerialTagger;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.shared.util.SupplierTicketIntakeWindowPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.daiphat.coreapi.application.dto.request.lotteries.ReportSerialFaultRequest;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialFaultedBy;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LotteryTicketSerialServiceTest {

    @Mock
    private LotteryTicketSerialRepositoryPort lotteryTicketSerialRepositoryPort;

    @Mock
    private StoragePort storagePort;

    @Mock
    private OrderRepositoryPort orderRepositoryPort;

    @Mock
    private LotteryTicketSerialIncidentService lotteryTicketSerialIncidentService;

    @Mock
    private LuckySerialTagger luckySerialTagger;

    @Mock
    private ImportBatchRepositoryPort importBatchRepositoryPort;

    @Mock
    private LotterySupplierRepositoryPort lotterySupplierRepositoryPort;

    @Mock
    private SupplierTicketIntakeWindowPolicy intakeWindowPolicy;

    private LotteryTicketSerialServicePort lotteryTicketSerialService;

    private final Long TICKET_ID = 1L;
    private final Long SERIAL_ID = 100L;
    private final UUID USER_ID = UUID.randomUUID();
    private LotteryTicketModel ticketModel;
    private LotteryTicketSerialModel serialModel;

    @BeforeEach
    void setUp() {
        lotteryTicketSerialService = new LotteryTicketSerialService(
                lotteryTicketSerialRepositoryPort,
                storagePort,
                orderRepositoryPort,
                lotteryTicketSerialIncidentService,
                luckySerialTagger,
                importBatchRepositoryPort,
                lotterySupplierRepositoryPort,
                intakeWindowPolicy,
                Clock.systemDefaultZone());

        ticketModel = LotteryTicketModel.builder().id(TICKET_ID).numbers("001234").build();
        
        serialModel = LotteryTicketSerialModel.builder()
                .id(SERIAL_ID)
                .ticketId(TICKET_ID)
                .serialNumber("SN-123")
                .status(LotteryTicketSerialStatus.IN_STOCK)
                .build();
    }

    // === upsertSerialForTicket ===

    @Test
    @DisplayName("[DP-37] upsertSerialForTicket_throwsWhenExisted")
    void upsertSerialForTicket_throwsWhenExisted() {
        CreateLotteryTicketSerialRequest req = new CreateLotteryTicketSerialRequest("img.png", " SN-123 ");
        when(lotteryTicketSerialRepositoryPort.existsByTicketIdAndSerialNumber(TICKET_ID, "SN-123")).thenReturn(true);

        assertThatThrownBy(() -> lotteryTicketSerialService.upsertSerialForTicket(ticketModel, req, USER_ID, 1L, 2L))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_TICKET_SERIAL_EXISTED);
    }

    @Test
    @DisplayName("[DP-37] upsertSerialForTicket_success")
    void upsertSerialForTicket_success() {
        CreateLotteryTicketSerialRequest req = new CreateLotteryTicketSerialRequest("img.png", " SN-123 ");
        when(lotteryTicketSerialRepositoryPort.existsByTicketIdAndSerialNumber(TICKET_ID, "SN-123")).thenReturn(false);
        when(lotteryTicketSerialRepositoryPort.save(any())).thenAnswer(i -> i.getArgument(0));

        LotteryTicketSerialModel result = lotteryTicketSerialService.upsertSerialForTicket(ticketModel, req, USER_ID, 1L, 2L);
        
        assertThat(result.getSerialNumber()).isEqualTo("SN-123");
        assertThat(result.getTicketImg()).isEqualTo("img.png");
        assertThat(result.getImportedById()).isEqualTo(USER_ID);
        assertThat(result.getImportBatchId()).isEqualTo(1L);
        assertThat(result.getImportBatchLineId()).isEqualTo(2L);
        assertThat(result.getInputSource()).isEqualTo(InputSource.MANUAL);
        verify(luckySerialTagger).apply(any(LotteryTicketSerialModel.class), eq("001234"));
    }

    @Test
    @DisplayName("[DP-37] upsertSerialForTicket_appliesLuckyTagFromActivePatterns")
    void upsertSerialForTicket_appliesLuckyTagFromActivePatterns() {
        CreateLotteryTicketSerialRequest req = new CreateLotteryTicketSerialRequest("img.png", " SN-LCK ");
        when(lotteryTicketSerialRepositoryPort.existsByTicketIdAndSerialNumber(TICKET_ID, "SN-LCK")).thenReturn(false);
        when(lotteryTicketSerialRepositoryPort.save(any())).thenAnswer(i -> i.getArgument(0));
        doAnswer(invocation -> {
            LotteryTicketSerialModel serial = invocation.getArgument(0);
            serial.setLucky(true);
            serial.setLuckyBadges("Tứ quý");
            return null;
        }).when(luckySerialTagger).apply(any(LotteryTicketSerialModel.class), eq("001234"));

        LotteryTicketSerialModel result = lotteryTicketSerialService.upsertSerialForTicket(ticketModel, req, USER_ID, 1L, 2L);

        assertThat(result.isLucky()).isTrue();
        assertThat(result.getLuckyBadges()).isEqualTo("Tứ quý");
        ArgumentCaptor<LotteryTicketSerialModel> captor = ArgumentCaptor.forClass(LotteryTicketSerialModel.class);
        verify(lotteryTicketSerialRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().isLucky()).isTrue();
    }

    // === syncSerialsForTicket ===

    @Test
    @DisplayName("[DP-37] syncSerialsForTicket_nullOrEmpty_returnsEarly")
    void syncSerialsForTicket_nullOrEmpty_returnsEarly() {
        lotteryTicketSerialService.syncSerialsForTicket(ticketModel, null, USER_ID);
        lotteryTicketSerialService.syncSerialsForTicket(ticketModel, List.of(), USER_ID);
        verifyNoInteractions(lotteryTicketSerialRepositoryPort);
    }

    @Test
    @DisplayName("[DP-37] syncSerialsForTicket_updateExisting_throwsWhenNotFound")
    void syncSerialsForTicket_updateExisting_throwsWhenNotFound() {
        UpdateLotteryTicketSerialRequest req = new UpdateLotteryTicketSerialRequest(999L, "img", "SN");
        when(lotteryTicketSerialRepositoryPort.findAllByTicketId(TICKET_ID)).thenReturn(List.of(serialModel));

        assertThatThrownBy(() -> lotteryTicketSerialService.syncSerialsForTicket(ticketModel, List.of(req), USER_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_TICKET_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-37] syncSerialsForTicket_updateExisting_notEditable_throws")
    void syncSerialsForTicket_updateExisting_notEditable_throws() {
        UpdateLotteryTicketSerialRequest req = new UpdateLotteryTicketSerialRequest(SERIAL_ID, "img", "SN");
        serialModel.setStatus(LotteryTicketSerialStatus.SOLD);
        when(lotteryTicketSerialRepositoryPort.findAllByTicketId(TICKET_ID)).thenReturn(List.of(serialModel));

        assertThatThrownBy(() -> lotteryTicketSerialService.syncSerialsForTicket(ticketModel, List.of(req), USER_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }

    @Test
    @DisplayName("[DP-37] syncSerialsForTicket_updateExisting_serialNumberChanged_existed_throws")
    void syncSerialsForTicket_updateExisting_serialNumberChanged_existed_throws() {
        UpdateLotteryTicketSerialRequest req = new UpdateLotteryTicketSerialRequest(SERIAL_ID, "img", "SN-NEW");
        when(lotteryTicketSerialRepositoryPort.findAllByTicketId(TICKET_ID)).thenReturn(List.of(serialModel));
        when(lotteryTicketSerialRepositoryPort.existsByTicketIdAndSerialNumber(TICKET_ID, "SN-NEW")).thenReturn(true);

        assertThatThrownBy(() -> lotteryTicketSerialService.syncSerialsForTicket(ticketModel, List.of(req), USER_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_TICKET_SERIAL_EXISTED);
    }

    @Test
    @DisplayName("[DP-37] syncSerialsForTicket_updateExisting_success")
    void syncSerialsForTicket_updateExisting_success() {
        UpdateLotteryTicketSerialRequest req = new UpdateLotteryTicketSerialRequest(SERIAL_ID, "  img.png  ", " SN-NEW ");
        when(lotteryTicketSerialRepositoryPort.findAllByTicketId(TICKET_ID)).thenReturn(List.of(serialModel));
        when(lotteryTicketSerialRepositoryPort.existsByTicketIdAndSerialNumber(TICKET_ID, "SN-NEW")).thenReturn(false);

        lotteryTicketSerialService.syncSerialsForTicket(ticketModel, List.of(req), USER_ID);

        verify(lotteryTicketSerialRepositoryPort).save(serialModel);
        assertThat(serialModel.getSerialNumber()).isEqualTo("SN-NEW");
        assertThat(serialModel.getTicketImg()).isEqualTo("img.png");
    }

    @Test
    @DisplayName("[DP-37] syncSerialsForTicket_updateExisting_noImg")
    void syncSerialsForTicket_updateExisting_noImg() {
        UpdateLotteryTicketSerialRequest req = new UpdateLotteryTicketSerialRequest(SERIAL_ID, "   ", " SN-123 ");
        when(lotteryTicketSerialRepositoryPort.findAllByTicketId(TICKET_ID)).thenReturn(List.of(serialModel));

        lotteryTicketSerialService.syncSerialsForTicket(ticketModel, List.of(req), USER_ID);

        verify(lotteryTicketSerialRepositoryPort).save(serialModel);
        assertThat(serialModel.getSerialNumber()).isEqualTo("SN-123");
        // ticketImg remains unchanged
    }

    @Test
    @DisplayName("[DP-37] syncSerialsForTicket_addNew")
    void syncSerialsForTicket_addNew() {
        UpdateLotteryTicketSerialRequest req = new UpdateLotteryTicketSerialRequest(null, "img", "SN-NEW");
        when(lotteryTicketSerialRepositoryPort.findAllByTicketId(TICKET_ID)).thenReturn(List.of());

        lotteryTicketSerialService.syncSerialsForTicket(ticketModel, List.of(req), USER_ID);

        ArgumentCaptor<LotteryTicketSerialModel> captor = ArgumentCaptor.forClass(LotteryTicketSerialModel.class);
        verify(lotteryTicketSerialRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getSerialNumber()).isEqualTo("SN-NEW");
    }

    @Test
    @DisplayName("[DP-37] syncSerialsForTicket_deleteExisting_throwsWhenNotDeletableStatus")
    void syncSerialsForTicket_deleteExisting_throwsWhenNotDeletableStatus() {
        UpdateLotteryTicketSerialRequest req = new UpdateLotteryTicketSerialRequest(null, "img", "SN-NEW");
        serialModel.setStatus(LotteryTicketSerialStatus.SOLD); // Not deletable
        when(lotteryTicketSerialRepositoryPort.findAllByTicketId(TICKET_ID)).thenReturn(List.of(serialModel));

        assertThatThrownBy(() -> lotteryTicketSerialService.syncSerialsForTicket(ticketModel, List.of(req), USER_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }

    @Test
    @DisplayName("[DP-37] syncSerialsForTicket_deleteExisting_throwsWhenHasOrder")
    void syncSerialsForTicket_deleteExisting_throwsWhenHasOrder() {
        UpdateLotteryTicketSerialRequest req = new UpdateLotteryTicketSerialRequest(null, "img", "SN-NEW");
        when(lotteryTicketSerialRepositoryPort.findAllByTicketId(TICKET_ID)).thenReturn(List.of(serialModel));
        when(orderRepositoryPort.existsByLotteryTicketSerialId(SERIAL_ID)).thenReturn(true);

        assertThatThrownBy(() -> lotteryTicketSerialService.syncSerialsForTicket(ticketModel, List.of(req), USER_ID))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }

    @Test
    @DisplayName("[DP-37] syncSerialsForTicket_deleteExisting_success")
    void syncSerialsForTicket_deleteExisting_success() {
        UpdateLotteryTicketSerialRequest req = new UpdateLotteryTicketSerialRequest(null, "img", "SN-NEW");
        when(lotteryTicketSerialRepositoryPort.findAllByTicketId(TICKET_ID)).thenReturn(List.of(serialModel));
        when(orderRepositoryPort.existsByLotteryTicketSerialId(SERIAL_ID)).thenReturn(false);

        lotteryTicketSerialService.syncSerialsForTicket(ticketModel, List.of(req), USER_ID);

        verify(lotteryTicketSerialRepositoryPort, times(2)).save(any()); // 1 upsert, 1 delete
        assertThat(serialModel.getDeletedAt()).isNotNull();
    }

    // === other operations ===

    @Test
    @DisplayName("[DP-37] reserveFirstAvailable_throws")
    void reserveFirstAvailable_throws() {
        when(lotteryTicketSerialRepositoryPort.findAllByTicketId(TICKET_ID)).thenReturn(List.of());

        assertThatThrownBy(() -> lotteryTicketSerialService.reserveFirstAvailable(TICKET_ID, UUID.randomUUID(), LocalDateTime.now()))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }

    @Test
    @DisplayName("[DP-37] reserveFirstAvailable_success")
    void reserveFirstAvailable_success() {
        UUID orderId = UUID.randomUUID();
        when(lotteryTicketSerialRepositoryPort.findAllByTicketId(TICKET_ID)).thenReturn(List.of(serialModel));
        when(lotteryTicketSerialRepositoryPort.save(any())).thenAnswer(i -> i.getArgument(0));

        LotteryTicketSerialModel result = lotteryTicketSerialService.reserveFirstAvailable(TICKET_ID, orderId, LocalDateTime.now());
        assertThat(result.getStatus()).isEqualTo(LotteryTicketSerialStatus.RESERVED);
        assertThat(result.getReservedByOrderId()).isEqualTo(orderId);
    }

    @Test
    @DisplayName("[DP-37] sellFirstAvailable_success")
    void sellFirstAvailable_success() {
        when(lotteryTicketSerialRepositoryPort.findAllByTicketId(TICKET_ID)).thenReturn(List.of(serialModel));
        when(lotteryTicketSerialRepositoryPort.save(any())).thenAnswer(i -> i.getArgument(0));

        LotteryTicketSerialModel result = lotteryTicketSerialService.sellFirstAvailable(TICKET_ID);
        assertThat(result.getStatus()).isEqualTo(LotteryTicketSerialStatus.SOLD);
    }

    @Test
    @DisplayName("[DP-37] markSold_throws")
    void markSold_throws() {
        when(lotteryTicketSerialRepositoryPort.findById(SERIAL_ID)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> lotteryTicketSerialService.markSold(SERIAL_ID))
                .isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("[DP-37] markSold_success")
    void markSold_success() {
        serialModel.setStatus(LotteryTicketSerialStatus.RESERVED);
        when(lotteryTicketSerialRepositoryPort.findById(SERIAL_ID)).thenReturn(Optional.of(serialModel));
        when(lotteryTicketSerialRepositoryPort.save(any())).thenAnswer(i -> i.getArgument(0));

        LotteryTicketSerialModel result = lotteryTicketSerialService.markSold(SERIAL_ID);
        assertThat(result.getStatus()).isEqualTo(LotteryTicketSerialStatus.SOLD);
    }

    @Test
    @DisplayName("[DP-37] releaseReservation_withExpire_success")
    void releaseReservation_withExpire_success() {
        serialModel.setStatus(LotteryTicketSerialStatus.RESERVED);
        when(lotteryTicketSerialRepositoryPort.findById(SERIAL_ID)).thenReturn(Optional.of(serialModel));
        when(lotteryTicketSerialRepositoryPort.save(any())).thenAnswer(i -> i.getArgument(0));

        LotteryTicketSerialModel result = lotteryTicketSerialService.releaseReservation(SERIAL_ID, true);
        assertThat(result.getStatus()).isEqualTo(LotteryTicketSerialStatus.EXPIRED);
    }

    @Test
    @DisplayName("[DP-37] releaseReservation_withoutExpire_success")
    void releaseReservation_withoutExpire_success() {
        serialModel.setStatus(LotteryTicketSerialStatus.RESERVED);
        when(lotteryTicketSerialRepositoryPort.findById(SERIAL_ID)).thenReturn(Optional.of(serialModel));
        when(lotteryTicketSerialRepositoryPort.save(any())).thenAnswer(i -> i.getArgument(0));

        LotteryTicketSerialModel result = lotteryTicketSerialService.releaseReservation(SERIAL_ID, false);
        assertThat(result.getStatus()).isEqualTo(LotteryTicketSerialStatus.IN_STOCK);
    }

    @Test
    @DisplayName("[DP-37] findFirstByTicketId")
    void findFirstByTicketId() {
        lotteryTicketSerialService.findFirstByTicketId(TICKET_ID);
        verify(lotteryTicketSerialRepositoryPort).findFirstByTicketIdOrderByIdAsc(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-37] findRepresentativeSerialsByTicketIds")
    void findRepresentativeSerialsByTicketIds() {
        lotteryTicketSerialService.findRepresentativeSerialsByTicketIds(List.of(TICKET_ID));
        verify(lotteryTicketSerialRepositoryPort).findRepresentativeSerialsByTicketIds(List.of(TICKET_ID));
    }

    @Test
    @DisplayName("[DP-37] countAvailableSerials")
    void countAvailableSerials() {
        lotteryTicketSerialService.countAvailableSerials(TICKET_ID);
        verify(lotteryTicketSerialRepositoryPort).countSellableByTicketId(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-37] countByStatuses")
    void countByStatuses() {
        lotteryTicketSerialService.countByStatuses(TICKET_ID, List.of(LotteryTicketSerialStatus.IN_STOCK));
        verify(lotteryTicketSerialRepositoryPort).countByTicketIdAndStatuses(TICKET_ID, List.of(LotteryTicketSerialStatus.IN_STOCK));
    }

    @Test
    @DisplayName("[DP-37] expireActiveSerials")
    void expireActiveSerials() {
        when(lotteryTicketSerialRepositoryPort.findByTicketIdAndStatuses(eq(TICKET_ID), anyList()))
                .thenReturn(List.of(serialModel));
        
        lotteryTicketSerialService.expireActiveSerials(TICKET_ID);
        
        assertThat(serialModel.getStatus()).isEqualTo(LotteryTicketSerialStatus.EXPIRED);
        verify(lotteryTicketSerialRepositoryPort).save(serialModel);
    }

    @Test
    @DisplayName("expireActiveSerials skips VOIDED serials")
    void expireActiveSerials_skipsVoided() {
        serialModel.setTicketCondition(com.daiphat.coreapi.domain.model.enums.lottery.TicketCondition.VOIDED);
        when(lotteryTicketSerialRepositoryPort.findByTicketIdAndStatuses(eq(TICKET_ID), any()))
                .thenReturn(List.of(serialModel));

        lotteryTicketSerialService.expireActiveSerials(TICKET_ID);

        assertThat(serialModel.getStatus()).isEqualTo(LotteryTicketSerialStatus.IN_STOCK);
        verify(lotteryTicketSerialRepositoryPort, never()).save(serialModel);
    }

    @Test
    @DisplayName("[DP-37] findAllByTicketId")
    void findAllByTicketId() {
        lotteryTicketSerialService.findAllByTicketId(TICKET_ID);
        verify(lotteryTicketSerialRepositoryPort).findAllByTicketId(TICKET_ID);
    }

    @Test
    @DisplayName("[DP-37] getStatuses")
    void getStatuses() {
        List<EnumOptionResponse> statuses = lotteryTicketSerialService.getStatuses();
        assertThat(statuses).isNotEmpty();
    }

    // === uploadImage ===

    @Test
    @DisplayName("[DP-37] uploadImage_throwsWhenInvalid")
    void uploadImage_throwsWhenInvalid() {
        UploadRequest req = new UploadRequest("data:application/pdf;base64,...".getBytes(), "test.pdf", "application/pdf", null);
        when(lotteryTicketSerialRepositoryPort.findById(SERIAL_ID)).thenReturn(Optional.of(serialModel));

        assertThatThrownBy(() -> lotteryTicketSerialService.uploadImage(SERIAL_ID, req))
                .isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("[DP-37] uploadImage_success")
    void uploadImage_success() {
        UploadRequest req = new UploadRequest("data:image/png;base64,...".getBytes(), "test.png", "image/png", null);
        when(lotteryTicketSerialRepositoryPort.findById(SERIAL_ID)).thenReturn(Optional.of(serialModel));
        when(storagePort.upload(any())).thenReturn(new StorageResult("id", "url"));
        when(lotteryTicketSerialRepositoryPort.save(any())).thenAnswer(i -> i.getArgument(0));

        LotteryTicketSerialModel result = lotteryTicketSerialService.uploadImage(SERIAL_ID, req);

        assertThat(result.getTicketImg()).isEqualTo("url");
    }

    // === reportFault: the shelf must still be open ===

    /**
     * Cancelling a ticket after its draw date's return sweep has begun would
     * contradict a count that is already being handed to the supplier, so the
     * request is refused before anything is written.
     */
    @Test
    @DisplayName("[DP-37] reportFault_afterReturnSweep_refused")
    void reportFault_afterReturnSweep_refused() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .id(SERIAL_ID)
                .ticketId(TICKET_ID)
                .serialNumber("SN-123")
                .drawDate(LocalDate.of(2026, 8, 17))
                .status(LotteryTicketSerialStatus.IN_STOCK)
                .build();
        when(lotteryTicketSerialRepositoryPort.findById(SERIAL_ID)).thenReturn(Optional.of(serial));
        when(intakeWindowPolicy.isTicketChangeLocked(any(), any(), any())).thenReturn(true);
        when(intakeWindowPolicy.ticketChangeLockedMessage(any(), any(), any()))
                .thenReturn("Đã đến giờ kiểm vé để chuẩn bị trả.");

        ReportSerialFaultRequest request = new ReportSerialFaultRequest(
                TicketCondition.VOIDED, LotteryTicketSerialFaultedBy.DATA_ENTRY_FAULT,
                "Hủy vé", null, null, null);

        assertThatThrownBy(() ->
                lotteryTicketSerialService.reportFault(SERIAL_ID, request, USER_ID))
                .isInstanceOf(DomainException.class)
                .hasMessageContaining("giờ kiểm vé");

        // Nothing was written: the refusal happens before any status change.
        verify(lotteryTicketSerialRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("[DP-37] reportFault_shelfStillOpen_proceeds")
    void reportFault_shelfStillOpen_proceeds() {
        LotteryTicketSerialModel serial = LotteryTicketSerialModel.builder()
                .id(SERIAL_ID)
                .ticketId(TICKET_ID)
                .serialNumber("SN-123")
                .drawDate(LocalDate.of(2026, 8, 17))
                .status(LotteryTicketSerialStatus.IN_STOCK)
                .build();
        when(lotteryTicketSerialRepositoryPort.findById(SERIAL_ID)).thenReturn(Optional.of(serial));
        when(intakeWindowPolicy.isTicketChangeLocked(any(), any(), any())).thenReturn(false);
        when(lotteryTicketSerialRepositoryPort.save(any())).thenAnswer(i -> i.getArgument(0));

        ReportSerialFaultRequest request = new ReportSerialFaultRequest(
                TicketCondition.VOIDED, LotteryTicketSerialFaultedBy.DATA_ENTRY_FAULT,
                "Hủy vé", null, null, null);

        lotteryTicketSerialService.reportFault(SERIAL_ID, request, USER_ID);

        verify(lotteryTicketSerialRepositoryPort).save(any());
    }

}
