package com.daiphat.coreapi.application.port.in.streetagent;

import com.daiphat.coreapi.application.dto.request.streetagent.UpsertLuckyPatternConfigRequest;
import com.daiphat.coreapi.application.dto.response.streetagent.LuckyPatternConfigResponse;

import java.util.List;

public interface LuckyPatternConfigServicePort {
    List<LuckyPatternConfigResponse> getAll();
    LuckyPatternConfigResponse create(UpsertLuckyPatternConfigRequest request);
    LuckyPatternConfigResponse update(Long id, UpsertLuckyPatternConfigRequest request);
    void recomputeAll();
}
