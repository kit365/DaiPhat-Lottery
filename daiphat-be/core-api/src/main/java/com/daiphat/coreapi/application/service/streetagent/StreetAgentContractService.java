package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.document.ContractPdfDocument;
import com.daiphat.coreapi.application.dto.document.StreetAgentContractTemplateData;
import com.daiphat.coreapi.application.policy.streetagent.VendorAllocationPolicyResolver;
import com.daiphat.coreapi.application.port.in.streetagent.StreetAgentContractServicePort;
import com.daiphat.coreapi.application.port.out.contract.ContractRepositoryPort;
import com.daiphat.coreapi.application.port.out.document.ContractPdfRendererPort;
import com.daiphat.coreapi.application.port.out.document.StreetAgentContractHtmlRendererPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentProfileRepositoryPort;
import com.daiphat.coreapi.application.service.contract.ContractArticleInterpolator;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.contract.ContractModel;
import com.daiphat.coreapi.domain.model.enums.contract.ContractType;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.streetagent.VendorLateReturnPolicy;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import com.daiphat.coreapi.shared.time.VietnamClock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Clock;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;

@Service
public class StreetAgentContractService implements StreetAgentContractServicePort {

    private static final Locale VIETNAMESE = Locale.forLanguageTag("vi-VN");
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final StreetAgentProfileRepositoryPort streetAgentProfileRepositoryPort;
    private final ContractRepositoryPort contractRepositoryPort;
    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final StreetAgentContractHtmlRendererPort contractHtmlRendererPort;
    private final ContractPdfRendererPort contractPdfRendererPort;
    private final VietnamClock vietnamClock;
    private final VendorAllocationPolicyResolver vendorAllocationPolicyResolver;

    @Autowired
    public StreetAgentContractService(
            StreetAgentProfileRepositoryPort streetAgentProfileRepositoryPort,
            ContractRepositoryPort contractRepositoryPort,
            SystemConfigRepositoryPort systemConfigRepositoryPort,
            StreetAgentContractHtmlRendererPort contractHtmlRendererPort,
            ContractPdfRendererPort contractPdfRendererPort,
            VietnamClock vietnamClock,
            VendorAllocationPolicyResolver vendorAllocationPolicyResolver) {
        this.streetAgentProfileRepositoryPort = streetAgentProfileRepositoryPort;
        this.contractRepositoryPort = contractRepositoryPort;
        this.systemConfigRepositoryPort = systemConfigRepositoryPort;
        this.contractHtmlRendererPort = contractHtmlRendererPort;
        this.contractPdfRendererPort = contractPdfRendererPort;
        this.vietnamClock = vietnamClock;
        this.vendorAllocationPolicyResolver = vendorAllocationPolicyResolver;
    }

    /** Compatibility constructor for focused service tests. */
    public StreetAgentContractService(
            StreetAgentProfileRepositoryPort streetAgentProfileRepositoryPort,
            ContractRepositoryPort contractRepositoryPort,
            SystemConfigRepositoryPort systemConfigRepositoryPort,
            StreetAgentContractHtmlRendererPort contractHtmlRendererPort,
            ContractPdfRendererPort contractPdfRendererPort) {
        this(streetAgentProfileRepositoryPort, contractRepositoryPort, systemConfigRepositoryPort,
                contractHtmlRendererPort, contractPdfRendererPort, new VietnamClock(Clock.systemUTC()),
                new VendorAllocationPolicyResolver(systemConfigRepositoryPort));
    }

    @Override
    @Transactional(readOnly = true)
    public ContractPdfDocument generatePdf(Long profileId) {
        StreetAgentContractTemplateData contract = loadContract(profileId, false);
        byte[] content = contractPdfRendererPort.renderPdf(contractHtmlRendererPort.render(contract));
        return new ContractPdfDocument(content, pdfFileName(contract.contractCode()));
    }

    @Override
    @Transactional(readOnly = true)
    public String renderPrintHtml(Long profileId) {
        return contractHtmlRendererPort.render(loadContract(profileId, true));
    }

