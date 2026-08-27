package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultFieldModel;

import java.util.List;
import java.util.Optional;

public interface OcrScanResultFieldRepositoryPort {

    OcrScanResultFieldModel save(OcrScanResultFieldModel model);

    List<OcrScanResultFieldModel> saveAll(List<OcrScanResultFieldModel> models);

    List<OcrScanResultFieldModel> findByOcrScanResultId(Long ocrScanResultId);

    Optional<OcrScanResultFieldModel> findByOcrScanResultIdAndFieldName(
            Long ocrScanResultId,
            OcrTemplateFieldName fieldName
    );

    boolean existsByOcrScanResultId(Long ocrScanResultId);
}
