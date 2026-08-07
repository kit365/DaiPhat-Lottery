package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultModel;

import java.util.Optional;

public interface OcrScanResultRepositoryPort {

    OcrScanResultModel save(OcrScanResultModel model);

    Optional<OcrScanResultModel> findById(Long id);
}
