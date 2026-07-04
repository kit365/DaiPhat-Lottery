package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotterySupplierEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface LotterySupplierRepository
        extends JpaRepository<LotterySupplierEntity, Long>, JpaSpecificationExecutor<LotterySupplierEntity> {

    boolean existsByCodeIgnoreCaseAndDeletedAtIsNull(String code);

    boolean existsByCodeIgnoreCaseAndIdNotAndDeletedAtIsNull(String code, Long id);

    Optional<LotterySupplierEntity> findByIdAndDeletedAtIsNull(Long id);

    Optional<LotterySupplierEntity> findByCodeIgnoreCaseAndDeletedAtIsNull(String code);

    boolean existsByIsActiveTrueAndDeletedAtIsNull();
}
