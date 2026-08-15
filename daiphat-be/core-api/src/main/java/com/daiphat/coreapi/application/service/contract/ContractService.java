package com.daiphat.coreapi.application.service.contract;

import com.daiphat.coreapi.application.dto.document.ContractArticleView;
import com.daiphat.coreapi.application.dto.document.ContractPdfDocument;
import com.daiphat.coreapi.application.dto.document.PrizePayoutConfirmationContractTemplateData;
import com.daiphat.coreapi.application.dto.document.StreetAgentContractTemplateData;
import com.daiphat.coreapi.application.dto.request.contract.UpsertContractRequest;
import com.daiphat.coreapi.application.dto.request.contract.UpsertContractRequest.ArticleRequest;
import com.daiphat.coreapi.application.dto.response.contract.ContractResponse;
import com.daiphat.coreapi.application.dto.response.contract.ContractResponse.ContractArticleResponse;
import com.daiphat.coreapi.application.port.in.contract.ContractServicePort;
import com.daiphat.coreapi.application.port.out.contract.ContractRepositoryPort;
import com.daiphat.coreapi.application.port.out.document.ContractPdfRendererPort;
import com.daiphat.coreapi.application.port.out.document.PrizePayoutConfirmationContractHtmlRendererPort;
import com.daiphat.coreapi.application.port.out.document.StreetAgentContractHtmlRendererPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.contract.ContractArticle;
import com.daiphat.coreapi.domain.model.contract.ContractModel;
import com.daiphat.coreapi.domain.model.enums.contract.ContractArticleKind;
import com.daiphat.coreapi.domain.model.enums.contract.ContractType;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.shared.time.VietnamClock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ContractService implements ContractServicePort {

    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final ContractRepositoryPort contractRepositoryPort;
    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final StreetAgentContractHtmlRendererPort streetAgentHtmlRendererPort;
    private final PrizePayoutConfirmationContractHtmlRendererPort prizePayoutHtmlRendererPort;
    private final ContractPdfRendererPort contractPdfRendererPort;
    private final VietnamClock vietnamClock;

    @Override
    @Transactional(readOnly = true)
    public List<ContractResponse> list(ContractType type) {
        List<ContractModel> contracts = type == null
                ? contractRepositoryPort.findAll()
                : contractRepositoryPort.findAllByType(type);
        Map<Long, ContractModel> byId = contracts.stream()
                .filter(contract -> contract.getId() != null)
                .collect(Collectors.toMap(ContractModel::getId, Function.identity(), (left, right) -> left));
        return contracts.stream()
                .sorted(Comparator
                        .comparingInt((ContractModel c) -> c.getType() == ContractType.STREET_AGENT_SALES ? 0 : 1)
                        .thenComparing((ContractModel c) -> Boolean.TRUE.equals(c.getIsDefault()) ? 0 : 1)
                        .thenComparing(c -> c.getStaffName() == null ? "" : c.getStaffName()))
                .map(contract -> toResponse(contract, byId.get(contract.getBasedOnId())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ContractResponse getById(Long id) {
        ContractModel contract = require(id);
        ContractModel basedOn = contract.getBasedOnId() == null
                ? null
                : contractRepositoryPort.findById(contract.getBasedOnId()).orElse(null);
        return toResponse(contract, basedOn);
    }

    @Override
    @Transactional
    public ContractResponse create(UpsertContractRequest request) {
        ContractType type = requireType(request.type());
        List<ContractArticle> articles = normalizeArticles(request.articles());
        boolean makeDefault = Boolean.TRUE.equals(request.isDefault())
                || contractRepositoryPort.countByType(type) == 0;
        if (makeDefault) {
            contractRepositoryPort.clearDefaultForType(type, null);
        }

        ContractModel saved = contractRepositoryPort.save(ContractModel.builder()
                .code(nextCode(type))
                .type(type)
                .title(trim(request.title()))
                .staffName(trim(request.staffName()))
                .subtitle(blankToNull(request.subtitle()))
                .partyARoleLabel(trim(request.partyARoleLabel()))
                .partyBRoleLabel(trim(request.partyBRoleLabel()))
                .partyASignatureLabel(trim(request.partyASignatureLabel()))
                .partyBSignatureLabel(trim(request.partyBSignatureLabel()))
                .footerNote(blankToNull(request.footerNote()))
                .articles(articles)
                .isDefault(makeDefault)
                .active(true)
                .build());
        return toResponse(saved, null);
    }

    @Override
    @Transactional
    public ContractResponse update(Long id, UpsertContractRequest request) {
        ContractModel existing = require(id);
        ContractType type = requireType(request.type());
        if (existing.getType() != type && Boolean.TRUE.equals(existing.getIsDefault())) {
            throw new DomainException(ErrorCode.CONTRACT_DEFAULT_REQUIRED);
        }

        List<ContractArticle> articles = normalizeArticles(request.articles());
        boolean makeDefault = Boolean.TRUE.equals(request.isDefault());
        if (makeDefault) {
            contractRepositoryPort.clearDefaultForType(type, existing.getId());
        } else if (Boolean.TRUE.equals(existing.getIsDefault()) && existing.getType() == type) {
            // Keep current default unless caller explicitly moves it; clearing without replacement is blocked.
            makeDefault = true;
        }

        existing.setType(type);
        existing.setTitle(trim(request.title()));
        existing.setStaffName(trim(request.staffName()));
        existing.setSubtitle(blankToNull(request.subtitle()));
        existing.setPartyARoleLabel(trim(request.partyARoleLabel()));
        existing.setPartyBRoleLabel(trim(request.partyBRoleLabel()));
        existing.setPartyASignatureLabel(trim(request.partyASignatureLabel()));
        existing.setPartyBSignatureLabel(trim(request.partyBSignatureLabel()));
        existing.setFooterNote(blankToNull(request.footerNote()));
        existing.setArticles(articles);
        existing.setIsDefault(makeDefault);
        existing.setActive(true);

        ContractModel saved = contractRepositoryPort.save(existing);
        ContractModel basedOn = saved.getBasedOnId() == null
                ? null
                : contractRepositoryPort.findById(saved.getBasedOnId()).orElse(null);
        return toResponse(saved, basedOn);
    }

    @Override
    @Transactional
    public ContractResponse setDefault(Long id) {
        ContractModel contract = require(id);
        contractRepositoryPort.clearDefaultForType(contract.getType(), contract.getId());
        contract.setIsDefault(true);
        contract.setActive(true);
        ContractModel saved = contractRepositoryPort.save(contract);
        return toResponse(saved, null);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        ContractModel contract = require(id);
        if (Boolean.TRUE.equals(contract.getIsDefault())) {
            throw new DomainException(ErrorCode.CONTRACT_DEFAULT_REQUIRED);
        }
        if (contractRepositoryPort.countByType(contract.getType()) <= 1) {
            throw new DomainException(ErrorCode.CONTRACT_LAST_OF_TYPE);
        }
        contract.setActive(false);
        contract.setIsDefault(false);
        contract.setDeletedAt(vietnamClock.now());
        contractRepositoryPort.save(contract);
    }

    @Override
    @Transactional(readOnly = true)
    public ContractPdfDocument previewPdf(Long id) {
        return renderPreview(require(id));
    }

    @Override
    @Transactional(readOnly = true)
    public ContractPdfDocument previewDefaultPdf(ContractType type) {
        ContractType resolved = requireType(type);
        ContractModel contract = contractRepositoryPort.findDefaultByType(resolved)
                .orElseThrow(() -> new DomainException(ErrorCode.CONTRACT_TEMPLATE_NOT_FOUND));
        return renderPreview(contract);
    }

    private ContractPdfDocument renderPreview(ContractModel template) {
        List<ContractArticleView> articles = ContractArticleInterpolator.interpolate(template, Map.of());
        String today = vietnamClock.today().format(DISPLAY_DATE);
        byte[] pdf;
        String fileName;
        if (template.getType() == ContractType.PRIZE_PAYOUT) {
            PrizePayoutConfirmationContractTemplateData data = new PrizePayoutConfirmationContractTemplateData(
                    template.getTitle(),
                    template.getSubtitle(),
                    template.getPartyARoleLabel(),
                    template.getPartyBRoleLabel(),
                    template.getPartyASignatureLabel(),
                    template.getPartyBSignatureLabel(),
                    template.getFooterNote(),
                    articles,
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
                    "{{recipientFullName}}",
                    "{{recipientIdNumber}}",
                    "{{recipientPhone}}",
                    template.getCode(),
                    today,
                    "{{taxPolicy}}",
                    "{{commissionPolicy}}",
                    "{{complaintPolicy}}",
                    "{{additionalTerms}}",
                    "{{totalGrossAmount}}",
                    "{{totalTaxAmount}}",
                    "{{totalCommissionAmount}}",
                    "{{totalNetAmount}}",
                    List.of(),
                    false
            );
            pdf = contractPdfRendererPort.renderPdf(prizePayoutHtmlRendererPort.render(data));
            fileName = "mau-hop-dong-nhan-thuong-" + safe(template.getCode()) + ".pdf";
        } else {
            StreetAgentContractTemplateData data = new StreetAgentContractTemplateData(
                    template.getTitle(),
                    template.getSubtitle(),
                    template.getPartyARoleLabel(),
                    template.getPartyBRoleLabel(),
                    template.getPartyASignatureLabel(),
                    template.getPartyBSignatureLabel(),
                    template.getFooterNote(),
                    articles,
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
                    "{{vendorFullName}}",
                    "{{vendorPhone}}",
                    "{{vendorCccd}}",
                    "{{vendorAddress}}",
                    "{{vendorProvince}}",
                    "{{vendorWard}}",
                    "{{vendorCoverageArea}}",
                    template.getCode(),
                    today,
                    "{{contractStartDate}}",
                    "{{contractEndDate}}",
                    "{{contractMaxDailyCap}}",
                    "{{commission}}",
                    "{{vendorUnitPrice}}",
                    "{{depositRate}}",
                    "{{depositFormula}}",
                    "{{returnCutoff}}",
                    "{{lateReturnPolicy}}",
                    "{{lateReturnSettlement}}",
                    false
            );
            pdf = contractPdfRendererPort.renderPdf(streetAgentHtmlRendererPort.render(data));
            fileName = "mau-hop-dong-cong-tac-" + safe(template.getCode()) + ".pdf";
        }
        return new ContractPdfDocument(pdf, fileName);
    }

    private ContractModel require(Long id) {
        return contractRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.CONTRACT_NOT_FOUND));
    }

    private ContractType requireType(ContractType type) {
        if (type == null) {
            throw new DomainException(ErrorCode.CONTRACT_INVALID_TYPE);
        }
        return type;
    }

    private List<ContractArticle> normalizeArticles(List<ArticleRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new DomainException(ErrorCode.CONTRACT_ARTICLES_REQUIRED);
        }
        List<ContractArticle> articles = new ArrayList<>();
        int index = 1;
        for (ArticleRequest request : requests) {
            ContractArticleKind kind = request.kind() == null ? ContractArticleKind.TEXT : request.kind();
            String code = blank(request.code()) ? "ART_" + index : request.code().trim().toUpperCase(Locale.ROOT);
            articles.add(ContractArticle.builder()
                    .code(code)
                    .ordinal(request.ordinal() == null ? index : request.ordinal())
                    .title(trim(request.title()))
                    .kind(kind)
                    .body(request.body() == null ? "" : request.body())
                    .build());
            index++;
        }
        articles.sort(Comparator.comparingInt(a -> a.getOrdinal() == null ? 0 : a.getOrdinal()));
        for (int i = 0; i < articles.size(); i++) {
            articles.get(i).setOrdinal(i + 1);
        }
        return articles;
    }

    private String nextCode(ContractType type) {
        String prefix = type == ContractType.PRIZE_PAYOUT ? "TPL-PAYOUT-" : "TPL-SALES-";
        int seq = contractRepositoryPort.nextCodeSequence(prefix);
        String code;
        do {
            code = prefix + String.format(Locale.ROOT, "%03d", seq++);
        } while (contractRepositoryPort.findByCode(code).isPresent());
        return code;
    }

    private ContractResponse toResponse(ContractModel contract, ContractModel basedOn) {
        return new ContractResponse(
                contract.getId(),
                contract.getCode(),
                contract.getType() == null ? null : contract.getType().name(),
                contract.getType() == null ? null : contract.getType().getLabel(),
                contract.getTitle(),
                contract.getStaffName(),
                contract.getSubtitle(),
                contract.getPartyARoleLabel(),
                contract.getPartyBRoleLabel(),
                contract.getPartyASignatureLabel(),
                contract.getPartyBSignatureLabel(),
                articles(contract),
                contract.getFooterNote(),
                contract.getBasedOnId(),
                basedOn == null ? null : basedOn.getCode(),
                basedOn == null ? null : basedOn.getTitle(),
                Boolean.TRUE.equals(contract.getIsDefault()),
                contract.getActive()
        );
    }

    private List<ContractArticleResponse> articles(ContractModel contract) {
        if (contract.getArticles() == null) {
            return List.of();
        }
        return contract.getArticles().stream()
                .sorted(Comparator.comparingInt(article -> article.getOrdinal() == null ? 0 : article.getOrdinal()))
                .map(article -> {
                    ContractArticleKind kind = article.getKind() == null ? ContractArticleKind.TEXT : article.getKind();
                    return new ContractArticleResponse(
                            article.getCode(),
                            article.getOrdinal(),
                            article.getTitle(),
                            kind.name(),
                            article.getBody()
                    );
                })
                .toList();
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
        return blank(value) ? "—" : value.trim();
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

    private static String safe(String code) {
        return code == null ? "mau" : code.replaceAll("[^A-Za-z0-9._-]", "-");
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }

    private static String blankToNull(String value) {
        return blank(value) ? null : value.trim();
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
