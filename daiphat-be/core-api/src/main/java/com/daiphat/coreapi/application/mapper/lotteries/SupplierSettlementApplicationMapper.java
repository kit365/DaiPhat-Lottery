package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementResponse;
import com.daiphat.coreapi.domain.model.lotteries.SupplierSettlementModel;
import org.springframework.stereotype.Component;

@Component
public class SupplierSettlementApplicationMapper {

    public SupplierSettlementResponse toResponse(SupplierSettlementModel model) {
        if (model == null) {
            return null;
        }
        return SupplierSettlementResponse.builder()
                .id(model.getId())
                .lotterySupplierId(model.getLotterySupplierId())
                .supplierName(model.getSupplierName())
                .supplierCode(model.getSupplierCode())
                .periodFrom(model.getPeriodFrom())
                .periodTo(model.getPeriodTo())
                .totalImportValue(model.getTotalImportValue())
                .totalReturnValue(model.getTotalReturnValue())
                .totalPaidAmount(model.getTotalPaidAmount())
                .remainingAmount(model.getRemainingAmount())
                .status(model.getStatus())
                .statusLabel(model.getStatus() != null ? model.getStatus().getLabel() : null)
                .transactionId(model.getTransactionId())
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .build();
    }
}
