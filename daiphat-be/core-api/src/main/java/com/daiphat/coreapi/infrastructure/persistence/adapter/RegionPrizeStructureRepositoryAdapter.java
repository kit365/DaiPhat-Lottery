package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.lotteries.RegionPrizeStructureRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.RegionPrizeStructureModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.RegionPrizeStructurePersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.RegionPrizeStructureRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class RegionPrizeStructureRepositoryAdapter implements RegionPrizeStructureRepositoryPort {

    private final RegionPrizeStructureRepository regionPrizeStructureRepository;
    private final RegionPrizeStructurePersistenceMapper regionPrizeStructurePersistenceMapper;

    @Override
    public List<RegionPrizeStructureModel> findByRegion(String region) {
        return regionPrizeStructurePersistenceMapper.toDomainList(
                regionPrizeStructureRepository.findByRegionIgnoreCaseAndDeletedAtIsNullOrderByDisplayOrderAsc(region)
        );
    }

    @Override
    public List<String> findDistinctRegions() {
        return regionPrizeStructureRepository.findDistinctRegions();
    }

    @Override
    public Optional<RegionPrizeStructureModel> findById(Long id) {
        return regionPrizeStructureRepository.findByIdAndDeletedAtIsNull(id)
                .map(regionPrizeStructurePersistenceMapper::toDomain);
    }

    @Override
    public boolean existsByRegionAndPrizeCode(String region, String prizeCode) {
        return regionPrizeStructureRepository.existsByRegionIgnoreCaseAndPrizeCodeIgnoreCaseAndDeletedAtIsNull(
                region, prizeCode);
    }

    @Override
    public boolean existsByRegionAndPrizeCodeExcludingId(String region, String prizeCode, Long excludeId) {
        return regionPrizeStructureRepository.existsByRegionIgnoreCaseAndPrizeCodeIgnoreCaseAndDeletedAtIsNullAndIdNot(
                region, prizeCode, excludeId);
    }

    @Override
    public RegionPrizeStructureModel save(RegionPrizeStructureModel model) {
        return regionPrizeStructurePersistenceMapper.toDomain(
                regionPrizeStructureRepository.save(
                        regionPrizeStructurePersistenceMapper.toEntity(model)));
    }

    @Override
    public List<RegionPrizeStructureModel> saveAll(List<RegionPrizeStructureModel> models) {
        return regionPrizeStructurePersistenceMapper.toDomainList(
                regionPrizeStructureRepository.saveAll(
                        regionPrizeStructurePersistenceMapper.toEntityList(models)));
    }

    @Override
    public void deleteByRegion(String region) {
        regionPrizeStructureRepository.deleteByRegionIgnoreCase(region);
    }
}
