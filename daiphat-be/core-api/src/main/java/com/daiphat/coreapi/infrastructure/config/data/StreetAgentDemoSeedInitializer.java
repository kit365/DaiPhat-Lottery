package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.streetagent.StreetAgentProfileStatus;
import com.daiphat.coreapi.domain.model.enums.streetagent.VendorConfidenceTier;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.StreetAgentProfileEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.StreetAgentProfileRepository;
import com.daiphat.coreapi.shared.time.VietnamClock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Ensures AuthSeed {@code street_agent} has an ACTIVE profile + signed contract so
 * vendor allocation / handover can be exercised end-to-end when auth seed is on.
 */
@Component
@Order(25)
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "daiphat.auth.seed.enabled", havingValue = "true")
public class StreetAgentDemoSeedInitializer implements ApplicationRunner {

    private static final String DEMO_PHONE = "0908111222";
    private static final String DEMO_CCCD = "079099001122";
    private static final int DEMO_DAILY_CAP = 500;
    private static final BigDecimal DEMO_COMMISSION = new BigDecimal("0.0800");

    private final SeedAccountResolver seedAccountResolver;
    private final StreetAgentProfileRepository streetAgentProfileRepository;
    private final VietnamClock vietnamClock;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        UserEntity agent = seedAccountResolver.findStreetAgent();
        if (agent == null) {
            log.warn("Skip street-agent demo profile: AuthSeed street_agent user missing.");
            return;
        }

        LocalDate today = vietnamClock.today();
        LocalDateTime now = vietnamClock.now();

        StreetAgentProfileEntity profile = streetAgentProfileRepository
                .findByUser_IdAndDeletedAtIsNull(agent.getId())
                .orElseGet(() -> StreetAgentProfileEntity.builder()
                        .user(agent)
                        .firstName(blankToDefault(agent.getFirstName(), "Demo"))
                        .lastName(blankToDefault(agent.getLastName(), "StreetAgent"))
                        .phone(DEMO_PHONE)
                        .cccd(DEMO_CCCD)
                        .createdBy(SharedSeedConstants.STREET_AGENT_SEED_MARKER)
                        .build());

        profile.setUser(agent);
        profile.setFirstName(blankToDefault(agent.getFirstName(), profile.getFirstName()));
        profile.setLastName(blankToDefault(agent.getLastName(), profile.getLastName()));
        if (profile.getPhone() == null || profile.getPhone().isBlank()) {
            profile.setPhone(DEMO_PHONE);
        }
        if (profile.getCccd() == null || profile.getCccd().isBlank()) {
            profile.setCccd(DEMO_CCCD);
        }
        profile.setContactAddress("12 Nguyen Hue");
        profile.setContactProvince("TP. Ho Chi Minh");
        profile.setContactWard("Ben Nghe");
        profile.setCoverageArea("Quan 1");
        profile.setCommissionRate(DEMO_COMMISSION);
        profile.setContractCode(SharedSeedConstants.STREET_AGENT_CONTRACT_CODE);
        profile.setContractDocumentUrl(SharedSeedConstants.STREET_AGENT_CONTRACT_DOC_URL);
        profile.setContractStartDate(today.minusMonths(1));
        profile.setContractEndDate(today.plusYears(1));
        profile.setContractMaxDailyCap(DEMO_DAILY_CAP);
        profile.setDepositBalance(BigDecimal.ZERO);
        profile.setDepositAdjustmentReason(null);
        profile.setConfidenceScore(new BigDecimal("40.00"));
        profile.setConfidenceTier(VendorConfidenceTier.NEW);
        profile.setStatus(StreetAgentProfileStatus.ACTIVE);
        profile.setUpdatedAt(now);
        profile.setLastModifiedBy(SharedSeedConstants.STREET_AGENT_SEED_MARKER);
        if (profile.getCreatedBy() == null) {
            profile.setCreatedBy(SharedSeedConstants.STREET_AGENT_SEED_MARKER);
        }
        if (profile.getCreatedAt() == null) {
            profile.setCreatedAt(now);
        }

        streetAgentProfileRepository.save(profile);
        log.info(
                "Street-agent demo profile ready: user={}, profileId={}, dailyCap={}, contract={}.",
                agent.getUsername(),
                profile.getId(),
                DEMO_DAILY_CAP,
                SharedSeedConstants.STREET_AGENT_CONTRACT_CODE
        );
    }

    private static String blankToDefault(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value;
    }
}
