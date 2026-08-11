package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.supplier.persistence;

import com.daiphat.coreapi.application.port.out.lotteries.LotterySupplierRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.LotterySupplierPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotterySupplierRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.lotteries.LotterySupplierSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class LotterySupplierRepositoryAdapter implements LotterySupplierRepositoryPort {

    private final LotterySupplierRepository lotterySupplierRepository;
    private final LotterySupplierPersistenceMapper lotterySupplierPersistenceMapper;

    @Override
    public LotterySupplierModel save(LotterySupplierModel model) {
        return lotterySupplierPersistenceMapper.toDomain(
                lotterySupplierRepository.save(lotterySupplierPersistenceMapper.toEntity(model))
        );
    }

    @Override
    public Optional<LotterySupplierModel> findById(Long id) {
        return lotterySupplierRepository.findByIdAndDeletedAtIsNull(id)
                .map(lotterySupplierPersistenceMapper::toDomain);
    }

    @Override
    public Optional<LotterySupplierModel> findByCode(String code) {
        return lotterySupplierRepository.findByCodeIgnoreCaseAndDeletedAtIsNull(code)
                .map(lotterySupplierPersistenceMapper::toDomain);
    }

    @Override
    public boolean existsByCode(String code) {
        return lotterySupplierRepository.existsByCodeIgnoreCaseAndDeletedAtIsNull(code);
    }

    @Override
    public boolean existsByCodeAndIdNot(String code, Long id) {
        return lotterySupplierRepository.existsByCodeIgnoreCaseAndIdNotAndDeletedAtIsNull(code, id);
    }

    @Override
    public Page<LotterySupplierModel> findAll(Pageable pageable, String search, Boolean isActive) {
        return lotterySupplierRepository
                .findAll(LotterySupplierSpecification.filter(search, isActive), pageable)
                .map(lotterySupplierPersistenceMapper::toDomain);
    }

    @Override
    public List<LotterySupplierModel> findAllActive() {
        return lotterySupplierRepository.findByIsActiveTrueAndDeletedAtIsNull().stream()
                .map(lotterySupplierPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public List<LotterySupplierModel> findAllNotDeleted() {
        return lotterySupplierRepository.findByDeletedAtIsNull().stream()
                .map(lotterySupplierPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public boolean existsActive() {
        return lotterySupplierRepository.existsByIsActiveTrueAndDeletedAtIsNull();
    }
}
