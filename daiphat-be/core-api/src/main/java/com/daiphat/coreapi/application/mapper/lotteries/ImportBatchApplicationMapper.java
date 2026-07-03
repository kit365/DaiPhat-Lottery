package com.daiphat.coreapi.application.mapper.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.shared.util.ImportBatchTimePolicy;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ImportBatchApplicationMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "batchType", ignore = true)
    @Mapping(target = "supplierLedgerId", ignore = true)
    @Mapping(target = "totalQuantity", ignore = true)
    @Mapping(target = "totalCostValue", ignore = true)
    @Mapping(target = "importedBy", ignore = true)
    @Mapping(target = "importedAt", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    ImportBatchModel toModel(CreateImportBatchRequest request);

    @Mapping(target = "lateImportWarning", source = "lateImportWarning")
    @Mapping(target = "warnings", source = "warnings")
    ImportBatchResponse toResponse(ImportBatchModel model, boolean lateImportWarning, List<String> warnings);

    default ImportBatchResponse toResponse(
            ImportBatchModel model,
            ImportBatchTimePolicy.ClassificationResult classification
    ) {
        return toResponse(
                model,
                classification.lateImportWarning(),
                classification.warnings()
        );
    }
}
