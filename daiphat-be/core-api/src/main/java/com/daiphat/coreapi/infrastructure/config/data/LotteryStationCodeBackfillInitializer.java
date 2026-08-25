package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryStationRepository;
import com.daiphat.coreapi.shared.util.LotteryStationCodeGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Gives a business code to stations created before codes existed.
 *
 * <p>Runs through the same generator as the station form, so a code backfilled
 * here is indistinguishable from one created by hand. Idempotent: stations that
 * already have a code are left alone, so it is a no-op on every later start-up.
 */
@Component
@RequiredArgsConstructor
@Order(15)
@Slf4j
public class LotteryStationCodeBackfillInitializer implements ApplicationRunner {

    private final LotteryStationRepository lotteryStationRepository;
    private final LotteryStationCodeGenerator lotteryStationCodeGenerator;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<LotteryStationEntity> stations = lotteryStationRepository.findAll();

        Set<String> usedCodes = stations.stream()
                .map(LotteryStationEntity::getCode)
                .filter(code -> code != null && !code.isBlank())
                .collect(java.util.stream.Collectors.toCollection(HashSet::new));

        int assigned = 0;
        for (LotteryStationEntity station : stations) {
            if (station.getDeletedAt() != null
                    || (station.getCode() != null && !station.getCode().isBlank())) {
                continue;
            }

            String code = lotteryStationCodeGenerator.generate(station.getName(), usedCodes::contains);
            if (code == null) {
                log.warn("Could not derive a code for stationId={} name={}",
                        station.getId(), station.getName());
                continue;
            }

            station.setCode(code);
            usedCodes.add(code);
            lotteryStationRepository.save(station);
            assigned++;
        }

        if (assigned > 0) {
            log.info("Backfilled codes for {} lottery station(s)", assigned);
        }
    }
}
