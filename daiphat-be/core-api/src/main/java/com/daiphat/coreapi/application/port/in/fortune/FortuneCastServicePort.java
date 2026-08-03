package com.daiphat.coreapi.application.port.in.fortune;

import com.daiphat.coreapi.application.dto.request.fortune.CastFortuneRequest;
import com.daiphat.coreapi.application.dto.response.fortune.FortuneCastResponse;

import java.util.Optional;
import java.util.UUID;

public interface FortuneCastServicePort {

    FortuneCastResponse cast(UUID userId, CastFortuneRequest request);

    Optional<FortuneCastResponse> getToday(UUID userId);
}
