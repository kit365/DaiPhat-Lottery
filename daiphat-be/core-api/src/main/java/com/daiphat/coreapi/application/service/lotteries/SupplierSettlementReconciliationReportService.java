package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.document.ContractPdfDocument;
import com.daiphat.coreapi.application.dto.document.SupplierSettlementReconciliationReportTemplateData;
import com.daiphat.coreapi.application.dto.document.SupplierSettlementReconciliationReportTemplateData.AdjustmentLine;
import com.daiphat.coreapi.application.dto.document.SupplierSettlementReconciliationReportTemplateData.LotLine;
import com.daiphat.coreapi.application.dto.document.SupplierSettlementReconciliationReportTemplateData.StationLine;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ReturnBatchResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementStationPricingResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementAdjustmentResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementOverviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementResponse;
import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementReconciliationReportServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.application.port.out.document.ContractPdfRendererPort;
import com.daiphat.coreapi.application.port.out.document.SupplierSettlementReconciliationReportHtmlRendererPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementAdjustmentGroupType;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementReconciliationPhase;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.shared.time.VietnamClock;
import com.daiphat.coreapi.shared.util.ImportCostCalculator;
import com.daiphat.coreapi.shared.util.StorageUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.NumberFormat;
import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class SupplierSettlementReconciliationReportService
        implements SupplierSettlementReconciliationReportServicePort {

    private static final Locale VIETNAMESE = Locale.forLanguageTag("vi-VN");
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final SupplierSettlementServicePort supplierSettlementServicePort;
    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final SupplierSettlementReconciliationReportHtmlRendererPort htmlRendererPort;
    private final ContractPdfRendererPort contractPdfRendererPort;
    private final VietnamClock vietnamClock;

    @Value("${daiphat.storage.local.base-dir:./data/uploads}")
    private String localUploadDir;

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    @Override
    public ContractPdfDocument generatePdf(Long settlementId) {
        SupplierSettlementOverviewResponse overview = supplierSettlementServicePort.getOverview(settlementId);
        SupplierSettlementResponse settlement = overview.settlement();
        if (settlement == null) {
            throw new DomainException(ErrorCode.SUPPLIER_SETTLEMENT_NOT_FOUND);
        }
        if (settlement.reconciliationPhase() == SupplierSettlementReconciliationPhase.MATCHING
                || settlement.matchingConfirmedAt() == null) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Cần hoàn thành đối chiếu số liệu trước khi xuất báo cáo đối soát."
            );
        }

        SupplierSettlementReconciliationReportTemplateData report = toTemplate(overview);
        byte[] content = contractPdfRendererPort.renderPdf(htmlRendererPort.render(report));
        return new ContractPdfDocument(content, pdfFileName(settlement.supplierSettlementCode(), settlement.id()));
    }

    private SupplierSettlementReconciliationReportTemplateData toTemplate(SupplierSettlementOverviewResponse overview) {
        SupplierSettlementResponse settlement = overview.settlement();
        int importQtySystem = nvl(settlement.systemImportQuantity());
        int importQtyActual = settlement.actualTicketImportQuantity() != null
                ? settlement.actualTicketImportQuantity()
                : importQtySystem;
        int returnQtySystem = nvl(settlement.systemReturnQuantity());
        int returnQtyActual = settlement.actualReturnTicketQuantity() != null
                ? settlement.actualReturnTicketQuantity()
                : returnQtySystem;

        BigDecimal importValSystem = nvl(settlement.systemImportValue());
        BigDecimal importValActual = settlement.actualTicketImportValue() != null
                ? settlement.actualTicketImportValue()
                : importValSystem;
        BigDecimal returnValSystem = nvl(settlement.systemReturnValue());
        BigDecimal returnValActual = settlement.actualReturnTicketValue() != null
                ? settlement.actualReturnTicketValue()
                : returnValSystem;

        BigDecimal initial = nvl(settlement.initialEstimatedSettlementValue());
        BigDecimal finalValue = nvl(settlement.finalSettlementValue());
        BigDecimal actualPaid = nvl(settlement.actualPaidAmount());
        BigDecimal difference = settlement.settlementDifferenceAmount() != null
                ? settlement.settlementDifferenceAmount()
                : ImportCostCalculator.scaleMoney(finalValue.subtract(initial));
        BigDecimal remaining = settlement.actualPaidAmount() != null && settlement.finalSettlementValue() != null
                ? ImportCostCalculator.scaleMoney(actualPaid.subtract(finalValue).abs())
                : BigDecimal.ZERO;

        int evidenceCount = settlement.paymentEvidenceUrls() == null
                ? 0
                : (int) settlement.paymentEvidenceUrls().stream()
                        .filter(url -> url != null && !url.isBlank())
                        .count();

        String period = dash(formatDate(settlement.periodFrom()))
                + " — "
                + dash(formatDate(settlement.periodTo()));
        String settlementCode = firstNonBlank(settlement.supplierSettlementCode(), "#" + settlement.id());
        boolean paid = settlement.status() == SupplierSettlementStatus.COMPLETED;
        String paymentStatusLabel = paid ? "Đã thanh toán" : "Chưa thanh toán";
        List<String> evidenceUrls = settlement.paymentEvidenceUrls() == null
                ? List.of()
                : settlement.paymentEvidenceUrls().stream()
                        .filter(url -> url != null && !url.isBlank())
                        .toList();
        List<String> evidenceImages = paid ? embedPaymentEvidenceImages(evidenceUrls) : List.of();

        BigDecimal unitPrice = settlement.reconciledTicketUnitPrice() != null
                ? settlement.reconciledTicketUnitPrice()
                : nvl(settlement.actualTicketPrice());
        int netQty = importQtyActual - returnQtyActual;
        BigDecimal importTicketMoney = ImportCostCalculator.scaleMoney(
                unitPrice.multiply(BigDecimal.valueOf(importQtyActual))
        );
        BigDecimal returnTicketMoney = ImportCostCalculator.scaleMoney(
                unitPrice.multiply(BigDecimal.valueOf(returnQtyActual))
        );
        BigDecimal ticketNetMoney = ImportCostCalculator.scaleMoney(
                unitPrice.multiply(BigDecimal.valueOf(netQty))
        );
        BigDecimal additionalCost = additionalCostTotal(overview.adjustments());
        BigDecimal payable = settlement.finalSettlementValue() != null
                ? finalValue
                : ImportCostCalculator.scaleMoney(ticketNetMoney.add(additionalCost));

        return new SupplierSettlementReconciliationReportTemplateData(
                stringConfig(SystemConfigEnum.SITE_NAME),
                optionalConfig(SystemConfigEnum.SITE_LOGO_URL),
                displayOptional(SystemConfigEnum.SITE_ADDRESS),
                displayOptional(SystemConfigEnum.SITE_PHONE),
                displayOptional(SystemConfigEnum.SITE_EMAIL),
                "BC-DS-" + settlementCode,
                vietnamClock.today().format(DISPLAY_DATE),
                dash(settlement.supplierName()),
                dash(settlement.supplierCode()),
                settlementCode,
                period,
                dash(settlement.statusLabel()),
                dash(settlement.reconciliationPhaseLabel()),
                formatQty(importQtySystem),
                formatQty(importQtyActual),
                formatSignedQty(importQtyActual - importQtySystem),
                formatQty(returnQtySystem),
                formatQty(returnQtyActual),
                formatSignedQty(returnQtyActual - returnQtySystem),
                formatMoney(importValSystem),
                formatMoney(importValActual),
                formatSignedMoney(importValActual.subtract(importValSystem)),
                formatMoney(returnValSystem),
                formatMoney(returnValActual),
                formatSignedMoney(returnValActual.subtract(returnValSystem)),
                formatMoney(initial),
                formatMoney(finalValue),
                formatSignedMoney(difference),
                formatMoney(actualPaid),
                formatMoney(remaining),
                evidenceCount + " ảnh",
                paymentStatusLabel,
                paid,
                evidenceImages,
                formatMoney(unitPrice),
                formatQty(netQty),
                formatMoney(importTicketMoney),
                formatMoney(returnTicketMoney),
                formatMoney(ticketNetMoney),
                formatMoney(additionalCost),
                formatMoney(payable),
                toImportLots(overview.importBatches()),
                toReturnLots(overview.returnBatches()),
                toStations(overview.stationPricing()),
                toAdjustments(overview.adjustments())
        );
    }

    private List<LotLine> toImportLots(List<ImportBatchResponse> batches) {
        if (batches == null || batches.isEmpty()) {
            return List.of();
        }
        List<LotLine> rows = new ArrayList<>();
        for (ImportBatchResponse batch : batches) {
            if (batch == null || batch.status() == ImportBatchStatus.CANCELLED) {
                continue;
            }
            int qty = nvl(batch.totalImportedQuantity());
            BigDecimal amount = nvl(batch.totalImportedCostValue());
            BigDecimal unit = qty > 0
                    ? amount.divide(BigDecimal.valueOf(qty), 0, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            rows.add(new LotLine(
                    dash(batch.batchCode()),
                    dash(formatDate(batch.drawDate())),
                    batch.status() != null ? batch.status().getLabel() : "—",
                    formatQty(qty),
                    formatMoney(unit),
                    formatMoney(amount)
            ));
        }
        return rows;
    }

    private List<LotLine> toReturnLots(List<ReturnBatchResponse> batches) {
        if (batches == null || batches.isEmpty()) {
            return List.of();
        }
        List<LotLine> rows = new ArrayList<>();
        for (ReturnBatchResponse batch : batches) {
            if (batch == null || batch.status() == ReturnBatchStatus.CANCELLED) {
                continue;
            }
            rows.add(new LotLine(
                    dash(batch.batchCode()),
                    dash(formatDate(batch.drawDate())),
                    batch.statusLabel() != null ? batch.statusLabel() : "—",
                    formatQty(nvl(batch.totalQuantity())),
                    "—",
                    formatMoney(nvl(batch.totalReturnValue()))
            ));
        }
        return rows;
    }

    private List<StationLine> toStations(List<SettlementStationPricingResponse> pricing) {
        if (pricing == null || pricing.isEmpty()) {
            return List.of();
        }
        List<StationLine> rows = new ArrayList<>();
        for (SettlementStationPricingResponse row : pricing) {
            if (row == null) {
                continue;
            }
            BigDecimal rate = nvl(row.commissionRate()).multiply(BigDecimal.valueOf(100));
            rows.add(new StationLine(
                    firstNonBlank(row.lotteryStationName(), "Đài #" + row.lotteryStationId()),
                    formatQty(row.importedQuantity()),
                    formatMoney(nvl(row.importCost())),
                    formatNumber(rate) + "%",
                    formatMoney(nvl(row.netUnitPrice()))
            ));
        }
        return rows;
    }

    private List<AdjustmentLine> toAdjustments(List<SupplierSettlementAdjustmentResponse> adjustments) {
        if (adjustments == null || adjustments.isEmpty()) {
            return List.of();
        }
        List<AdjustmentLine> rows = new ArrayList<>();
        for (SupplierSettlementAdjustmentResponse row : adjustments) {
            if (row == null) {
                continue;
            }
            String name = firstNonBlank(row.customName(), row.reasonLabel(), row.reasonCode() != null
                    ? row.reasonCode().name()
                    : "Điều chỉnh");
            rows.add(new AdjustmentLine(name, dash(row.note()), formatSignedMoney(nvl(row.amount()))));
        }
        return rows;
    }

    private static BigDecimal additionalCostTotal(List<SupplierSettlementAdjustmentResponse> adjustments) {
        if (adjustments == null || adjustments.isEmpty()) {
            return BigDecimal.ZERO;
        }
        BigDecimal total = BigDecimal.ZERO;
        for (SupplierSettlementAdjustmentResponse row : adjustments) {
            if (row == null || row.groupType() != SupplierSettlementAdjustmentGroupType.SETTLEMENT) {
                continue;
            }
            total = total.add(nvl(row.amount()));
        }
        return ImportCostCalculator.scaleMoney(total);
    }

    private List<String> embedPaymentEvidenceImages(List<String> urls) {
        List<String> images = new ArrayList<>();
        for (String url : urls) {
            String dataUri = toDataUri(url);
            if (dataUri != null) {
                images.add(dataUri);
            }
        }
        return images;
    }

    private String toDataUri(String url) {
        byte[] bytes = readEvidenceBytes(url);
        if (bytes == null || bytes.length == 0) {
            return null;
        }
        return "data:" + guessMimeType(url) + ";base64," + Base64.getEncoder().encodeToString(bytes);
    }

    private byte[] readEvidenceBytes(String url) {
        try {
            if (url.startsWith("http://") || url.startsWith("https://")) {
                HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                        .timeout(Duration.ofSeconds(8))
                        .GET()
                        .build();
                HttpResponse<byte[]> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofByteArray());
                if (response.statusCode() >= 200 && response.statusCode() < 300) {
                    return response.body();
                }
                return null;
            }
            String key = StorageUtils.extractStorageKeyFromUrl(url);
            if (key == null || key.isBlank() || localUploadDir == null || localUploadDir.isBlank()) {
                return null;
            }
            Path path = Path.of(localUploadDir).resolve(key).normalize();
            Path base = Path.of(localUploadDir).toAbsolutePath().normalize();
            if (!path.toAbsolutePath().normalize().startsWith(base) || !Files.isRegularFile(path)) {
                return null;
            }
            return Files.readAllBytes(path);
        } catch (Exception ex) {
            return null;
        }
    }

    private static String guessMimeType(String url) {
        String lower = url == null ? "" : url.toLowerCase(Locale.ROOT);
        if (lower.contains(".png")) {
            return "image/png";
        }
        if (lower.contains(".webp")) {
            return "image/webp";
        }
        if (lower.contains(".gif")) {
            return "image/gif";
        }
        return "image/jpeg";
    }

    private String stringConfig(SystemConfigEnum key) {
        return systemConfigRepositoryPort.findActiveByConfigKey(key.name())
                .map(SystemConfigModel::getConfigValue)
                .filter(value -> !blank(value))
                .orElse(key.getDefaultValue());
    }

    private String optionalConfig(SystemConfigEnum key) {
        return systemConfigRepositoryPort.findActiveByConfigKey(key.name())
                .map(SystemConfigModel::getConfigValue)
                .filter(value -> !blank(value))
                .orElse(key.getDefaultValue() != null ? key.getDefaultValue() : "");
    }

    private String displayOptional(SystemConfigEnum key) {
        String value = optionalConfig(key);
        return dash(value);
    }

    private static String formatDate(java.time.LocalDate date) {
        return date == null ? null : date.format(DISPLAY_DATE);
    }

    private static String formatQty(int value) {
        return NumberFormat.getIntegerInstance(VIETNAMESE).format(value);
    }

    private static String formatSignedQty(int value) {
        if (value == 0) {
            return "0";
        }
        return (value > 0 ? "+" : "−") + formatQty(Math.abs(value));
    }

    private static String formatMoney(BigDecimal value) {
        return formatNumber(nvl(value)) + " đ";
    }

    private static String formatSignedMoney(BigDecimal value) {
        BigDecimal amount = nvl(value);
        if (amount.compareTo(BigDecimal.ZERO) == 0) {
            return formatMoney(BigDecimal.ZERO);
        }
        String prefix = amount.signum() > 0 ? "+" : "−";
        return prefix + formatNumber(amount.abs()) + " đ";
    }

    private static String formatNumber(BigDecimal value) {
        NumberFormat format = NumberFormat.getIntegerInstance(VIETNAMESE);
        return format.format(nvl(value).setScale(0, RoundingMode.HALF_UP));
    }

    private static BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static int nvl(Integer value) {
        return value == null ? 0 : value;
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String dash(String value) {
        return blank(value) ? "—" : value.trim();
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return "—";
        }
        for (String value : values) {
            if (!blank(value)) {
                return value.trim();
            }
        }
        return "—";
    }

    private static String pdfFileName(String settlementCode, Long id) {
        String slug = blank(settlementCode)
                ? String.valueOf(id)
                : settlementCode.trim().replaceAll("[^A-Za-z0-9._-]", "-");
        return "bao-cao-doi-soat-" + slug + ".pdf";
    }
}
