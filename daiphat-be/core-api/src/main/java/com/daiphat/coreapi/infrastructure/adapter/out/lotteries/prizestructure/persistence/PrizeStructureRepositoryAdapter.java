package com.daiphat.coreapi.infrastructure.adapter.out;

import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeStructureEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.PrizeStructurePersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.PrizeStructureRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class PrizeStructureRepositoryAdapter implements PrizeStructureRepositoryPort {

    private final PrizeStructureRepository prizeStructureRepository;
    private final PrizeStructurePersistenceMapper prizeStructurePersistenceMapper;

    @Override
    public List<PrizeStructureModel> findByRegionCode(String regionCode) {
        List<PrizeStructureEntity> entities = prizeStructureRepository
                .findByRegion_CodeIgnoreCaseAndDeletedAtIsNullOrderByDisplayOrderAsc(regionCode);
        return prizeStructurePersistenceMapper.toDomainList(entities);
    }

    @Override
    public List<String> findDistinctRegionCodes() {
        return prizeStructureRepository.findDistinctRegionCodes();
    }

    @Override
    public Optional<PrizeStructureModel> findById(Long id) {
        return prizeStructureRepository.findByIdAndDeletedAtIsNull(id)
                .map(prizeStructurePersistenceMapper::toDomain);
    }

    @Override
    public boolean existsByRegionCodeAndPrizeCode(String regionCode, String prizeCode) {
        return prizeStructureRepository.existsByRegion_CodeIgnoreCaseAndPrizeCodeIgnoreCaseAndDeletedAtIsNull(
                regionCode, prizeCode
        );
    }

    @Override
    public boolean existsByRegionCodeAndPrizeCodeExcludingId(String regionCode, String prizeCode, Long excludeId) {
        return prizeStructureRepository.existsByRegion_CodeIgnoreCaseAndPrizeCodeIgnoreCaseAndDeletedAtIsNullAndIdNot(
                regionCode, prizeCode, excludeId
        );
    }

    @Override
    public PrizeStructureModel save(PrizeStructureModel model) {
        return prizeStructurePersistenceMapper.toDomain(
                prizeStructureRepository.save(prizeStructurePersistenceMapper.toEntity(model))
        );
    }

    @Override
    public List<PrizeStructureModel> saveAll(List<PrizeStructureModel> models) {
        List<PrizeStructureEntity> entities = prizeStructurePersistenceMapper.toEntityList(models);
        List<PrizeStructureEntity> saved = prizeStructureRepository.saveAll(entities);
        return prizeStructurePersistenceMapper.toDomainList(saved);
    }

    @Override
    public void deleteById(Long id) {
        prizeStructureRepository.deleteById(id);
    }

    @Override
    public void deleteByRegionCode(String regionCode) {
        prizeStructureRepository.deleteByRegion_CodeIgnoreCase(regionCode);
    }
}
