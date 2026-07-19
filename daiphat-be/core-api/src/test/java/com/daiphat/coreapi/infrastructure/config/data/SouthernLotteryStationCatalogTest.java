package com.daiphat.coreapi.infrastructure.config.data;

import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SouthernLotteryStationCatalogTest {

    @Test
    void stations_shouldContainExactly21UniqueSouthernStations() {
        var stations = SouthernLotteryStationCatalog.stations();
        assertEquals(21, stations.size());

        Set<String> names = new HashSet<>();
        for (var station : stations) {
            assertTrue(names.add(station.name()), "Duplicate station: " + station.name());
            assertTrue(station.drawDays() != null && !station.drawDays().isEmpty());
            assertEquals(station.name(), station.province());
        }
    }

    @Test
    void weeklySchedule_shouldMatchOfficialSouthernDrawTable() {
        var byName = SouthernLotteryStationCatalog.stations().stream()
                .collect(java.util.stream.Collectors.toMap(
                        SouthernLotteryStationCatalog.StationSeed::name,
                        SouthernLotteryStationCatalog.StationSeed::drawDays
                ));

        assertEquals(EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.SATURDAY), Set.copyOf(byName.get("Hồ Chí Minh")));
        assertEquals(EnumSet.of(DayOfWeek.MONDAY), Set.copyOf(byName.get("Đồng Tháp")));
        assertEquals(EnumSet.of(DayOfWeek.MONDAY), Set.copyOf(byName.get("Cà Mau")));
        assertEquals(EnumSet.of(DayOfWeek.TUESDAY), Set.copyOf(byName.get("Bến Tre")));
        assertEquals(EnumSet.of(DayOfWeek.TUESDAY), Set.copyOf(byName.get("Vũng Tàu")));
        assertEquals(EnumSet.of(DayOfWeek.TUESDAY), Set.copyOf(byName.get("Bạc Liêu")));
        assertEquals(EnumSet.of(DayOfWeek.WEDNESDAY), Set.copyOf(byName.get("Đồng Nai")));
        assertEquals(EnumSet.of(DayOfWeek.WEDNESDAY), Set.copyOf(byName.get("Cần Thơ")));
        assertEquals(EnumSet.of(DayOfWeek.WEDNESDAY), Set.copyOf(byName.get("Sóc Trăng")));
        assertEquals(EnumSet.of(DayOfWeek.THURSDAY), Set.copyOf(byName.get("Tây Ninh")));
        assertEquals(EnumSet.of(DayOfWeek.THURSDAY), Set.copyOf(byName.get("An Giang")));
        assertEquals(EnumSet.of(DayOfWeek.THURSDAY), Set.copyOf(byName.get("Bình Thuận")));
        assertEquals(EnumSet.of(DayOfWeek.FRIDAY), Set.copyOf(byName.get("Vĩnh Long")));
        assertEquals(EnumSet.of(DayOfWeek.FRIDAY), Set.copyOf(byName.get("Bình Dương")));
        assertEquals(EnumSet.of(DayOfWeek.FRIDAY), Set.copyOf(byName.get("Trà Vinh")));
        assertEquals(EnumSet.of(DayOfWeek.SATURDAY), Set.copyOf(byName.get("Long An")));
        assertEquals(EnumSet.of(DayOfWeek.SATURDAY), Set.copyOf(byName.get("Bình Phước")));
        assertEquals(EnumSet.of(DayOfWeek.SATURDAY), Set.copyOf(byName.get("Hậu Giang")));
        assertEquals(EnumSet.of(DayOfWeek.SUNDAY), Set.copyOf(byName.get("Tiền Giang")));
        assertEquals(EnumSet.of(DayOfWeek.SUNDAY), Set.copyOf(byName.get("Kiên Giang")));
        assertEquals(EnumSet.of(DayOfWeek.SUNDAY), Set.copyOf(byName.get("Đà Lạt")));
    }
}
