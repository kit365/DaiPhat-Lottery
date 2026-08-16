package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface LotteryStationRepositoryPort {

    LotteryStationModel save(LotteryStationModel model);

    Optional<LotteryStationModel> findById(Long id);

    Page<LotteryStationModel> findAll(
            Pageable pageable,
            String search,
            String type,
            String region,
            String drawDay,
            Boolean isActive
    );

    List<LotteryStationModel> findAll();

    List<LotteryStationModel> findByIds(Collection<Long> ids);

    List<LotteryStationModel> findByNextDrawDate(LocalDate drawDate);

    void deleteById(Long id);

    boolean existsByName(String name);

    boolean existsByCode(String code);

    /** @param excludeStationId station allowed to keep the code, for updates */
    boolean existsByCodeExcluding(String code, Long excludeStationId);

    Optional<LotteryStationModel> findByCode(String code);

    int updateNextDrawDate(Long id, LocalDate nextDrawDate);
}
