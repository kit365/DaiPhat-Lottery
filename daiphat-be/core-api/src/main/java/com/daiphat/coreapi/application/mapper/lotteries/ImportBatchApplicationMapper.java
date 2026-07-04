package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchLineRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchLineResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchLineModel;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.shared.util.ImportBatchTypeResolver;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.ArrayList;
import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ImportBatchApplicationMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "importBatchId", ignore = true)
    @Mapping(target = "batchType", ignore = true)
    @Mapping(target = "totalQuantity", constant = "0")
    @Mapping(target = "totalCostValue", expression = "java(java.math.BigDecimal.ZERO)")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    ImportBatchLineModel toLineModel(CreateImportBatchLineRequest request);

    ImportBatchLineResponse toLineResponse(ImportBatchLineModel model);

    default ImportBatchResponse toResponse(
            ImportBatchModel model,
            boolean lateImportWarning,
            List<String> warnings
    ) {
        List<ImportBatchLineResponse> lineResponses = model.getLines() == null
                ? List.of()
                : model.getLines().stream().map(this::toLineResponse).toList();

        return ImportBatchResponse.builder()
                .id(model.getId())
                .drawDate(model.getDrawDate())
                .supplierId(model.getSupplierId())
                .supplierName(model.getSupplierName())
                .importedBy(model.getImportedBy())
                .importedAt(model.getImportedAt())
                .status(model.getStatus())
                .totalDeclareQuantity(model.getTotalDeclareQuantity())
                .totalDeclaredCostValue(model.getTotalDeclaredCostValue())
                .lateImportWarning(lateImportWarning)
                .warnings(warnings == null ? List.of() : warnings)
                .lines(lineResponses)
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .build();
    }

    default ImportBatchResponse toResponse(
            ImportBatchModel model,
            ImportBatchTypeResolver.ClassificationResult classification
    ) {
        return toResponse(
                model,
                classification.lateImportWarning(),
                classification.warnings()
        );
    }

    default ImportBatchResponse toResponse(ImportBatchModel model) {
        return toResponse(model, false, new ArrayList<>());
    }
}
