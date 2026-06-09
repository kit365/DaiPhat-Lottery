package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.PrizeStructureEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.PrizeStructurePersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lottery.PrizeStructureRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PrizeStructureRepositoryAdapter implements PrizeStructureRepositoryPort {

    private final PrizeStructureRepository prizeStructureRepository;
    private final PrizeStructurePersistenceMapper prizeStructurePersistenceMapper;

    @Override
    public List<PrizeStructureModel> findByProductId(UUID productId) {
        List<PrizeStructureEntity> entities = prizeStructureRepository.findByProductIdOrderByDisplayOrderAsc(productId);
        return prizeStructurePersistenceMapper.toDomainList(entities);
    }

    @Override
    public List<PrizeStructureModel> saveAll(UUID productId, List<PrizeStructureModel> models) {
        List<PrizeStructureEntity> entities = prizeStructurePersistenceMapper.toEntityList(models);
        List<PrizeStructureEntity> saved = prizeStructureRepository.saveAll(entities);
        return prizeStructurePersistenceMapper.toDomainList(saved);
    }

    @Override
    public void deleteByProductId(UUID productId) {
        prizeStructureRepository.deleteByProductId(productId);
    }
}
