package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.SaveLotteryTicketEntryDraftRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.TicketEntryDraftSectionPayload;
import com.daiphat.coreapi.application.dto.request.lotteries.TicketEntryDraftSerialPayload;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketEntryDraftResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketEntryDraftServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchLineRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ImportBatchRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketEntryDraftRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketEntryDraftModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LotteryTicketEntryDraftService implements LotteryTicketEntryDraftServicePort {

    private final LotteryTicketEntryDraftRepositoryPort lotteryTicketEntryDraftRepositoryPort;
    private final ImportBatchLineRepositoryPort importBatchLineRepositoryPort;
    private final ImportBatchRepositoryPort importBatchRepositoryPort;

    @Override
    @Transactional(readOnly = true)
    public List<LotteryTicketEntryDraftResponse> getByImportBatchId(Long importBatchId, UUID operatorId) {
        ImportBatchModel batch = getOwnedEditableBatchOrThrow(importBatchId, operatorId);
        if (batch.getId() == null) {
            return List.of();
        }
        return lotteryTicketEntryDraftRepositoryPort
                .findActiveByImportBatchIdAndOperatorId(batch.getId(), operatorId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public LotteryTicketEntryDraftResponse upsert(SaveLotteryTicketEntryDraftRequest request, UUID operatorId) {
        ImportBatchLineModel line = getEditableLineForOperatorOrThrow(request.importBatchLineId(), operatorId);
        List<TicketEntryDraftSectionPayload> normalizedSections = normalizeSections(request.ticketSections());
        LocalDateTime now = LocalDateTime.now();

        if (normalizedSections.isEmpty()) {
            deleteByImportBatchLineId(line.getId(), operatorId);
            return new LotteryTicketEntryDraftResponse(line.getId(), List.of(), now);
        }

        LotteryTicketEntryDraftModel draft = lotteryTicketEntryDraftRepositoryPort
                .findActiveByImportBatchLineIdAndOperatorId(line.getId(), operatorId)
                .or(() -> lotteryTicketEntryDraftRepositoryPort
                        .findLatestByImportBatchLineIdAndOperatorId(line.getId(), operatorId)
                        .filter(LotteryTicketEntryDraftModel::isDeleted))
                .orElseGet(() -> LotteryTicketEntryDraftModel.builder()
                        .importBatchLineId(line.getId())
                        .operatorId(operatorId)
                        .build());

        if (draft.isDeleted()) {
            draft.revive(now);
        }
        draft.setTicketSections(normalizedSections);
        draft.setUpdatedAt(now);

        LotteryTicketEntryDraftModel saved = lotteryTicketEntryDraftRepositoryPort.save(draft);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void deleteByImportBatchLineId(Long importBatchLineId, UUID operatorId) {
        lotteryTicketEntryDraftRepositoryPort
                .findActiveByImportBatchLineIdAndOperatorId(importBatchLineId, operatorId)
                .ifPresent(draft -> {
                    getEditableLineForOperatorOrThrow(importBatchLineId, operatorId);
                    draft.softDelete(LocalDateTime.now());
                    lotteryTicketEntryDraftRepositoryPort.save(draft);
                });
    }

    private ImportBatchLineModel getEditableLineForOperatorOrThrow(Long importBatchLineId, UUID operatorId) {
        ImportBatchLineModel line = importBatchLineRepositoryPort.findById(importBatchLineId)
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND));
        if (line.isDeleted()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND);
        }
        if (line.getStatus() == ImportBatchLineStatus.CANCELLED) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_LINE_CANCELLED);
        }
        ImportBatchModel batch = getOwnedEditableBatchOrThrow(line.getImportBatchId(), operatorId);
        if (!batch.isEditable()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_INVALID_STATUS);
        }
        return line;
    }

    private ImportBatchModel getOwnedEditableBatchOrThrow(Long importBatchId, UUID operatorId) {
        ImportBatchModel batch = importBatchRepositoryPort.findById(importBatchId)
                .orElseThrow(() -> new DomainException(ErrorCode.IMPORT_BATCH_NOT_FOUND));
        if (batch.getImportedBy() == null || !batch.getImportedBy().equals(operatorId)) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_IMPORT_BATCH_MISMATCH);
        }
        return batch;
    }

    private List<TicketEntryDraftSectionPayload> normalizeSections(List<TicketEntryDraftSectionPayload> sections) {
        if (sections == null || sections.isEmpty()) {
            return List.of();
        }
        List<TicketEntryDraftSectionPayload> normalized = new ArrayList<>();
        for (TicketEntryDraftSectionPayload section : sections) {
            if (section == null) {
                continue;
            }
            String numbers = section.numbers() != null ? section.numbers().trim() : "";
            List<TicketEntryDraftSerialPayload> serials = new ArrayList<>();
            if (section.serials() != null) {
                for (TicketEntryDraftSerialPayload serial : section.serials()) {
                    if (serial == null) {
                        continue;
                    }
                    String serialNumber = serial.serialNumber() != null ? serial.serialNumber().trim() : "";
                    String ticketImg = serial.ticketImg() != null && !serial.ticketImg().isBlank()
                            ? serial.ticketImg().trim()
                            : null;
                    if (!serialNumber.isEmpty() || ticketImg != null) {
                        serials.add(new TicketEntryDraftSerialPayload(serialNumber, ticketImg));
                    }
                }
            }
            if (!numbers.isEmpty() || !serials.isEmpty()) {
                normalized.add(new TicketEntryDraftSectionPayload(numbers, serials));
            }
        }
        return normalized;
    }

    private LotteryTicketEntryDraftResponse toResponse(LotteryTicketEntryDraftModel model) {
        return new LotteryTicketEntryDraftResponse(
                model.getImportBatchLineId(),
                model.getTicketSections() != null ? model.getTicketSections() : List.of(),
                model.getUpdatedAt()
        );
    }
}
