package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Arrays;


@Component
@Profile("local")
@RequiredArgsConstructor
@Slf4j
public class LocalLotteryStationInitializer implements ApplicationRunner {

    private static final String DEFAULT_STATION_NAME = "Vé số test local";

    private final LotteryStationRepositoryPort lotteryStationRepositoryPort;
    private final LotteryStationServicePort lotteryStationServicePort;

    @Override
    public void run(ApplicationArguments args) {
        if (lotteryStationRepositoryPort.existsByName(DEFAULT_STATION_NAME)) {
            return;
        }

        lotteryStationServicePort.create(CreateLotteryStationRequest.builder()
                .name(DEFAULT_STATION_NAME)
                .province("Ho Chi Minh")
                .region("MIEN_NAM")
                .type(LotteryStationType.TRADITIONAL.name())
                .numberLength(6)
                .minNumber(0)
                .maxNumber(999999)
                .price(BigDecimal.valueOf(10_000))
                .drawDays(Arrays.asList(DayOfWeek.values()))
                .drawTime(LocalTime.of(16, 15))
                .description("Station seed for local manual testing.")
                .displayOrder(0)
                .build());

        log.info("Seeded local lottery station: {}", DEFAULT_STATION_NAME);
    }
}
