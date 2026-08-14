package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.dto.response.streetagent.VendorConfidenceResponse;
import com.daiphat.coreapi.application.policy.streetagent.VendorConfidencePolicyResolver;
import com.daiphat.coreapi.application.port.in.streetagent.VendorConfidenceServicePort;
import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentProfileRepositoryPort;
import com.daiphat.coreapi.application.port.out.streetagent.VendorSettlementProjectionRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationBatchStatus;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import com.daiphat.coreapi.domain.service.streetagent.VendorConfidenceCalculator;
import com.daiphat.coreapi.shared.time.VietnamClock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VendorConfidenceService implements VendorConfidenceServicePort {

    private final StreetAgentProfileRepositoryPort streetAgentProfileRepositoryPort;
    private final VendorSettlementProjectionRepositoryPort projectionRepositoryPort;
    private final VendorConfidencePolicyResolver confidencePolicyResolver;
    private final VietnamClock vietnamClock;

    @Override
    @Transactional(readOnly = true)
    public VendorConfidenceResponse getConfidence(Long profileId) {
        StreetAgentProfileModel profile = streetAgentProfileRepositoryPort.findById(profileId)
                .orElseThrow(() -> new DomainException(ErrorCode.STREET_AGENT_PROFILE_NOT_FOUND));
        Snapshot snapshot = computeSnapshot(profile);
        return new VendorConfidenceResponse(
                snapshot.score(),
                snapshot.tier(),
                snapshot.capPercentage(),
                snapshot.sampleSize(),
                snapshot.onTimeRate(),
                snapshot.sellThroughRate(),
                snapshot.experienceRate(),
                profile.getConfidenceCalculatedAt()
        );
    }

    @Override
    @Transactional
    public int recalculateAllProfiles() {
        LocalDateTime now = vietnamClock.now();
        int updated = 0;
        for (Long profileId : streetAgentProfileRepositoryPort.findAllActiveIds()) {
            StreetAgentProfileModel profile = streetAgentProfileRepositoryPort.findByIdForUpdate(profileId)
                    .orElse(null);
            if (profile == null) {
                continue;
            }
            applySnapshot(profile, computeSnapshot(profile), now);
            streetAgentProfileRepositoryPort.save(profile);
            updated++;
        }
        return updated;
    }

    private Snapshot computeSnapshot(StreetAgentProfileModel profile) {
        VendorConfidenceCalculator.Policy policy = confidencePolicyResolver.resolveValidatedPolicy();
        List<VendorConfidenceCalculator.BatchSample> samples = projectionRepositoryPort
                .findLastTerminalBatches(profile.getId(), policy.experienceWindow())
                .stream()
                .map(s -> new VendorConfidenceCalculator.BatchSample(
                        AllocationBatchStatus.valueOf(s.status()),
                        s.allocatedQuantity(),
                        s.soldQuantity()))
                .toList();
        VendorConfidenceCalculator.Result result = VendorConfidenceCalculator.calculate(samples, policy);
        return new Snapshot(
                result.score(),
                result.tier(),
                confidencePolicyResolver.capPercentage(result.tier()),
                result.sampleSize(),
                result.onTimeRate(),
                result.sellThroughRate(),
                result.experienceRate()
        );
    }

    private void applySnapshot(StreetAgentProfileModel profile, Snapshot snapshot, LocalDateTime calculatedAt) {
        profile.setConfidenceScore(snapshot.score());
        profile.setConfidenceTier(snapshot.tier());
        profile.setConfidenceCalculatedAt(calculatedAt);
    }

    private record Snapshot(
            java.math.BigDecimal score,
            com.daiphat.coreapi.domain.model.enums.streetagent.VendorConfidenceTier tier,
            java.math.BigDecimal capPercentage,
            int sampleSize,
            java.math.BigDecimal onTimeRate,
            java.math.BigDecimal sellThroughRate,
            java.math.BigDecimal experienceRate
    ) {}
}
