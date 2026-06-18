package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;

import java.util.List;
import java.util.Optional;

public interface LotteryRegionRepositoryPort {

    Optional<LotteryRegionModel> findByCode(String code);

    List<LotteryRegionModel> findAll();

    LotteryRegionModel save(LotteryRegionModel model);
}
