package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.SaveLotteryTicketEntryDraftRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.TicketEntryDraftSectionPayload;
import com.daiphat.coreapi.application.dto.request.lotteries.TicketEntryDraftSerialPayload;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketEntryDraftRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketEntryDraftModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("LotteryTicketEntryDraftService tests")
class LotteryTicketEntryDraftServiceTest {

    private static final UUID OPERATOR_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    @Mock
    private LotteryTicketEntryDraftRepositoryPort lotteryTicketEntryDraftRepositoryPort;
    @Mock
    private ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    @Mock
    private ImportBatchRepositoryPort importBatchRepositoryPort;

    @InjectMocks
    private LotteryTicketEntryDraftService service;

    @Test
    @DisplayName("upsert saves normalized draft for editable line owned by operator")
    void upsert_savesDraft() {
        ImportBatchLineModel line = editableLine(1L, 10L);
        when(importBatchLineRepositoryPort.findById(1L)).thenReturn(Optional.of(line));
        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(editableBatch(10L)));
        when(lotteryTicketEntryDraftRepositoryPort.findActiveByImportBatchLineIdAndOperatorId(1L, OPERATOR_ID))
                .thenReturn(Optional.empty());
        when(lotteryTicketEntryDraftRepositoryPort.findLatestByImportBatchLineIdAndOperatorId(1L, OPERATOR_ID))
                .thenReturn(Optional.empty());
        when(lotteryTicketEntryDraftRepositoryPort.save(any())).thenAnswer(invocation -> {
            LotteryTicketEntryDraftModel model = invocation.getArgument(0);
            model.setId(99L);
            model.setUpdatedAt(LocalDateTime.now());
            return model;
        });

        var request = new SaveLotteryTicketEntryDraftRequest(
                1L,
                List.of(new TicketEntryDraftSectionPayload(
                        "123456",
                        List.of(new TicketEntryDraftSerialPayload("001", null))
                ))
        );

        var response = service.upsert(request, OPERATOR_ID);

        assertThat(response.importBatchLineId()).isEqualTo(1L);
        assertThat(response.ticketSections()).hasSize(1);
        assertThat(response.ticketSections().getFirst().numbers()).isEqualTo("123456");
        verify(lotteryTicketEntryDraftRepositoryPort).save(any(LotteryTicketEntryDraftModel.class));
    }

    @Test
    @DisplayName("upsert rejects cancelled line")
    void upsert_cancelledLine_throws() {
        ImportBatchLineModel line = editableLine(1L, 10L);
        line.setStatus(ImportBatchLineStatus.CANCELLED);
        when(importBatchLineRepositoryPort.findById(1L)).thenReturn(Optional.of(line));

        var request = new SaveLotteryTicketEntryDraftRequest(
                1L,
                List.of(new TicketEntryDraftSectionPayload("123456", List.of()))
        );

        assertThatThrownBy(() -> service.upsert(request, OPERATOR_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.IMPORT_BATCH_LINE_CANCELLED);
    }

    @Test
    @DisplayName("upsert rejects batch owned by another operator")
    void upsert_wrongOperator_throws() {
        ImportBatchLineModel line = editableLine(1L, 10L);
        ImportBatchModel batch = editableBatch(10L);
        batch.setImportedBy(UUID.randomUUID());
        when(importBatchLineRepositoryPort.findById(1L)).thenReturn(Optional.of(line));
        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(batch));

        var request = new SaveLotteryTicketEntryDraftRequest(
                1L,
                List.of(new TicketEntryDraftSectionPayload("123456", List.of()))
        );

        assertThatThrownBy(() -> service.upsert(request, OPERATOR_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.LOTTERY_TICKET_IMPORT_BATCH_MISMATCH);
    }

    @Test
    @DisplayName("delete soft-deletes active draft")
    void delete_softDeletesDraft() {
        ImportBatchLineModel line = editableLine(1L, 10L);
        LotteryTicketEntryDraftModel draft = LotteryTicketEntryDraftModel.builder()
                .id(5L)
                .importBatchLineId(1L)
                .operatorId(OPERATOR_ID)
                .ticketSections(List.of())
                .build();
        when(lotteryTicketEntryDraftRepositoryPort.findActiveByImportBatchLineIdAndOperatorId(1L, OPERATOR_ID))
                .thenReturn(Optional.of(draft));
        when(importBatchLineRepositoryPort.findById(1L)).thenReturn(Optional.of(line));
        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(editableBatch(10L)));
        when(lotteryTicketEntryDraftRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.deleteByImportBatchLineId(1L, OPERATOR_ID);

        ArgumentCaptor<LotteryTicketEntryDraftModel> captor =
                ArgumentCaptor.forClass(LotteryTicketEntryDraftModel.class);
        verify(lotteryTicketEntryDraftRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().isDeleted()).isTrue();
    }

    @Test
    @DisplayName("getByImportBatchId returns active drafts for owned batch")
    void getByImportBatchId_returnsDrafts() {
        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(editableBatch(10L)));
        when(lotteryTicketEntryDraftRepositoryPort.findActiveByImportBatchIdAndOperatorId(10L, OPERATOR_ID))
                .thenReturn(List.of(LotteryTicketEntryDraftModel.builder()
                        .importBatchLineId(1L)
                        .operatorId(OPERATOR_ID)
                        .ticketSections(List.of(new TicketEntryDraftSectionPayload("111111", List.of())))
                        .updatedAt(LocalDateTime.now())
                        .build()));

        var drafts = service.getByImportBatchId(10L, OPERATOR_ID);

        assertThat(drafts).hasSize(1);
        assertThat(drafts.getFirst().importBatchLineId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("upsert with empty sections deletes existing draft")
    void upsert_emptySections_deletesDraft() {
        ImportBatchLineModel line = editableLine(1L, 10L);
        LotteryTicketEntryDraftModel draft = LotteryTicketEntryDraftModel.builder()
                .id(5L)
                .importBatchLineId(1L)
                .operatorId(OPERATOR_ID)
                .ticketSections(List.of(new TicketEntryDraftSectionPayload("1", List.of())))
                .build();
        when(importBatchLineRepositoryPort.findById(1L)).thenReturn(Optional.of(line));
        when(importBatchRepositoryPort.findById(10L)).thenReturn(Optional.of(editableBatch(10L)));
        when(lotteryTicketEntryDraftRepositoryPort.findActiveByImportBatchLineIdAndOperatorId(1L, OPERATOR_ID))
                .thenReturn(Optional.of(draft));
        when(lotteryTicketEntryDraftRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.upsert(new SaveLotteryTicketEntryDraftRequest(1L, List.of()), OPERATOR_ID);

        assertThat(response.ticketSections()).isEmpty();
        verify(lotteryTicketEntryDraftRepositoryPort).save(any());
    }

    private static ImportBatchLineModel editableLine(Long lineId, Long batchId) {
        return ImportBatchLineModel.builder()
                .id(lineId)
                .importBatchId(batchId)
                .lotteryStationId(100L)
                .status(ImportBatchLineStatus.OPEN)
                .build();
    }

    private static ImportBatchModel editableBatch(Long batchId) {
        return ImportBatchModel.builder()
                .id(batchId)
                .importedBy(OPERATOR_ID)
                .status(ImportBatchStatus.RECEIVING)
                .build();
    }
}
