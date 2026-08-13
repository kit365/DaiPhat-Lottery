package com.daiphat.coreapi.application.port.out.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.DailySalesReportStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

public interface StreetAgentReportQueryPort {
    record ReportRow(Long reportId, Long agentId, String agentName, LocalDate reportDate,
                     DailySalesReportStatus status, int allocatedQuantity, int soldQuantity,
                     int returnedQuantity, BigDecimal grossSales) {
    }

    record StationRow(Long stationId, String stationName, int allocatedQuantity,
                      int soldQuantity, int returnedQuantity, BigDecimal grossSales) {
    }

    record SettlementRow(Long agentId, BigDecimal commissionPayable, BigDecimal agentCashRemitted) {
    }

    record Dataset(List<ReportRow> reports, List<StationRow> stations,
                   List<SettlementRow> settlements, long unsettledBatchCount) {
    }

    Dataset load(LocalDate from, LocalDate to, Set<DailySalesReportStatus> statuses);
}
