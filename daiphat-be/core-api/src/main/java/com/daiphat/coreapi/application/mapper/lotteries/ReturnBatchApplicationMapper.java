package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.ReturnBatchLineResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ReturnBatchResponse;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import com.daiphat.coreapi.shared.util.ImportBatchConfigResolver;
import com.daiphat.coreapi.shared.util.ReturnBatchCutoffTiming;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ReturnBatchApplicationMapper {

    private final ImportBatchConfigResolver importBatchConfigResolver;
    private final Clock clock;

    public ReturnBatchResponse toResponse(ReturnBatchModel model) {
        return toResponse(model, null);
    }

    public ReturnBatchResponse toResponse(ReturnBatchModel model, List<ReturnBatchLineResponse> lines) {
        if (model == null) {
            return null;
        }
        List<ReturnBatchLineResponse> lineResponses = lines != null
                ? lines
                : (model.getLines() == null
                ? List.of()
                : model.getLines().stream().map(this::toLineResponse).toList());

        int bufferMinutes = importBatchConfigResolver.resolveReturnBufferMinutes();
        int reminderMinutes = importBatchConfigResolver.resolveReturnReminderMinutes();
        LocalDateTime now = LocalDateTime.now(clock);
        boolean cancelled = model.getStatus() != null && model.getStatus().isCancelled();
        boolean pastCutoff = ReturnBatchCutoffTiming.isPastCutoff(
                model.getDrawDate(),
                model.getReturnCutOffTime(),
                now
        );
        boolean openForInspection = model.getStatus() != null && model.getStatus().isOpenForInspection();
        boolean inspectionExpired = cancelled || (openForInspection && pastCutoff);
        boolean inWindow = openForInspection && !pastCutoff && ReturnBatchCutoffTiming.isInInspectionWindow(
                model.getDrawDate(),
                model.getReturnCutOffTime(),
                now,
                bufferMinutes
        );
        boolean urgent = openForInspection && !pastCutoff && ReturnBatchCutoffTiming.isInUrgentReminderWindow(
                model.getDrawDate(),
                model.getReturnCutOffTime(),
                now,
                reminderMinutes
        );

        return ReturnBatchResponse.builder()
                .id(model.getId())
                .batchCode(model.getBatchCode())
                .lotterySupplierId(model.getLotterySupplierId())
                .supplierName(model.getSupplierName())
                .supplierCode(model.getSupplierCode())
                .drawDate(model.getDrawDate())
                .supplierSettlementId(model.getSupplierSettlementId())
                .returnReceiptUrl(model.getReturnReceiptUrl())
                .returnReceiptEvidenceUrl(model.getReturnReceiptEvidenceUrl())
                .deliveryMode(model.getDeliveryMode())
                .deliveryModeLabel(model.getDeliveryMode() != null ? model.getDeliveryMode().getLabel() : null)
                .totalQuantity(model.getTotalQuantity())
                .totalReturnValue(model.getTotalReturnValue())
                .returnedBy(model.getReturnedBy())
                .returnedAt(model.getReturnedAt())
                .confirmedAt(model.getConfirmedAt())
                .status(model.getStatus())
                .statusLabel(model.getStatus() != null ? model.getStatus().getLabel() : null)
                .note(model.getNote())
                .cancelReason(model.getCancelReason())
                .cancelledAt(model.getCancelledAt())
                .returnCutOffTime(model.getReturnCutOffTime())
                .returnBufferMinutes(bufferMinutes)
                .returnReminderMinutes(reminderMinutes)
                .inspectionWindowStartAt(ReturnBatchCutoffTiming.inspectionWindowStartAt(
                        model.getDrawDate(), model.getReturnCutOffTime(), bufferMinutes))
                .reminderTriggerAt(ReturnBatchCutoffTiming.reminderTriggerAt(
                        model.getDrawDate(), model.getReturnCutOffTime(), reminderMinutes))
                .returnCutOffAt(ReturnBatchCutoffTiming.cutoffAt(
                        model.getDrawDate(), model.getReturnCutOffTime()))
                .minutesUntilCutoff(ReturnBatchCutoffTiming.minutesUntilCutoff(
                        model.getDrawDate(), model.getReturnCutOffTime(), now))
                .inspectionExpired(inspectionExpired)
                .inInspectionWindow(inWindow)
                .urgentReminder(urgent)
                .lines(lineResponses)
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .build();
    }

    public ReturnBatchLineResponse toLineResponse(ReturnBatchLineModel model) {
        return toLineResponse(model, null);
    }

    public ReturnBatchLineResponse toLineResponse(ReturnBatchLineModel model, Long attachedSerialCount) {
        if (model == null) {
            return null;
        }
        return ReturnBatchLineResponse.builder()
                .id(model.getId())
                .returnBatchId(model.getReturnBatchId())
                .lotteryStationId(model.getLotteryStationId())
                .lotteryStationName(model.getLotteryStationName())
                .status(model.getStatus())
                .statusLabel(model.getStatus() != null ? model.getStatus().getLabel() : null)
                .totalQuantity(model.getTotalQuantity())
                .totalReturnValue(model.getTotalReturnValue())
                .attachedSerialCount(attachedSerialCount)
                .build();
    }
}
