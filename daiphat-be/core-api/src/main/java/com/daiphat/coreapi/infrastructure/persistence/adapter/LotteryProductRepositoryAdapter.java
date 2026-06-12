package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryProductRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.LotteryProductModel;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryProductStatus;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.LotteryProductPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lottery.LotteryProductRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.LotteryProductSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
@Component
@RequiredArgsConstructor
public class LotteryProductRepositoryAdapter implements LotteryProductRepositoryPort {

    private final LotteryProductRepository lotteryProductRepository;
    private final LotteryProductPersistenceMapper lotteryProductPersistenceMapper;

    @Override
    public LotteryProductModel save(LotteryProductModel model) {
        return lotteryProductPersistenceMapper.toDomain(
                lotteryProductRepository.save(
                        lotteryProductPersistenceMapper.toEntity(model)));
    }

    @Override
    public Optional<LotteryProductModel> findById(Long id) {
        return lotteryProductRepository.findById(id)
                .filter(entity -> entity.getDeletedAt() == null)
                .map(lotteryProductPersistenceMapper::toDomain);
    }

    @Override
    public Page<LotteryProductModel> findAll(Pageable pageable, String search,
                                             LotteryProductStatus status, String type) {
        return lotteryProductRepository.findAll(
                        LotteryProductSpecification.filter(search, status, type),
                        pageable
                )
                .map(lotteryProductPersistenceMapper::toDomain);
    }

    @Override
    public List<LotteryProductModel> findAll() {
        return lotteryProductRepository.findAll().stream()
                .filter(entity -> entity.getDeletedAt() == null)
                .map(lotteryProductPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public void deleteById(Long id) {
        lotteryProductRepository.findById(id).ifPresent(entity -> {
            entity.setDeletedAt(LocalDateTime.now());
            lotteryProductRepository.save(entity);
        });
    }

    @Override
    public boolean existsByName(String name) {
        return lotteryProductRepository.existsByNameAndDeletedAtIsNull(name);
    }


}
