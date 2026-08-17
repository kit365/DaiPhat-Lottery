package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.application.port.out.contract.ContractRepositoryPort;
import com.daiphat.coreapi.domain.model.contract.ContractArticle;
import com.daiphat.coreapi.domain.model.contract.ContractModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Ensures default sales + prize-payout contract templates exist for local/prod bootstraps.
 * Idempotent by template code ({@link ContractSeedCatalog#SALES_CODE}, {@link ContractSeedCatalog#PAYOUT_CODE}).
 * Also replaces known local stub bodies ("Seed template.") left from early manual inserts.
 */
@Component
@Order(120)
@RequiredArgsConstructor
@Slf4j
public class ContractSeedInitializer implements ApplicationRunner {

    private final ContractRepositoryPort contractRepositoryPort;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        ContractModel sales = ensureSalesTemplate();
        ensurePayoutTemplate(sales != null ? sales.getId() : null);
    }

    private ContractModel ensureSalesTemplate() {
        return contractRepositoryPort.findByCode(ContractSeedCatalog.SALES_CODE)
                .map(existing -> refreshIfStub(existing, ContractSeedCatalog.salesTemplate()))
                .orElseGet(() -> {
                    ContractModel saved = contractRepositoryPort.save(ContractSeedCatalog.salesTemplate());
                    log.info("Seeded default street-agent contract template id={} code={}",
                            saved.getId(), saved.getCode());
                    return saved;
                });
    }

    private void ensurePayoutTemplate(Long salesId) {
        contractRepositoryPort.findByCode(ContractSeedCatalog.PAYOUT_CODE)
                .ifPresentOrElse(
                        existing -> refreshIfStub(existing, ContractSeedCatalog.payoutTemplate(salesId)),
                        () -> {
                            ContractModel saved = contractRepositoryPort.save(
                                    ContractSeedCatalog.payoutTemplate(salesId));
                            log.info("Seeded default prize-payout contract template id={} code={} basedOnId={}",
                                    saved.getId(), saved.getCode(), salesId);
                        });
    }

    private ContractModel refreshIfStub(ContractModel existing, ContractModel canonical) {
        if (!isStub(existing.getArticles())) {
            return existing;
        }
        existing.setTitle(canonical.getTitle());
        existing.setStaffName(canonical.getStaffName());
        existing.setSubtitle(canonical.getSubtitle());
        existing.setPartyARoleLabel(canonical.getPartyARoleLabel());
        existing.setPartyBRoleLabel(canonical.getPartyBRoleLabel());
        existing.setPartyASignatureLabel(canonical.getPartyASignatureLabel());
        existing.setPartyBSignatureLabel(canonical.getPartyBSignatureLabel());
        existing.setFooterNote(canonical.getFooterNote());
        existing.setArticles(canonical.getArticles());
        if (canonical.getBasedOnId() != null) {
            existing.setBasedOnId(canonical.getBasedOnId());
        }
        existing.setIsDefault(true);
        existing.setActive(true);
        ContractModel saved = contractRepositoryPort.save(existing);
        log.info("Refreshed stub contract template id={} code={}", saved.getId(), saved.getCode());
        return saved;
    }

    private static boolean isStub(List<ContractArticle> articles) {
        if (articles == null || articles.isEmpty()) {
            return true;
        }
        return articles.stream().anyMatch(a -> {
            String body = a.getBody();
            return body != null && body.toLowerCase().contains("seed template");
        });
    }
}
