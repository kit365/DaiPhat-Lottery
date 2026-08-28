package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.scanlog.persistence;

import com.daiphat.coreapi.application.port.out.lotteries.OcrScanResultFieldRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.OcrTemplateFieldName;
import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultFieldModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.OcrScanResultFieldPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.OcrScanResultFieldRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class OcrScanResultFieldRepositoryAdapter implements OcrScanResultFieldRepositoryPort {

    private final OcrScanResultFieldRepository repository;
    private final OcrScanResultFieldPersistenceMapper mapper;

    @Override
    public OcrScanResultFieldModel save(OcrScanResultFieldModel model) {
        return mapper.toDomain(repository.save(mapper.toEntity(model)));
    }

    @Override
    public List<OcrScanResultFieldModel> saveAll(List<OcrScanResultFieldModel> models) {
        return repository.saveAll(models.stream().map(mapper::toEntity).toList()).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public List<OcrScanResultFieldModel> findByOcrScanResultId(Long ocrScanResultId) {
        return repository.findByOcrScanResultIdAndDeletedAtIsNullOrderByFieldNameAsc(ocrScanResultId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public Optional<OcrScanResultFieldModel> findByOcrScanResultIdAndFieldName(
            Long ocrScanResultId,
            OcrTemplateFieldName fieldName
    ) {
        return repository.findByOcrScanResultIdAndFieldNameAndDeletedAtIsNull(ocrScanResultId, fieldName)
                .map(mapper::toDomain);
    }

    @Override
    public boolean existsByOcrScanResultId(Long ocrScanResultId) {
        return repository.existsByOcrScanResultIdAndDeletedAtIsNull(ocrScanResultId);
    }
}
