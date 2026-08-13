package com.daiphat.coreapi.application.export.streetagent;

import com.daiphat.coreapi.application.dto.document.*;
import com.daiphat.coreapi.application.dto.response.streetagent.StreetAgentReportResponse;
import com.daiphat.coreapi.application.service.document.ExcelExportStrategy;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.List;

/** Vendor-specific content mapping. It intentionally contains no Apache POI code. */
@Component
public class StreetAgentReportExcelExportStrategy
        implements ExcelExportStrategy<StreetAgentReportExcelExportStrategy.ReportExportSource> {

    private static final DateTimeFormatter FILE_DATE_FORMAT = DateTimeFormatter.BASIC_ISO_DATE;
    private static final int ID_WIDTH = 12 * 256;
    private static final int NAME_WIDTH = 28 * 256;
    private static final int METRIC_WIDTH = 16 * 256;

    @Override
    public SpreadsheetWorkbookSpec workbook(ReportExportSource source) {
        StreetAgentReportResponse.Overview overview = source.overview();
        StreetAgentReportResponse.Summary summary = overview.summary();
        return new SpreadsheetWorkbookSpec(List.of(
                new SpreadsheetSheetSpec("Tổng quan",
                        List.of(
                                new SpreadsheetColumnSpec("Chỉ số", NAME_WIDTH, SpreadsheetValueFormat.TEXT),
                                new SpreadsheetColumnSpec("Giá trị", METRIC_WIDTH, SpreadsheetValueFormat.TEXT)),
                        List.of(
                                List.of("Từ ngày", overview.period().from()),
                                List.of("Đến ngày", overview.period().to()),
                                List.of("Trạng thái báo cáo", String.join(", ", overview.period().statuses())),
                                List.of("Dữ liệu chưa hoàn chỉnh", overview.provisional() ? "Có" : "Không"),
                                List.of("Số phiếu chưa quyết toán", overview.unsettledBatchCount()),
                                List.of("Vé giao", summary.allocatedQuantity()),
                                List.of("Vé bán", summary.soldQuantity()),
                                List.of("Vé trả", summary.returnedQuantity()),
                                List.of("Doanh số vé", summary.grossSales()),
                                List.of("Hoa hồng phải trả", summary.commissionPayable()),
                                List.of("Tiền người bán phải nộp", summary.agentCashRemitted()),
                                List.of("Tỷ lệ bán (%)", summary.sellThroughRate())), false),
                new SpreadsheetSheetSpec("Theo người bán",
                        List.of(
                                new SpreadsheetColumnSpec("Mã người bán", ID_WIDTH, SpreadsheetValueFormat.INTEGER),
                                new SpreadsheetColumnSpec("Người bán", NAME_WIDTH, SpreadsheetValueFormat.TEXT),
                                new SpreadsheetColumnSpec("Số báo cáo", METRIC_WIDTH, SpreadsheetValueFormat.INTEGER),
                                new SpreadsheetColumnSpec("Vé giao", METRIC_WIDTH, SpreadsheetValueFormat.INTEGER),
                                new SpreadsheetColumnSpec("Vé bán", METRIC_WIDTH, SpreadsheetValueFormat.INTEGER),
                                new SpreadsheetColumnSpec("Vé trả", METRIC_WIDTH, SpreadsheetValueFormat.INTEGER),
                                new SpreadsheetColumnSpec("Doanh số vé", METRIC_WIDTH, SpreadsheetValueFormat.MONEY),
                                new SpreadsheetColumnSpec("Hoa hồng phải trả", METRIC_WIDTH, SpreadsheetValueFormat.MONEY),
                                new SpreadsheetColumnSpec("Tiền phải nộp", METRIC_WIDTH, SpreadsheetValueFormat.MONEY),
                                new SpreadsheetColumnSpec("Tỷ lệ bán (%)", METRIC_WIDTH, SpreadsheetValueFormat.PERCENT)),
                        source.agents().stream().map(agent -> List.<Object>of(
                                agent.agentId(), agent.agentName(), agent.reportCount(), agent.allocatedQuantity(),
                                agent.soldQuantity(), agent.returnedQuantity(), agent.grossSales(), agent.commissionPayable(),
                                agent.agentCashRemitted(), agent.sellThroughRate().movePointLeft(2))).toList()),
                new SpreadsheetSheetSpec("Theo đài",
                        List.of(
                                new SpreadsheetColumnSpec("Mã đài", ID_WIDTH, SpreadsheetValueFormat.INTEGER),
                                new SpreadsheetColumnSpec("Nhà đài", NAME_WIDTH, SpreadsheetValueFormat.TEXT),
                                new SpreadsheetColumnSpec("Vé giao", METRIC_WIDTH, SpreadsheetValueFormat.INTEGER),
                                new SpreadsheetColumnSpec("Vé bán", METRIC_WIDTH, SpreadsheetValueFormat.INTEGER),
                                new SpreadsheetColumnSpec("Vé trả", METRIC_WIDTH, SpreadsheetValueFormat.INTEGER),
                                new SpreadsheetColumnSpec("Doanh số vé", METRIC_WIDTH, SpreadsheetValueFormat.MONEY),
                                new SpreadsheetColumnSpec("Tỷ lệ bán (%)", METRIC_WIDTH, SpreadsheetValueFormat.PERCENT)),
                        source.stations().stream().map(station -> List.<Object>of(
                                station.stationId(), station.stationName(), station.allocatedQuantity(), station.soldQuantity(),
                                station.returnedQuantity(), station.grossSales(), station.sellThroughRate().movePointLeft(2))).toList())
        ));
    }

    @Override
    public String fileName(ReportExportSource source) {
        return "bao-cao-nguoi-ban-ve-" + source.overview().period().from().format(FILE_DATE_FORMAT)
                + "-" + source.overview().period().to().format(FILE_DATE_FORMAT) + ".xlsx";
    }

    public record ReportExportSource(
            StreetAgentReportResponse.Overview overview,
            List<StreetAgentReportResponse.Agent> agents,
            List<StreetAgentReportResponse.Station> stations) {
    }
}
