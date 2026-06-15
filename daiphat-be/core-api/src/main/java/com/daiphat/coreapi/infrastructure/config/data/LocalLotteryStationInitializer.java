package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

@Component
@Profile("local")
@RequiredArgsConstructor
@Slf4j
public class LocalLotteryStationInitializer implements ApplicationRunner {

    private static final String DEFAULT_STATION_NAME = "Vé số test local";

    private final LotteryStationRepositoryPort lotteryStationRepositoryPort;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (lotteryStationRepositoryPort.existsByName(DEFAULT_STATION_NAME)) {
            return;
        }

        lotteryStationRepositoryPort.save(LotteryStationModel.builder()
                .name(DEFAULT_STATION_NAME)
                .province("Ho Chi Minh")
                .region("SOUTH")
                .type(LotteryStationType.TRADITIONAL)
                .numberLength(6)
                .minNumber(0)
                .maxNumber(999999)
                .price(BigDecimal.valueOf(10_000))
                .inventoryCount(0)
                .drawSchedule("Mon-Sun")
                .drawTime("16:15")
                .nextDrawDate(LocalDate.now())
                .status(LotteryStationStatus.ACTIVE)
                .description("Station seed for local manual testing.")
                .displayOrder(0)
                .createdBy("SYSTEM")
                .lastModifiedBy("SYSTEM")
                .build());

        log.info("Seeded local lottery station: {}", DEFAULT_STATION_NAME);
    }
}
