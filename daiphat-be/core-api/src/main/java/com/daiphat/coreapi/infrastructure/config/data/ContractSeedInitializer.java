package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.contract.ContractModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.contract.ContractEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.contract.ContractPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.contract.ContractRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Inserts the two canonical templates only when missing.
 * Does not overwrite operator edits after the first seed.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ContractSeedInitializer {

    private final ContractRepository contractRepository;
    private final ContractPersistenceMapper contractPersistenceMapper;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seed() {
        ContractEntity sales = insertIfMissing(ContractSeedCatalog.salesTemplate(), null);
        ContractEntity payout = insertIfMissing(ContractSeedCatalog.payoutTemplate(sales.getId()), sales.getId());
        log.info("System: Contract templates ready — sales={}, payout={}, basedOnSales={}.",
                sales.getCode(), payout.getCode(), payout.getBasedOnId());
    }

    private ContractEntity insertIfMissing(ContractModel catalog, Long basedOnId) {
        return contractRepository.findByCodeAndDeletedAtIsNull(catalog.getCode())
                .orElseGet(() -> {
                    ContractEntity entity = contractPersistenceMapper.toEntity(catalog);
                    entity.setBasedOnId(basedOnId);
                    if (entity.getStaffName() == null || entity.getStaffName().isBlank()) {
                        entity.setStaffName(entity.getTitle());
                    }
                    if (entity.getIsDefault() == null) {
                        entity.setIsDefault(true);
                    }
                    entity.setActive(true);
                    entity.setDeletedAt(null);
                    return contractRepository.save(entity);
                });
    }
}
