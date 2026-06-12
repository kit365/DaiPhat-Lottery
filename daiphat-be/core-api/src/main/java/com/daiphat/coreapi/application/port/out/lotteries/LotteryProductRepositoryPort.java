package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryProductModel;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryProductStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
public interface LotteryProductRepositoryPort {

    LotteryProductModel save(LotteryProductModel model);

    Optional<LotteryProductModel> findById(Long id);

    Page<LotteryProductModel> findAll(Pageable pageable, String search, LotteryProductStatus status, String type);

    List<LotteryProductModel> findAll();

    void deleteById(Long id);

    boolean existsByName(String name);

}
