package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotterySupplierRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotterySupplierRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotterySupplierResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import org.springframework.stereotype.Component;

@Component
public class LotterySupplierApplicationMapper {

    public LotterySupplierModel toModel(CreateLotterySupplierRequest request) {
        LotterySupplierModel model = LotterySupplierModel.builder()
                .name(trimToNull(request.name()))
                .code(normalizeCode(request.code()))
                .type(request.type())
                .contactName(trimToNull(request.contactName()))
                .contactPhone(trimToNull(request.contactPhone()))
                .contactEmail(trimToNull(request.contactEmail()))
                .address(trimToNull(request.address()))
                .taxCode(trimToNull(request.taxCode()))
                .paymentTermDays(request.paymentTermDays())
                .defaultImportCost(request.defaultImportCost())
                .isActive(false)
                .build();
        model.applyIsActive(request.isActive() == null || Boolean.TRUE.equals(request.isActive()));
        return model;
    }

    public void updateModel(LotterySupplierModel model, UpdateLotterySupplierRequest request) {
        model.setName(trimToNull(request.name()));
        model.setCode(normalizeCode(request.code()));
        model.setType(request.type());
        model.setContactName(trimToNull(request.contactName()));
        model.setContactPhone(trimToNull(request.contactPhone()));
        model.setContactEmail(trimToNull(request.contactEmail()));
        model.setAddress(trimToNull(request.address()));
        model.setTaxCode(trimToNull(request.taxCode()));
        model.setPaymentTermDays(request.paymentTermDays());
        model.setDefaultImportCost(request.defaultImportCost());
        model.applyIsActive(request.isActive());
    }

    public LotterySupplierResponse toResponse(LotterySupplierModel model) {
        return LotterySupplierResponse.builder()
                .id(model.getId())
                .name(model.getName())
                .code(model.getCode())
                .type(model.getType())
                .typeLabel(model.getType() != null ? model.getType().getLabel() : null)
                .contactName(model.getContactName())
                .contactPhone(model.getContactPhone())
                .contactEmail(model.getContactEmail())
                .address(model.getAddress())
                .taxCode(model.getTaxCode())
                .paymentTermDays(model.getPaymentTermDays())
                .defaultImportCost(model.getDefaultImportCost())
                .isActive(model.isActive())
                .missingActivationFields(model.getMissingActivationFields())
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .build();
    }

    private String normalizeCode(String code) {
        return code == null ? null : code.trim().toUpperCase();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
