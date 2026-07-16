package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.region;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryRegionRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.LotteryRegionPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryRegionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class LotteryRegionRepositoryAdapter implements LotteryRegionRepositoryPort {

    private final LotteryRegionRepository lotteryRegionRepository;
    private final LotteryRegionPersistenceMapper lotteryRegionPersistenceMapper;

    @Override
    public Optional<LotteryRegionModel> findByCode(String code) {
        return lotteryRegionRepository.findByCodeIgnoreCase(code)
                .map(lotteryRegionPersistenceMapper::toDomain);
    }

    @Override
    public List<LotteryRegionModel> findAll() {
        return lotteryRegionRepository.findAll().stream()
                .map(lotteryRegionPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public LotteryRegionModel save(LotteryRegionModel model) {
        return lotteryRegionPersistenceMapper.toDomain(
                lotteryRegionRepository.save(lotteryRegionPersistenceMapper.toEntity(model))
        );
    }
}
