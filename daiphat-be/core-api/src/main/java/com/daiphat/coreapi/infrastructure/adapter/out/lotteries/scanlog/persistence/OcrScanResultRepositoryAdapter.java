package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.scanlog.persistence;

import com.daiphat.coreapi.application.port.out.lotteries.OcrScanResultRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.OcrScanResultPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.OcrScanResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class OcrScanResultRepositoryAdapter implements OcrScanResultRepositoryPort {

    private final OcrScanResultRepository ocrScanResultRepository;
    private final OcrScanResultPersistenceMapper ocrScanResultPersistenceMapper;

    @Override
    public OcrScanResultModel save(OcrScanResultModel model) {
        var entity = ocrScanResultPersistenceMapper.toEntity(model);
        return ocrScanResultPersistenceMapper.toDomain(ocrScanResultRepository.save(entity));
    }

    @Override
    public Optional<OcrScanResultModel> findById(Long id) {
        return ocrScanResultRepository.findById(id)
                .filter(entity -> entity.getDeletedAt() == null)
                .map(ocrScanResultPersistenceMapper::toDomain);
    }
}