    private StreetAgentContractTemplateData loadContract(Long profileId, boolean showPrintAction) {
        StreetAgentProfileModel profile = streetAgentProfileRepositoryPort.findById(profileId)
                .orElseThrow(() -> new DomainException(ErrorCode.STREET_AGENT_PROFILE_NOT_FOUND));
        requireCompleteContract(profile);

        VendorAllocationPolicyResolver.AllocationPolicy allocationPolicy = vendorAllocationPolicyResolver.resolve();
        BigDecimal commissionRate = allocationPolicy.commissionRate();
        BigDecimal faceValue = BigDecimal.valueOf(10_000);
        BigDecimal unitPrice = vendorAllocationPolicyResolver.vendorUnitPrice(faceValue, commissionRate);
        BigDecimal depositRate = allocationPolicy.depositRate();
        VendorLateReturnPolicy lateReturnPolicy = VendorLateReturnPolicy.valueOf(allocationPolicy.lateReturnPolicy());

        String contractStartDate = profile.getContractStartDate().format(DISPLAY_DATE);
        String contractEndDate = profile.getContractEndDate().format(DISPLAY_DATE);
        String contractMaxDailyCap = formatNumber(profile.getContractMaxDailyCap()) + " vé/phiếu bàn giao";
        String commission = commission(commissionRate);
        String vendorUnitPrice = formatCurrency(unitPrice) + "/vé";
        String depositRateLabel = formatPercent(depositRate) + " trên tổng giá trị vendor của mỗi phiếu bàn giao";
        String depositFormula = "Tiền cọc = số vé xác nhận bàn giao × " + formatCurrency(unitPrice)
                + " × " + formatPercent(depositRate) + ".";
        String returnCutoff = stringConfig(SystemConfigEnum.VENDOR_RETURN_CUTOFF);
        String lateReturnPolicyLabel = latePolicyLabel(lateReturnPolicy);
        String lateReturnSettlement = latePolicySettlement(lateReturnPolicy);

        ContractModel template = requireTemplate();
        return new StreetAgentContractTemplateData(
                template.getTitle(),
                template.getSubtitle(),
                template.getPartyARoleLabel(),
                template.getPartyBRoleLabel(),
                template.getPartyASignatureLabel(),
                template.getPartyBSignatureLabel(),
                template.getFooterNote(),
                ContractArticleInterpolator.interpolate(template, Map.of(
                        "contractStartDate", contractStartDate,
                        "contractEndDate", contractEndDate,
                        "contractMaxDailyCap", contractMaxDailyCap,
                        "commission", commission,
                        "vendorUnitPrice", vendorUnitPrice,
                        "depositRate", depositRateLabel,
                        "depositFormula", depositFormula,
                        "returnCutoff", returnCutoff,
                        "lateReturnPolicy", lateReturnPolicyLabel,
                        "lateReturnSettlement", lateReturnSettlement
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
                fullName(profile),
                profile.getPhone(),
                profile.getCccd(),
                dash(profile.getContactAddress()),
                dash(profile.getContactProvince()),
                dash(profile.getContactWard()),
                dash(profile.getCoverageArea()),
                profile.getContractCode().trim(),
                vietnamClock.today().format(DISPLAY_DATE),
                contractStartDate,
                contractEndDate,
                contractMaxDailyCap,
                commission,
                vendorUnitPrice,
                depositRateLabel,
                depositFormula,
                returnCutoff,
                lateReturnPolicyLabel,
                lateReturnSettlement,
                showPrintAction
        );
    }

    private ContractModel requireTemplate() {
        return contractRepositoryPort.findDefaultByType(ContractType.STREET_AGENT_SALES)
                .orElseThrow(() -> new DomainException(ErrorCode.CONTRACT_TEMPLATE_NOT_FOUND));
    }

    private void requireCompleteContract(StreetAgentProfileModel profile) {
        boolean complete = !blank(profile.getFirstName())
                && !blank(profile.getLastName())
                && !blank(profile.getPhone())
                && !blank(profile.getCccd())
                && !blank(profile.getContractCode())
                && profile.getContractStartDate() != null
                && profile.getContractEndDate() != null
                && profile.hasValidContractDailyCap();
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
