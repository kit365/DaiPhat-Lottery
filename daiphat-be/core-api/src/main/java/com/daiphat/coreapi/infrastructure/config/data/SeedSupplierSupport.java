package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.lottery.LotterySupplierType;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotterySupplierEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotterySupplierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

/**
 * Keeps the supplier master list free of retired test/demo/QA records.
 * Official-demo mode keeps only the current official Minh Chính supplier.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SeedSupplierSupport {

    private static final String ACTOR = SharedSeedConstants.INVENTORY_ACTOR;
    private static final BigDecimal DEFAULT_IMPORT_COST = BigDecimal.valueOf(10_000);

    /** Former seed codes that must not remain active in supplier pickers. */
    private static final Set<String> RETIRED_CODES = Set.of(
            "DOI_SOAT_QA",
            "LOCAL-VENDOR-TEST",
            "LOCAL-LUCKY-TEST"
    );

    private final LotterySupplierRepository lotterySupplierRepository;

    public LotterySupplierEntity ensureMinhChinh(LocalDateTime now) {
        return upsert(
                SharedSeedConstants.SUPPLIER_MINH_CHINH_CODE,
                SharedSeedConstants.SUPPLIER_MINH_CHINH_NAME,
                "Nguyễn Văn Minh",
                "0909123456",
                "minhchinh@daiphat.com",
                "123 Nguyễn Huệ, phường Sài Gòn, Thành phố Hồ Chí Minh",
                "0312345678",
                0,
                now
        );
    }

    /**
     * Soft-delete + deactivate retired demo suppliers so the picker only shows
     * the current official Minh Chính supplier after seed.
     */
    public int retireDemoSuppliers(LocalDateTime now) {
        int retired = 0;
        List<LotterySupplierEntity> all = lotterySupplierRepository.findAll();
        for (LotterySupplierEntity supplier : all) {
            if (supplier.getDeletedAt() != null) {
                continue;
            }
            String code = supplier.getCode() == null ? "" : supplier.getCode().trim();
            boolean retiredCode = RETIRED_CODES.stream().anyMatch(c -> c.equalsIgnoreCase(code));
            boolean looksDemo = looksLikeDemoLabel(supplier.getName()) || looksLikeDemoLabel(code);
            boolean legacyMinhNgoc = "MINH_NGOC".equalsIgnoreCase(code);
            boolean keepCanonical = SharedSeedConstants.SUPPLIER_MINH_CHINH_CODE.equalsIgnoreCase(code);
            retiredCode = retiredCode || legacyMinhNgoc;
            if (keepCanonical || (!retiredCode && !looksDemo)) {
                continue;
            }
            supplier.setActive(false);
            supplier.setDeletedAt(now);
            supplier.setUpdatedAt(now);
            supplier.setLastModifiedBy(ACTOR);
            lotterySupplierRepository.save(supplier);
            retired++;
            log.info("Retired demo/test lottery supplier '{}' (code={}).", supplier.getName(), code);
        }
        return retired;
    }

    private LotterySupplierEntity upsert(
            String code,
            String name,
            String contactName,
            String phone,
            String email,
            String address,
            String taxCode,
            int paymentTermDays,
            LocalDateTime now
    ) {
        return lotterySupplierRepository.findByCodeIgnoreCaseAndDeletedAtIsNull(code)
                .map(existing -> {
                    existing.setName(name);
                    existing.setType(LotterySupplierType.DISTRIBUTOR);
                    existing.setContactName(contactName);
                    existing.setContactPhone(phone);
                    existing.setContactEmail(email);
                    existing.setAddress(address);
                    existing.setTaxCode(taxCode);
                    existing.setPaymentTermDays(paymentTermDays);
                    existing.setDefaultImportCost(DEFAULT_IMPORT_COST);
                    existing.setImportAllowFrom(LocalTime.of(8, 0));
                    existing.setReturnCutOffTime(LocalTime.of(14, 30));
                    existing.setPaymentCutOffTime(LocalTime.of(18, 0));
                    existing.setActive(true);
                    existing.setUpdatedAt(now);
                    existing.setLastModifiedBy(ACTOR);
                    return lotterySupplierRepository.save(existing);
                })
                .orElseGet(() -> lotterySupplierRepository.save(
                        LotterySupplierEntity.builder()
                                .name(name)
                                .code(code)
                                .type(LotterySupplierType.DISTRIBUTOR)
                                .contactName(contactName)
                                .contactPhone(phone)
                                .contactEmail(email)
                                .address(address)
                                .taxCode(taxCode)
                                .paymentTermDays(paymentTermDays)
                                .defaultImportCost(DEFAULT_IMPORT_COST)
                                .importAllowFrom(LocalTime.of(8, 0))
                                .returnCutOffTime(LocalTime.of(14, 30))
                                .paymentCutOffTime(LocalTime.of(18, 0))
                                .isActive(true)
                                .createdAt(now)
                                .updatedAt(now)
                                .createdBy(ACTOR)
                                .lastModifiedBy(ACTOR)
                                .build()
                ));
    }

    private static boolean looksLikeDemoLabel(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        String n = value.toLowerCase();
        return n.contains("test")
                || n.contains("demo")
                || n.contains("qa")
                || n.contains("local-")
                || n.contains("fixture")
                || n.contains("đối soát qa")
                || n.contains("doi_soat");
    }
}
