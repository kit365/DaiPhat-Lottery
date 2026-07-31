package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.ReturnBatchLineResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ReturnBatchResponse;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ReturnBatchModel;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ReturnBatchApplicationMapper {

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
        return ReturnBatchResponse.builder()
                .id(model.getId())
                .lotterySupplierId(model.getLotterySupplierId())
                .supplierName(model.getSupplierName())
                .supplierCode(model.getSupplierCode())
                .drawDate(model.getDrawDate())
                .supplierSettlementId(model.getSupplierSettlementId())
                .returnReceiptUrl(model.getReturnReceiptUrl())
                .totalQuantity(model.getTotalQuantity())
                .totalReturnValue(model.getTotalReturnValue())
                .returnedBy(model.getReturnedBy())
                .returnedAt(model.getReturnedAt())
                .confirmedAt(model.getConfirmedAt())
                .status(model.getStatus())
                .statusLabel(model.getStatus() != null ? model.getStatus().getLabel() : null)
                .note(model.getNote())
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
