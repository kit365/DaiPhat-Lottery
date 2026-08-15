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
    @Mapping(target = "batchCode", ignore = true)
    @Mapping(target = "declaredCostValue", expression = "java(java.math.BigDecimal.ZERO)")
    @Mapping(target = "totalQuantity", constant = "0")
    @Mapping(target = "totalCostValue", expression = "java(java.math.BigDecimal.ZERO)")
    @Mapping(
            target = "status",
            expression = "java(com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus.OPEN)"
    )
    @Mapping(target = "importedAt", ignore = true)
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

        int resolvedLineCount = model.getLines() != null
                ? model.getActiveLines().size()
                : (model.getLineCount() != null ? model.getLineCount() : 0);

        return ImportBatchResponse.builder()
                .id(model.getId())
                .batchCode(model.getBatchCode())
                .drawDate(model.getDrawDate())
                .supplierId(model.getSupplierId())
                .supplierName(model.getSupplierName())
                .supplierSettlementId(model.getSupplierSettlementId())
                .importMode(model.getImportMode())
                .invoiceEvidenceUrl(model.getInvoiceEvidenceUrl())
                .ticketListImageUrls(model.getTicketListImageUrls() == null
                        ? List.of()
                        : List.copyOf(model.getTicketListImageUrls()))
                .importedBy(model.getImportedBy())
                .importedAt(model.getImportedAt())
                .status(model.getStatus())
                .lineCount(resolvedLineCount)
                .totalDeclareQuantity(model.getTotalDeclareQuantity())
                .totalDeclaredCostValue(model.getTotalDeclaredCostValue())
                .totalImportedQuantity(model.getTotalImportedQuantity())
                .totalImportedCostValue(model.getTotalImportedCostValue())
                .submittedAt(model.getSubmittedAt())
                .completedAt(model.getCompletedAt())
                .ledgerAt(model.getLedgerAt())
                .note(model.getNote())
                .cancelReason(model.getCancelReason())
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
