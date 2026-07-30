package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.InputSource;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
                lotteryTicketSerialIncidentService);

        ticketModel = LotteryTicketModel.builder().id(TICKET_ID).build();
        
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
        when(lotteryTicketSerialRepositoryPort.findFirstByTicketIdAndStatusOrderByIdAsc(TICKET_ID, LotteryTicketSerialStatus.IN_STOCK))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> lotteryTicketSerialService.reserveFirstAvailable(TICKET_ID, UUID.randomUUID(), LocalDateTime.now()))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.LOTTERY_TICKET_INVALID_STATUS);
    }

    @Test
    @DisplayName("[DP-37] reserveFirstAvailable_success")
    void reserveFirstAvailable_success() {
        UUID orderId = UUID.randomUUID();
        when(lotteryTicketSerialRepositoryPort.findFirstByTicketIdAndStatusOrderByIdAsc(TICKET_ID, LotteryTicketSerialStatus.IN_STOCK))
                .thenReturn(Optional.of(serialModel));
        when(lotteryTicketSerialRepositoryPort.save(any())).thenAnswer(i -> i.getArgument(0));

        LotteryTicketSerialModel result = lotteryTicketSerialService.reserveFirstAvailable(TICKET_ID, orderId, LocalDateTime.now());
        assertThat(result.getStatus()).isEqualTo(LotteryTicketSerialStatus.RESERVED);
        assertThat(result.getReservedByOrderId()).isEqualTo(orderId);
    }

    @Test
    @DisplayName("[DP-37] sellFirstAvailable_success")
    void sellFirstAvailable_success() {
        when(lotteryTicketSerialRepositoryPort.findFirstByTicketIdAndStatusOrderByIdAsc(TICKET_ID, LotteryTicketSerialStatus.IN_STOCK))
                .thenReturn(Optional.of(serialModel));
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
        verify(lotteryTicketSerialRepositoryPort).countByTicketIdAndStatuses(eq(TICKET_ID), anyList());
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

}
