package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
public interface LotteryStationRepositoryPort {

    LotteryStationModel save(LotteryStationModel model);

    Optional<LotteryStationModel> findById(Long id);

    Page<LotteryStationModel> findAll(Pageable pageable, String search, LotteryStationStatus status, String type);

    List<LotteryStationModel> findAll();

    List<LotteryStationModel> findByNextDrawDate(LocalDate drawDate);

    void deleteById(Long id);

    boolean existsByName(String name);

}
