package com.daiphat.coreapi.application.port.in.streetagent;

import com.daiphat.coreapi.application.dto.response.streetagent.VendorConfidenceResponse;

public interface VendorConfidenceServicePort {
    VendorConfidenceResponse getConfidence(Long profileId);

    /** Recalculates and persists confidence for every active street-agent profile. */
    int recalculateAllProfiles();
}
