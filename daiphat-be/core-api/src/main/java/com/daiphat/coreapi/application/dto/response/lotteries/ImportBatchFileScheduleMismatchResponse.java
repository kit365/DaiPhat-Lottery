package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.time.DayOfWeek;
import java.util.List;

/**
 * A station named in the file that cannot take the file's draw date, together
 * with everything needed to put it right.
 *
 * <p>Reported separately from "station not found" because the two call for
 * opposite fixes. A station the system has never heard of means the file is
 * wrong. A station that exists but is not scheduled on that weekday usually means
 * the system is wrong - the supplier really did deliver those tickets, and the
 * station's weekly schedule was never updated after it changed. So the schedule
 * itself is handed back, along with the weekdays the file implies, and the
 * operator corrects it without leaving the import.
 *
 * @param currentDrawDays  the station's schedule as it stands
 * @param requiredDrawDays weekdays the draw dates in this file fall on
 * @param suggestedDrawDays current plus required, the least destructive fix: a
 *                          station gains a draw day rather than losing the ones
 *                          it already serves
 * @param active           false when the station is simply switched off, which is
 *                          a different repair from a wrong schedule
 */
@Builder
public record ImportBatchFileScheduleMismatchResponse(
        Long lotteryStationId,
        String stationName,
        String stationCode,
        String drawDate,
        List<DayOfWeek> currentDrawDays,
        List<DayOfWeek> requiredDrawDays,
        List<DayOfWeek> suggestedDrawDays,
        boolean active
) {
}
