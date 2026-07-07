package com.daiphat.coreapi.domain.model.lotteries;

public final class ImportBatchLineCancelReason {

    private static final String DRAW_DATE_EXPIRED_TEMPLATE =
            "%s import has been cancelled because the Draw Date has expired before ticket import was completed.";

    private static final String IMPORT_DEADLINE_PASSED_TEMPLATE =
            "%s import has been cancelled because the same-day import deadline has passed.";

    private ImportBatchLineCancelReason() {
    }

    public static String drawDateExpired(String stationName) {
        return String.format(DRAW_DATE_EXPIRED_TEMPLATE, resolveStationName(stationName));
    }

    public static String importDeadlinePassed(String stationName) {
        return String.format(IMPORT_DEADLINE_PASSED_TEMPLATE, resolveStationName(stationName));
    }

    private static String resolveStationName(String stationName) {
        if (stationName == null || stationName.isBlank()) {
            return "Lottery Station";
        }
        return stationName.trim();
    }
}
