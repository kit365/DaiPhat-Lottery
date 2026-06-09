package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryProductModel;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryProductStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LotteryProductRepositoryPort {

    LotteryProductModel save(LotteryProductModel model);

    Optional<LotteryProductModel> findById(UUID id);

    Page<LotteryProductModel> findAll(Pageable pageable, String search, LotteryProductStatus status, String type);

    List<LotteryProductModel> findAll();

    void deleteById(UUID id);

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, UUID id);
}