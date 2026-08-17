package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

/**
 * Corrects only a station's weekly draw schedule.
 *
 * <p>Deliberately not the full station update: fixing a schedule from the import
 * preview must not touch the price, region or status, and a full payload sent
 * from a screen that never loaded those fields would overwrite them with blanks.
 *
 * @param drawTime optional; left alone when null, since a wrong weekday does not
 *                 imply a wrong draw time
 */
public record UpdateLotteryStationScheduleRequest(
        @NotNull Long lotteryStationId,
        @NotEmpty List<DayOfWeek> drawDays,
        LocalTime drawTime
) {
}
