package com.daiphat.coreapi.infrastructure.config.data;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

/**
 * Canonical 21 Miền Nam lottery stations and weekday draw schedule.
 * Source of truth for local upsert seed (see {@link SouthernLotteryStationSeedInitializer}).
 */
public final class SouthernLotteryStationCatalog {

    public static final String REGION = "MIEN_NAM";
    public static final LocalTime DRAW_TIME = LocalTime.of(16, 15);
    public static final java.math.BigDecimal DEFAULT_PRICE = java.math.BigDecimal.valueOf(10_000);

    private SouthernLotteryStationCatalog() {
    }

    public record StationSeed(String name, String province, List<DayOfWeek> drawDays) {
    }

    public static List<StationSeed> stations() {
        return List.of(
                // Thứ 2
                station("Hồ Chí Minh", DayOfWeek.MONDAY, DayOfWeek.SATURDAY),
                station("Đồng Tháp", DayOfWeek.MONDAY),
                station("Cà Mau", DayOfWeek.MONDAY),
                // Thứ 3
                station("Bến Tre", DayOfWeek.TUESDAY),
                station("Vũng Tàu", DayOfWeek.TUESDAY),
                station("Bạc Liêu", DayOfWeek.TUESDAY),
                // Thứ 4
                station("Đồng Nai", DayOfWeek.WEDNESDAY),
                station("Cần Thơ", DayOfWeek.WEDNESDAY),
                station("Sóc Trăng", DayOfWeek.WEDNESDAY),
                // Thứ 5
                station("Tây Ninh", DayOfWeek.THURSDAY),
                station("An Giang", DayOfWeek.THURSDAY),
                station("Bình Thuận", DayOfWeek.THURSDAY),
                // Thứ 6
                station("Vĩnh Long", DayOfWeek.FRIDAY),
                station("Bình Dương", DayOfWeek.FRIDAY),
                station("Trà Vinh", DayOfWeek.FRIDAY),
                // Thứ 7
                station("Long An", DayOfWeek.SATURDAY),
                station("Bình Phước", DayOfWeek.SATURDAY),
                station("Hậu Giang", DayOfWeek.SATURDAY),
                // Chủ nhật
                station("Tiền Giang", DayOfWeek.SUNDAY),
                station("Kiên Giang", DayOfWeek.SUNDAY),
                station("Đà Lạt", DayOfWeek.SUNDAY)
        );
    }

    private static StationSeed station(String name, DayOfWeek... days) {
        return new StationSeed(name, name, List.of(days));
    }
}
