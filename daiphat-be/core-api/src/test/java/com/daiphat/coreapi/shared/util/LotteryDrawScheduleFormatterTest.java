package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class LotteryDrawScheduleFormatterTest {

    @Test
    @DisplayName("A schedule reads as weekdays then draw time")
    void describesDaysAndTime() {
        LotteryStationModel station = LotteryStationModel.builder()
                .name("Tiền Giang")
                .drawDays(List.of(DayOfWeek.SUNDAY))
                .drawTime(LocalTime.of(16, 15))
                .build();

        assertThat(LotteryDrawScheduleFormatter.describe(station)).isEqualTo("Chủ nhật · 16:15");
    }

    @Test
    @DisplayName("Weekdays are listed in week order, not the order they were stored")
    void ordersDaysByWeek() {
        assertThat(LotteryDrawScheduleFormatter.dayLabels(
                List.of(DayOfWeek.FRIDAY, DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY)))
                .isEqualTo("Thứ 2, Thứ 4, Thứ 6");
    }

    @Test
    @DisplayName("A station with no schedule yet describes as blank, never as a stray separator")
    void handlesMissingSchedule() {
        LotteryStationModel noDays = LotteryStationModel.builder()
                .name("Chưa cấu hình")
                .drawTime(LocalTime.of(16, 15))
                .build();
        assertThat(LotteryDrawScheduleFormatter.describe(noDays)).isEqualTo("16:15");

        LotteryStationModel noTime = LotteryStationModel.builder()
                .name("Chưa cấu hình")
                .drawDays(List.of(DayOfWeek.MONDAY))
                .build();
        assertThat(LotteryDrawScheduleFormatter.describe(noTime)).isEqualTo("Thứ 2");

        assertThat(LotteryDrawScheduleFormatter.describe(null)).isEmpty();
        assertThat(LotteryDrawScheduleFormatter.dayLabels(List.of())).isEmpty();
    }
}
