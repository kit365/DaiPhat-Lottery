package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryRegionRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.LotteryStationRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.PrizeStructureRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.lottery.MatchFrom;
import com.daiphat.coreapi.domain.model.enums.lottery.PrizeLevel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.domain.model.lotteries.PrizeStructureModel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Upserts the 21 Miền Nam stations + weekday schedule on startup.
 * Creates missing stations, refreshes schedule, and backfills activation fields
 * (price, commission) for legacy rows. Each station write uses REQUIRES_NEW.
 */
@Component
@Order(50)
@ConditionalOnProperty(
        value = "daiphat.lottery.seed.southern-stations.enabled",
        havingValue = "true",
        matchIfMissing = true
)
@Slf4j
public class SouthernLotteryStationSeedInitializer implements ApplicationRunner {

    private final LotteryStationRepositoryPort lotteryStationRepositoryPort;
    private final LotteryStationServicePort lotteryStationServicePort;
    private final LotteryRegionRepositoryPort lotteryRegionRepositoryPort;
    private final PrizeStructureRepositoryPort prizeStructureRepositoryPort;
    private final TransactionTemplate readTx;
    private final TransactionTemplate writeTx;

    public SouthernLotteryStationSeedInitializer(
            LotteryStationRepositoryPort lotteryStationRepositoryPort,
            LotteryStationServicePort lotteryStationServicePort,
            LotteryRegionRepositoryPort lotteryRegionRepositoryPort,
            PrizeStructureRepositoryPort prizeStructureRepositoryPort,
            PlatformTransactionManager transactionManager
    ) {
        this.lotteryStationRepositoryPort = lotteryStationRepositoryPort;
        this.lotteryStationServicePort = lotteryStationServicePort;
        this.lotteryRegionRepositoryPort = lotteryRegionRepositoryPort;
        this.prizeStructureRepositoryPort = prizeStructureRepositoryPort;
        this.readTx = new TransactionTemplate(transactionManager);
        this.writeTx = new TransactionTemplate(transactionManager);
        this.writeTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Override
    public void run(ApplicationArguments args) {
        LotteryRegionModel region = readTx.execute(status ->
                lotteryRegionRepositoryPort.findByCode(SouthernLotteryStationCatalog.REGION).orElse(null)
        );
        if (region == null) {
            log.warn("Skip southern station seed: region {} not found.", SouthernLotteryStationCatalog.REGION);
            return;
        }

        try {
            writeTx.executeWithoutResult(status -> ensureSouthernPrizeStructures(region));
        } catch (RuntimeException ex) {
            log.warn("Skip southern prize-structure seed: {}", ex.getMessage());
        }

        Map<String, LotteryStationModel> byName = readTx.execute(status ->
                lotteryStationRepositoryPort.findAll().stream()
                        .filter(station -> station.getName() != null && !station.isDeleted())
                        .collect(Collectors.toMap(
                                station -> station.getName().trim().toLowerCase(),
                                Function.identity(),
                                (left, right) -> left
                        ))
        );
        if (byName == null) {
            byName = Map.of();
        }

        int created = 0;
        int updated = 0;
        int skipped = 0;

        for (SouthernLotteryStationCatalog.StationSeed seed : SouthernLotteryStationCatalog.stations()) {
            LotteryStationModel existing = byName.get(seed.name().toLowerCase());
            try {
                if (existing == null) {
                    Long createdId = writeTx.execute(status -> createStation(seed));
                    writeTx.executeWithoutResult(status -> activateStation(createdId, seed));
                    created++;
                    continue;
                }
                if (needsRefresh(existing, seed)) {
                    writeTx.executeWithoutResult(status -> activateStation(existing.getId(), seed));
                    updated++;
                }
            } catch (DomainException ex) {
                skipped++;
                log.warn(
                        "Skip southern station seed for '{}': {} (data={})",
                        seed.name(),
                        ex.getMessage(),
                        ex.getData()
                );
            } catch (RuntimeException ex) {
                skipped++;
                log.warn("Skip southern station seed for '{}': {}", seed.name(), ex.getMessage());
            }
        }

        log.info(
                "Southern lottery station seed finished: {} created, {} refreshed, {} skipped (catalog size={}).",
                created,
                updated,
                skipped,
                SouthernLotteryStationCatalog.stations().size()
        );
    }

    private Long createStation(SouthernLotteryStationCatalog.StationSeed seed) {
        LotteryStationResponse createdStation = lotteryStationServicePort.create(
                CreateLotteryStationRequest.builder()
                        .name(seed.name())
                        .province(seed.province())
                        .region(SouthernLotteryStationCatalog.REGION)
                        .price(SouthernLotteryStationCatalog.DEFAULT_PRICE)
                        .commissionRate(SouthernLotteryStationCatalog.DEFAULT_COMMISSION_RATE)
                        .drawDays(seed.drawDays())
                        .drawTime(SouthernLotteryStationCatalog.DRAW_TIME)
                        .description("Seed lịch quay Xổ số Kiến thiết Miền Nam.")
                        .build()
        );
        return createdStation.id();
    }

    private void activateStation(Long stationId, SouthernLotteryStationCatalog.StationSeed seed) {
        lotteryStationServicePort.update(stationId, activationUpdate(seed));
    }

    private static UpdateLotteryStationRequest activationUpdate(SouthernLotteryStationCatalog.StationSeed seed) {
        return UpdateLotteryStationRequest.builder()
                .name(seed.name())
                .province(seed.province())
                .region(SouthernLotteryStationCatalog.REGION)
                .price(SouthernLotteryStationCatalog.DEFAULT_PRICE)
                .commissionRate(SouthernLotteryStationCatalog.DEFAULT_COMMISSION_RATE)
                .drawDays(seed.drawDays())
                .drawTime(SouthernLotteryStationCatalog.DRAW_TIME)
                .isActive(true)
                .build();
    }

    private boolean needsRefresh(LotteryStationModel existing, SouthernLotteryStationCatalog.StationSeed seed) {
        if (!existing.isActive()) {
            return true;
        }
        if (!existing.isActivationReady()) {
            return true;
        }
        if (!Objects.equals(existing.getProvince(), seed.province())) {
            return true;
        }
        if (!Objects.equals(existing.getDrawTime(), SouthernLotteryStationCatalog.DRAW_TIME)) {
            return true;
        }
        return !sameDrawDays(existing.getDrawDays(), seed.drawDays());
    }

    private static boolean sameDrawDays(List<DayOfWeek> left, List<DayOfWeek> right) {
        if (left == null || right == null) {
            return left == right;
        }
        return new HashSet<>(left).equals(new HashSet<>(right));
    }

    private void ensureSouthernPrizeStructures(LotteryRegionModel region) {
        List<PrizeStructureModel> existing = prizeStructureRepositoryPort.findByRegionCode(region.region());
        if (!existing.isEmpty()) {
            return;
        }

        List<PrizeStructureModel> defaults = southernPrizeDefaults(region);
        prizeStructureRepositoryPort.saveAll(defaults);
        log.info("Seeded {} default prize structures for {}.", defaults.size(), region.region());
    }

    private static List<PrizeStructureModel> southernPrizeDefaults(LotteryRegionModel region) {
        return List.of(
                prize(region, PrizeLevel.SPECIAL, "Giải đặc biệt", "DB", null,
                        bd("2000000000"), 1, 6, MatchFrom.EXACT, MatchFrom.EXACT.getDisplayName(), 0),
                prize(region, PrizeLevel.FIRST, "Giải nhất", "G1", null,
                        bd("30000000"), 1, 5, MatchFrom.LAST, MatchFrom.LAST.getDisplayName(), 1),
                prize(region, PrizeLevel.SECOND, "Giải hai", "G2", null,
                        bd("15000000"), 1, 5, MatchFrom.LAST, MatchFrom.LAST.getDisplayName(), 2),
                prize(region, PrizeLevel.THIRD, "Giải ba", "G3", null,
                        bd("10000000"), 2, 5, MatchFrom.LAST, MatchFrom.LAST.getDisplayName(), 3),
                prize(region, PrizeLevel.FOURTH, "Giải bốn", "G4", null,
                        bd("3000000"), 7, 5, MatchFrom.LAST, MatchFrom.LAST.getDisplayName(), 4),
                prize(region, PrizeLevel.FIFTH, "Giải năm", "G5", null,
                        bd("1000000"), 10, 4, MatchFrom.LAST, MatchFrom.LAST.getDisplayName(), 5),
                prize(region, PrizeLevel.SIXTH, "Giải sáu", "G6", null,
                        bd("400000"), 30, 4, MatchFrom.LAST, MatchFrom.LAST.getDisplayName(), 6),
                prize(region, PrizeLevel.SEVENTH, "Giải bảy", "G7", null,
                        bd("200000"), 100, 3, MatchFrom.LAST, MatchFrom.LAST.getDisplayName(), 7),
                prize(region, PrizeLevel.EIGHTH, "Giải tám", "G8", null,
                        bd("100000"), 1000, 2, MatchFrom.LAST, MatchFrom.LAST.getDisplayName(), 8),
                prize(region, PrizeLevel.SUB_SPECIAL, "Giải phụ đặc biệt", "DB_PHU",
                        "09 giải Phụ đặc biệt dành cho các vé trúng 5 chữ số sau cùng theo thứ tự hàng của giải ĐẶC BIỆT 6 CHỮ SỐ, mỗi giải trị 50.000.000đ",
                        bd("50000000"), 9, 5, MatchFrom.SPECIAL_CONSOLATION_1,
                        MatchFrom.SPECIAL_CONSOLATION_1.getDisplayName(), 9),
                prize(region, PrizeLevel.CONSOLATION, "Giải khuyến khích", "KK",
                        "45 giải Khuyến khích dành cho những vé chỉ sai 01 số ở bất cứ hàng nào so với giải ĐẶC BIỆT 6 CHỮ SỐ (ngoại trừ sai chữ số hàng trăm ngàn), mỗi giải trị giá 6.000.000đ",
                        bd("6000000"), 45, 5, MatchFrom.SPECIAL_CONSOLATION_2,
                        MatchFrom.SPECIAL_CONSOLATION_2.getDisplayName(), 10)
        );
    }

    private static PrizeStructureModel prize(
            LotteryRegionModel region,
            PrizeLevel level,
            String displayName,
            String code,
            String description,
            BigDecimal value,
            int quantity,
            int matchDigits,
            MatchFrom matchFrom,
            String matchFromDisplayName,
            int displayOrder
    ) {
        return PrizeStructureModel.builder()
                .regionId(region.getId())
                .regionCode(region.region())
                .prizeLevel(level)
                .prizeDisplayName(displayName)
                .prizeCode(code)
                .description(description)
                .prizeValue(value)
                .quantity(quantity)
                .matchDigits(matchDigits)
                .matchFrom(matchFrom)
                .matchFromDisplayName(matchFromDisplayName)
                .displayOrder(displayOrder)
                .isActive(true)
                .build();
    }

    private static BigDecimal bd(String value) {
        return new BigDecimal(value);
    }
}
