package com.daiphat.coreapi.application.port.in.streetagent;

import java.time.LocalDate;

public interface VendorDailyReportFinalizationUseCase {
    int finalizeOpenReports(LocalDate reportDate);
    int finalizeOverdueReports(LocalDate today);
}
