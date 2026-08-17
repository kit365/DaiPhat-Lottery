package com.daiphat.coreapi.application.service.payout;

import com.daiphat.coreapi.application.dto.document.ContractPdfDocument;
import com.daiphat.coreapi.application.dto.document.PrizePayoutConfirmationContractTemplateData;
import com.daiphat.coreapi.application.dto.document.PrizePayoutConfirmationContractTemplateData.TicketLine;
import com.daiphat.coreapi.application.dto.request.payout.PreviewPrizePayoutConfirmationContractRequest;
import com.daiphat.coreapi.application.port.in.payout.PrizePayoutConfirmationContractServicePort;
import com.daiphat.coreapi.application.port.out.contract.ContractRepositoryPort;
import com.daiphat.coreapi.application.port.out.document.ContractPdfRendererPort;
import com.daiphat.coreapi.application.port.out.document.PrizePayoutConfirmationContractHtmlRendererPort;
import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.service.contract.ContractArticleInterpolator;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.contract.ContractModel;
import com.daiphat.coreapi.domain.model.enums.contract.ContractType;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.payout.PrizePayoutRequestModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderDetailEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.order.OrderEntity;
import com.daiphat.coreapi.shared.time.VietnamClock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PrizePayoutConfirmationContractService implements PrizePayoutConfirmationContractServicePort {

    private static final Locale VIETNAMESE = Locale.forLanguageTag("vi-VN");
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String CONTRACT_PREFIX = "HD-TT-";

    private final PrizePayoutEligibilityService prizePayoutEligibilityService;
    private final PrizePayoutCalculationService prizePayoutCalculationService;
    private final PrizePayoutRequestRepositoryPort prizePayoutRequestRepositoryPort;
    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final ContractRepositoryPort contractRepositoryPort;
    private final PrizePayoutConfirmationContractHtmlRendererPort htmlRendererPort;
    private final ContractPdfRendererPort contractPdfRendererPort;
    private final VietnamClock vietnamClock;

    @Override
    @Transactional(readOnly = true)
    public ContractPdfDocument generatePreviewPdf(PreviewPrizePayoutConfirmationContractRequest request) {
        if (request == null || request.orderDetailIds() == null || request.orderDetailIds().isEmpty()) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_CONTRACT_INCOMPLETE);
        }
        String recipientName = trim(request.recipientFullName());
        String recipientId = trim(request.recipientIdNumber());
        requireRecipient(recipientName, recipientId);

        LinkedHashSet<Long> detailIds = new LinkedHashSet<>(request.orderDetailIds());
        List<TicketSnapshot> snapshots = new ArrayList<>();
        String phone = "—";
        for (Long detailId : detailIds) {
            OrderDetailEntity detail = prizePayoutEligibilityService.resolveDetail(detailId, null);
            TicketSnapshot snapshot = snapshotFromDetail(detail, null);
            snapshots.add(snapshot);
            if ("—".equals(phone) && detail.getOrder() != null && !blank(detail.getOrder().getPhone())) {
                phone = detail.getOrder().getPhone().trim();
            }
        }
        String contractCode = CONTRACT_PREFIX + vietnamClock.today().format(DateTimeFormatter.BASIC_ISO_DATE)
                + "-" + shortToken(detailIds, recipientId);
        PrizePayoutConfirmationContractTemplateData contract =
                buildTemplate(contractCode, recipientName, recipientId, phone, snapshots, false);
        return toPdf(contract);
    }

    @Override
    @Transactional(readOnly = true)
    public ContractPdfDocument generatePdfForRequest(Long payoutRequestId) {
        PrizePayoutRequestModel payout = prizePayoutRequestRepositoryPort.findById(payoutRequestId)
                .orElseThrow(() -> new DomainException(ErrorCode.PRIZE_PAYOUT_NOT_FOUND));
        OrderDetailEntity detail = prizePayoutEligibilityService.resolveDetail(
                payout.getOrderDetailId(), payout.getSerialId());
        TicketSnapshot snapshot = snapshotFromDetail(detail, payout);
        String recipientName = firstNonBlank(payout.getRecipientFullName(), snapshot.customerName());
        String recipientId = firstNonBlank(payout.getRecipientIdNumber(), null);
        requireRecipient(recipientName, recipientId);
        String phone = snapshot.phone();
        String contractCode = firstNonBlank(payout.getRequestCode(), CONTRACT_PREFIX + payoutRequestId);
        PrizePayoutConfirmationContractTemplateData contract =
                buildTemplate(contractCode, recipientName, recipientId, phone, List.of(snapshot), false);
        return toPdf(contract);
    }

    private TicketSnapshot snapshotFromDetail(OrderDetailEntity detail, PrizePayoutRequestModel stored) {
        LotteryTicketSerialEntity serial = detail.getLotteryTicketSerial();
        if (serial == null) {
            throw new DomainException(ErrorCode.LOTTERY_TICKET_NOT_FOUND);
        }
        PrizePayoutEligibilityService.PrizeMatchContext match =
                prizePayoutEligibilityService.resolvePrizeMatch(detail, serial);
        if (stored == null) {
            prizePayoutEligibilityService.validateStaffInPersonCreate(detail, serial);
        }

        PrizePayoutCalculationService.PrizePayoutBreakdown breakdown = stored != null
                ? new PrizePayoutCalculationService.PrizePayoutBreakdown(
                        stored.getGrossAmount(),
                        stored.getTaxAmount(),
                        stored.getCommissionAmount(),
                        stored.getNetAmount())
                : prizePayoutCalculationService.calculate(match.prizeAmount());

        OrderEntity order = detail.getOrder();
        LotteryTicketEntity ticket = serial.getTicket();
        String stationName = ticket != null && ticket.getStation() != null
                ? dash(ticket.getStation().getName())
                : "—";
        String drawDate = ticket != null && ticket.getDrawDate() != null
                ? ticket.getDrawDate().format(DISPLAY_DATE)
                : (serial.getDrawDate() != null ? serial.getDrawDate().format(DISPLAY_DATE) : "—");
        String ticketNumbers = !blank(match.ticketNumbers())
                ? match.ticketNumbers()
                : (ticket != null ? dash(ticket.getNumbers()) : "—");
        String customerName = null;
        if (order != null && order.getUser() != null) {
            String last = order.getUser().getLastName() != null ? order.getUser().getLastName() : "";
            String first = order.getUser().getFirstName() != null ? order.getUser().getFirstName() : "";
            customerName = trim(last + " " + first);
        }
        return new TicketSnapshot(
                dash(order != null ? order.getOrderCode() : null),
                stationName,
                drawDate,
                dash(ticketNumbers),
                dash(serial.getSerialNumber()),
                dash(match.prizeDisplayName()),
                nvl(breakdown.grossAmount()),
                nvl(breakdown.taxAmount()),
                nvl(breakdown.commissionAmount()),
                nvl(breakdown.netAmount()),
                dash(order != null ? order.getPhone() : null),
                customerName
        );
    }

    private PrizePayoutConfirmationContractTemplateData buildTemplate(
            String contractCode,
            String recipientName,
            String recipientId,
            String phone,
            List<TicketSnapshot> snapshots,
            boolean showPrintAction
    ) {
        PrizePayoutCalculationService.PrizePayoutCalcSettings settings = prizePayoutCalculationService.loadSettings();
        BigDecimal totalGross = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;
        BigDecimal totalCommission = BigDecimal.ZERO;
        BigDecimal totalNet = BigDecimal.ZERO;
        List<TicketLine> lines = new ArrayList<>();
        for (TicketSnapshot snapshot : snapshots) {
            totalGross = totalGross.add(snapshot.gross());
            totalTax = totalTax.add(snapshot.tax());
            totalCommission = totalCommission.add(snapshot.commission());
            totalNet = totalNet.add(snapshot.net());
            lines.add(new TicketLine(
                    snapshot.orderCode(),
                    snapshot.stationName(),
                    snapshot.drawDate(),
                    snapshot.ticketNumbers(),
                    snapshot.serialNumber(),
                    snapshot.prizeName(),
                    formatCurrency(snapshot.gross()),
                    formatCurrency(snapshot.tax()),
                    formatCurrency(snapshot.commission()),
                    formatCurrency(snapshot.net())
            ));
        }

        String taxPolicy = taxPolicy(settings);
        String commissionPolicy = commissionPolicy(settings);
        String complaintPolicy = complaintPolicy();
        String additionalTerms = optionalConfig(SystemConfigEnum.PRIZE_PAYOUT_CONTRACT_ADDITIONAL_TERMS).trim();
        String totalGrossAmount = formatCurrency(totalGross);
        String totalTaxAmount = formatCurrency(totalTax);
        String totalCommissionAmount = formatCurrency(totalCommission);
        String totalNetAmount = formatCurrency(totalNet);

        ContractModel template = requireTemplate();
        return new PrizePayoutConfirmationContractTemplateData(
                template.getTitle(),
                template.getSubtitle(),
                template.getPartyARoleLabel(),
                template.getPartyBRoleLabel(),
                template.getPartyASignatureLabel(),
                template.getPartyBSignatureLabel(),
                template.getFooterNote(),
                ContractArticleInterpolator.interpolate(template, Map.of(
                        "taxPolicy", taxPolicy,
                        "commissionPolicy", commissionPolicy,
                        "complaintPolicy", complaintPolicy,
                        "additionalTerms", additionalTerms,
                        "totalGrossAmount", totalGrossAmount,
                        "totalTaxAmount", totalTaxAmount,
                        "totalCommissionAmount", totalCommissionAmount,
                        "totalNetAmount", totalNetAmount
                )),
                stringConfig(SystemConfigEnum.SITE_NAME),
                optionalConfig(SystemConfigEnum.SITE_LOGO_URL),
                displayOptional(SystemConfigEnum.SITE_PHONE),
                displayOptional(SystemConfigEnum.SITE_EMAIL),
                displayOptional(SystemConfigEnum.SITE_ADDRESS),
                legalName(),
                displayOptional(SystemConfigEnum.SITE_TAX_CODE),
                displayOptional(SystemConfigEnum.SITE_LEGAL_REPRESENTATIVE),
                displayOptional(SystemConfigEnum.SITE_LEGAL_REPRESENTATIVE_TITLE),
                displayOptional(SystemConfigEnum.SITE_CONTRACT_SIGNING_PLACE),
                recipientName,
                recipientId,
                dash(phone),
                contractCode,
                vietnamClock.today().format(DISPLAY_DATE),
                taxPolicy,
                commissionPolicy,
                complaintPolicy,
                additionalTerms,
                totalGrossAmount,
                totalTaxAmount,
                totalCommissionAmount,
                totalNetAmount,
                lines,
                showPrintAction
        );
    }

    private ContractModel requireTemplate() {
        return contractRepositoryPort.findDefaultByType(ContractType.PRIZE_PAYOUT)
                .orElseThrow(() -> new DomainException(ErrorCode.CONTRACT_TEMPLATE_NOT_FOUND));
    }

    private ContractPdfDocument toPdf(PrizePayoutConfirmationContractTemplateData contract) {
        byte[] content = contractPdfRendererPort.renderPdf(htmlRendererPort.render(contract));
        return new ContractPdfDocument(content, pdfFileName(contract.contractCode()));
    }

    private void requireRecipient(String name, String idNumber) {
        if (blank(name) || blank(idNumber) || !idNumber.matches("\\d{9,12}")) {
            throw new DomainException(ErrorCode.PRIZE_PAYOUT_CONTRACT_INCOMPLETE);
        }
    }

    private String taxPolicy(PrizePayoutCalculationService.PrizePayoutCalcSettings settings) {
        return "<p><strong>Thuế TNCN:</strong> "
                + formatPercent(settings.taxRate())
                + " trên phần giá trị giải vượt "
                + formatCurrency(settings.taxThreshold())
                + ".</p>";
    }

    private String commissionPolicy(PrizePayoutCalculationService.PrizePayoutCalcSettings settings) {
        List<PrizePayoutCalculationService.CommissionTier> tiers = settings.commissionTiers();
        if (tiers == null || tiers.isEmpty()) {
            return "<p><strong>Hoa hồng đại lý:</strong> theo chính sách trả thưởng hiện hành.</p>";
        }
        StringBuilder builder = new StringBuilder();
        builder.append("<p><strong>Hoa hồng đại lý</strong> trên giá trị giải gốc:</p>");
        builder.append("<ul class=\"policy-list\">");
        BigDecimal previous = null;
        for (PrizePayoutCalculationService.CommissionTier tier : tiers) {
            builder.append("<li>");
            if (tier.upTo() == null) {
                if (previous == null) {
                    builder.append("Mọi mức giá trị giải");
                } else {
                    builder.append("Trên ").append(formatCurrency(previous));
                }
            } else if (previous == null) {
                builder.append("Đến ").append(formatCurrency(tier.upTo()));
            } else {
                builder.append("Từ trên ").append(formatCurrency(previous))
                        .append(" đến ").append(formatCurrency(tier.upTo()));
            }
            builder.append(": <strong>").append(formatPercent(tier.rate())).append("</strong></li>");
            previous = tier.upTo();
        }
        builder.append("</ul>");
        return builder.toString();
    }

    private String complaintPolicy() {
        String days = stringConfig(SystemConfigEnum.PRIZE_PAYOUT_COMPLAINT_GRACE_DAYS);
        return "Khiếu nại liên quan đến trả thưởng được tiếp nhận trong " + days
                + " ngày kể từ khi hoàn tất chi trả, theo cấu hình khiếu nại trả thưởng hiện hành.";
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
        if (blank(value) && !blank(key.getDefaultValue())) {
            value = key.getDefaultValue();
        }
        return dash(value);
    }

    private String legalName() {
        String configured = optionalConfig(SystemConfigEnum.SITE_LEGAL_NAME);
        if (!blank(configured) && !"—".equals(configured)) {
            return configured;
        }
        if (!blank(SystemConfigEnum.SITE_LEGAL_NAME.getDefaultValue())) {
            return SystemConfigEnum.SITE_LEGAL_NAME.getDefaultValue();
        }
        return stringConfig(SystemConfigEnum.SITE_NAME);
    }

    private String formatCurrency(BigDecimal value) {
        return formatNumber(nvl(value)) + " đ";
    }

    private String formatPercent(BigDecimal rate) {
        if (rate == null) {
            return "—";
        }
        return rate.multiply(BigDecimal.valueOf(100)).stripTrailingZeros().toPlainString() + "%";
    }

    private String formatNumber(Number value) {
        return NumberFormat.getNumberInstance(VIETNAMESE).format(value);
    }

    private String pdfFileName(String contractCode) {
        String safeCode = contractCode.replaceAll("[^A-Za-z0-9._-]", "-");
        return "hop-dong-xac-nhan-tra-thuong-" + safeCode + ".pdf";
    }

    private static String shortToken(LinkedHashSet<Long> detailIds, String recipientId) {
        String seed = String.join(",", detailIds.stream().map(String::valueOf).toList()) + "|" + recipientId;
        String hex = Integer.toHexString(seed.hashCode()).toUpperCase(Locale.ROOT);
        return (hex + "XXXXXXXX").substring(0, 8);
    }

    private static BigDecimal nvl(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static String firstNonBlank(String primary, String fallback) {
        if (!blank(primary)) {
            return primary.trim();
        }
        return blank(fallback) ? "" : fallback.trim();
    }

    private static String dash(String value) {
        return blank(value) ? "—" : value.trim();
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private record TicketSnapshot(
            String orderCode,
            String stationName,
            String drawDate,
            String ticketNumbers,
            String serialNumber,
            String prizeName,
            BigDecimal gross,
            BigDecimal tax,
            BigDecimal commission,
            BigDecimal net,
            String phone,
            String customerName
    ) {
    }
}
