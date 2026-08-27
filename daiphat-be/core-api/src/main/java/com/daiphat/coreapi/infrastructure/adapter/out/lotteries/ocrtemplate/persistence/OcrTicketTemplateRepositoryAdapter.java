package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.ocrtemplate.persistence;

import com.daiphat.coreapi.application.port.out.lotteries.OcrTicketTemplateRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.OcrTicketTemplateModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrTicketTemplateEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.OcrTicketTemplatePersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.OcrTicketTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class OcrTicketTemplateRepositoryAdapter implements OcrTicketTemplateRepositoryPort {

    private final OcrTicketTemplateRepository repository;
    private final OcrTicketTemplatePersistenceMapper mapper;

    @Override
    public OcrTicketTemplateModel save(OcrTicketTemplateModel model) {
        OcrTicketTemplateEntity saved = repository.save(mapper.toEntity(model));
        return mapper.toDomain(saved);
    }

    @Override
    public Optional<OcrTicketTemplateModel> findById(Long id) {
        return repository.findByIdAndDeletedAtIsNull(id).map(mapper::toDomain);
    }

    @Override
    public List<OcrTicketTemplateModel> findByStationId(Long stationId) {
        return repository.findByStationIdAndDeletedAtIsNullOrderByIsDefaultDescTemplateNameAsc(stationId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public Optional<OcrTicketTemplateModel> findDefaultByStationId(Long stationId) {
        return repository.findByStationIdAndIsDefaultTrueAndDeletedAtIsNull(stationId).map(mapper::toDomain);
    }

    @Override
    public boolean existsActiveDefault() {
        return repository.existsActiveDefault();
    }

    @Override
    public long countActiveDefaults() {
        return repository.countByIsDefaultTrueAndActiveTrueAndDeletedAtIsNull();
    }

    @Override
    @Transactional
    public void clearDefaultsForStation(Long stationId, Long excludeId) {
        repository.clearDefaultsForStation(stationId, excludeId);
    }

    @Override
    public Optional<OcrTicketTemplateModel> resolveForStation(Long stationId, LocalDate drawDate) {
        if (stationId == null) {
            return Optional.empty();
        }
        if (drawDate != null) {
            List<OcrTicketTemplateEntity> effective =
                    repository.findEffectiveForStationOnDate(stationId, drawDate);
            if (!effective.isEmpty()) {
                return Optional.of(mapper.toDomain(effective.get(0)));
            }
        }
        return findDefaultByStationId(stationId)
                .filter(OcrTicketTemplateModel::isActive);
    }
}
