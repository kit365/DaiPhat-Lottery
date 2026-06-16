package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketSerialRequest;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.infrastructure.persistence.repository.UserRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Component
@Profile("local")
@ConditionalOnProperty(value = "daiphat.lottery.seed.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class LocalLotterySeedInitializer implements ApplicationRunner {

    private static final String STATION_NAME_PREFIX = "Vé số test local";
    private static final String SERIAL_PREFIX = "LOCAL-SEED-";
    private static final DateTimeFormatter DATE_SUFFIX = DateTimeFormatter.BASIC_ISO_DATE;

    private final LotteryStationRepositoryPort lotteryStationRepositoryPort;
    private final LotteryStationServicePort lotteryStationServicePort;
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final LotteryTicketSerialRepository lotteryTicketSerialRepository;
    private final UserRepository userRepository;

    @Value("${daiphat.lottery.seed.tickets-per-station-per-date:12}")
    private int ticketsPerStationPerDate;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedStations();

        UUID operatorId = findSeedOperatorId();
        if (operatorId == null) {
            log.warn("Skip lottery ticket seed because operator account is missing.");
            return;
        }

        List<LotteryStationModel> seedStations = lotteryStationRepositoryPort.findAll().stream()
                .filter(station -> station.getName() != null && station.getName().startsWith(STATION_NAME_PREFIX))
                .toList();

        for (LotteryStationModel station : seedStations) {
            seedTicketsForStation(station, operatorId, LocalDate.now());
            seedTicketsForStation(station, operatorId, LocalDate.now().plusDays(1));
        }
    }

    private void seedStations() {
        for (StationSeed stationSeed : StationSeed.defaults()) {
            if (lotteryStationRepositoryPort.existsByName(stationSeed.name())) {
                continue;
            }

            lotteryStationServicePort.create(CreateLotteryStationRequest.builder()
                    .name(stationSeed.name())
                    .province(stationSeed.province())
                    .region(stationSeed.region())
                    .type(LotteryStationType.TRADITIONAL.name())
                    .numberLength(6)
                    .minNumber(0)
                    .maxNumber(999_999)
                    .price(BigDecimal.valueOf(10_000))
                    .drawDays(stationSeed.drawDays())
                    .drawTime(LocalTime.of(16, 15))
                    .description("Station seed for local manual testing.")
                    .displayOrder(stationSeed.displayOrder())
                    .build());

            log.info("Seeded local lottery station: {}", stationSeed.name());
        }
    }

    private void seedTicketsForStation(LotteryStationModel station, UUID operatorId, LocalDate drawDate) {
        String dailyPrefix = SERIAL_PREFIX + station.getId() + "-" + drawDate.format(DATE_SUFFIX) + "-";
        long existingCount = lotteryTicketSerialRepository
                .findBySerialNumberStartingWithAndDeletedAtIsNull(dailyPrefix)
                .size();

        int nextIndex = 1;
        while (existingCount < ticketsPerStationPerDate) {
            String serialNumber = dailyPrefix + String.format("%03d", nextIndex);
            if (lotteryTicketSerialRepository.findFirstBySerialNumberAndDeletedAtIsNull(serialNumber).isEmpty()) {
                String numbers = String.format("%06d", (station.getId() * 10_000 + nextIndex * 1_357) % 1_000_000);
                String batchCode = "LOCAL-BATCH-" + station.getId() + "-" + drawDate.format(DATE_SUFFIX);

                var created = lotteryTicketServicePort.create(
                        CreateLotteryTicketRequest.builder()
                                .stationId(station.getId())
                                .numbers(numbers)
                                .drawDate(drawDate)
                                .batchCode(batchCode)
                                .serials(List.of(
                                        new CreateLotteryTicketSerialRequest(
                                                "https://picsum.photos/seed/" + serialNumber + "/800/500",
                                                serialNumber
                                        )
                                ))
                                .build(),
                        operatorId
                );

                lotteryTicketServicePort.verify(created.id(), operatorId);
                existingCount++;
            }
            nextIndex++;
        }

        log.info(
                "Ensured {} lottery tickets for station [{}] on draw date {}.",
                ticketsPerStationPerDate,
                station.getName(),
                drawDate
        );
    }

    private UUID findSeedOperatorId() {
        return userRepository.findAllByRole_CodeIn(List.of(RoleConstants.ROLE_STAFF_OPERATOR)).stream()
                .findFirst()
                .map(user -> user.getId())
                .orElse(null);
    }

    private record StationSeed(String name, String province, String region, List<DayOfWeek> drawDays, int displayOrder) {

        static List<StationSeed> defaults() {
            return List.of(
                    new StationSeed(
                            STATION_NAME_PREFIX,
                            "Ho Chi Minh",
                            "MIEN_NAM",
                            List.of(DayOfWeek.values()),
                            0
                    ),
                    new StationSeed(
                            STATION_NAME_PREFIX + " - Miền Trung",
                            "Da Nang",
                            "MIEN_TRUNG",
                            List.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY),
                            1
                    ),
                    new StationSeed(
                            STATION_NAME_PREFIX + " - Miền Bắc",
                            "Hanoi",
                            "MIEN_BAC",
                            List.of(DayOfWeek.MONDAY, DayOfWeek.THURSDAY, DayOfWeek.SATURDAY),
                            2
                    )
            );
        }
    }
}
