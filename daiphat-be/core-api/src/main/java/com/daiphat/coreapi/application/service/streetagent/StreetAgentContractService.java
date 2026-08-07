package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.document.ContractPdfDocument;
import com.daiphat.coreapi.application.dto.document.StreetAgentContractTemplateData;
import com.daiphat.coreapi.application.port.in.streetagent.StreetAgentContractServicePort;
import com.daiphat.coreapi.application.port.out.document.ContractPdfRendererPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentProfileRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.streetagent.VendorLateReturnPolicy;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class StreetAgentContractService implements StreetAgentContractServicePort {

    private static final Locale VIETNAMESE = Locale.forLanguageTag("vi-VN");
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String TEMPLATE = "streetagent/contract";

    private final StreetAgentProfileRepositoryPort streetAgentProfileRepositoryPort;
    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final SpringTemplateEngine templateEngine;
    private final ContractPdfRendererPort contractPdfRendererPort;

    @Override
    @Transactional(readOnly = true)
    public ContractPdfDocument generatePdf(Long profileId) {
        StreetAgentContractTemplateData contract = loadContract(profileId, false);
        byte[] content = contractPdfRendererPort.renderPdf(render(contract));
        return new ContractPdfDocument(content, pdfFileName(contract.contractCode()));
    }

    @Override
    @Transactional(readOnly = true)
    public String renderPrintHtml(Long profileId) {
        return render(loadContract(profileId, true));
    }

    private StreetAgentContractTemplateData loadContract(Long profileId, boolean showPrintAction) {
        StreetAgentProfileModel profile = streetAgentProfileRepositoryPort.findById(profileId)
                .orElseThrow(() -> new DomainException(ErrorCode.STREET_AGENT_PROFILE_NOT_FOUND));
        requireCompleteContract(profile);

        BigDecimal unitPrice = decimalConfig(SystemConfigEnum.VENDOR_DEFAULT_UNIT_PRICE);
        BigDecimal depositRate = decimalConfig(SystemConfigEnum.VENDOR_DEPOSIT_RATE);
        VendorLateReturnPolicy lateReturnPolicy = VendorLateReturnPolicy.valueOf(
                stringConfig(SystemConfigEnum.VENDOR_LATE_RETURN_POLICY));

        return new StreetAgentContractTemplateData(
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
                fullName(profile),
                profile.getPhone(),
                profile.getCccd(),
                dash(profile.getContactAddress()),
                dash(profile.getContactProvince()),
                dash(profile.getCoverageArea()),
                profile.getContractCode().trim(),
                LocalDate.now().format(DISPLAY_DATE),
                profile.getContractStartDate().format(DISPLAY_DATE),
                profile.getContractEndDate().format(DISPLAY_DATE),
                formatNumber(profile.getDailyTicketCap()) + " vé/ngày",
                commission(profile.getCommissionRate()),
                formatCurrency(unitPrice) + "/vé",
                formatPercent(depositRate) + " trên tổng giá trị vendor của mỗi phiếu bàn giao",
                "Tiền cọc = số vé xác nhận bàn giao × " + formatCurrency(unitPrice)
                        + " × " + formatPercent(depositRate) + ".",
                stringConfig(SystemConfigEnum.VENDOR_RETURN_CUTOFF),
                latePolicyLabel(lateReturnPolicy),
                latePolicySettlement(lateReturnPolicy),
                showPrintAction
        );
    }

    private String render(StreetAgentContractTemplateData contract) {
        Context context = new Context(VIETNAMESE);
        context.setVariable("contract", contract);
        return templateEngine.process(TEMPLATE, context);
    }

    private void requireCompleteContract(StreetAgentProfileModel profile) {
        boolean complete = !blank(profile.getFirstName())
                && !blank(profile.getLastName())
                && !blank(profile.getPhone())
                && !blank(profile.getCccd())
                && !blank(profile.getContractCode())
                && profile.getContractStartDate() != null
                && profile.getContractEndDate() != null
                && profile.getDailyTicketCap() != null
                && profile.getDailyTicketCap() > 0;
        if (!complete) {
            throw new DomainException(ErrorCode.STREET_AGENT_CONTRACT_INCOMPLETE);
        }
        if (profile.getContractEndDate().isBefore(profile.getContractStartDate())) {
            throw new DomainException(ErrorCode.STREET_AGENT_PROFILE_INVALID_CONTRACT_DATE);
        }
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
                .orElse("");
    }

    private String displayOptional(SystemConfigEnum key) {
        String value = optionalConfig(key);
        if (blank(value) && !blank(key.getDefaultValue())) {
            value = key.getDefaultValue();
        }
        return dash(value);
    }

    private BigDecimal decimalConfig(SystemConfigEnum key) {
        try {
            return new BigDecimal(stringConfig(key));
        } catch (NumberFormatException ex) {
            return new BigDecimal(key.getDefaultValue());
        }
    }

    private String fullName(StreetAgentProfileModel profile) {
        return (profile.getLastName().trim() + " " + profile.getFirstName().trim()).trim();
    }

    private String commission(BigDecimal rate) {
        return rate == null
                ? "Theo chính sách hoa hồng hiện hành của " + stringConfig(SystemConfigEnum.SITE_NAME)
                : formatPercent(rate) + " trên giá trị vé bán thành công";
    }

    private String legalName() {
        String configured = optionalConfig(SystemConfigEnum.SITE_LEGAL_NAME);
        if (!blank(configured)) {
            return configured;
        }
        if (!blank(SystemConfigEnum.SITE_LEGAL_NAME.getDefaultValue())) {
            return SystemConfigEnum.SITE_LEGAL_NAME.getDefaultValue();
        }
        return stringConfig(SystemConfigEnum.SITE_NAME);
    }

    private String latePolicyLabel(VendorLateReturnPolicy policy) {
        return switch (policy) {
            case FORFEIT_DEPOSIT -> "Giữ lại tiền cọc; vẫn đối soát số vé đã bán và hoa hồng";
            case FORCE_PURCHASE_ALL -> "Tính toàn bộ vé đã giao theo giá vendor và cấn trừ tiền cọc";
        };
    }

    private String latePolicySettlement(VendorLateReturnPolicy policy) {
        return switch (policy) {
            case FORFEIT_DEPOSIT -> "Khi trả trễ, hệ thống vẫn nhận vé để đối soát serial; Bên B nộp tiền của số vé thực tế bán, "
                    + "được ghi nhận hoa hồng trên số vé đó và không được hoàn tiền cọc của phiếu bàn giao.";
            case FORCE_PURCHASE_ALL -> "Khi trả trễ, Bên B thanh toán toàn bộ số vé đã giao theo giá vendor; tiền cọc của phiếu bàn giao "
                    + "được cấn trừ vào số tiền phải thanh toán.";
        };
    }

    private String formatCurrency(BigDecimal value) {
        return formatNumber(value) + " đ";
    }

    private String formatPercent(BigDecimal rate) {
        return rate.multiply(BigDecimal.valueOf(100)).stripTrailingZeros().toPlainString() + "%";
    }

    private String formatNumber(Number value) {
        return NumberFormat.getNumberInstance(VIETNAMESE).format(value);
    }

    private String pdfFileName(String contractCode) {
        String safeCode = contractCode.replaceAll("[^A-Za-z0-9._-]", "-");
        return "hop-dong-cong-tac-ban-ve-" + safeCode + ".pdf";
    }

    private static String dash(String value) {
        return blank(value) ? "—" : value.trim();
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
