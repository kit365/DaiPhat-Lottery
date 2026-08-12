package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotterySupplierModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface LotterySupplierRepositoryPort {

    LotterySupplierModel save(LotterySupplierModel model);

    Optional<LotterySupplierModel> findById(Long id);

    Optional<LotterySupplierModel> findByCode(String code);

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    Page<LotterySupplierModel> findAll(Pageable pageable, String search, Boolean isActive);

    List<LotterySupplierModel> findAllActive();

    List<LotterySupplierModel> findAllNotDeleted();

    boolean existsActive();
}
