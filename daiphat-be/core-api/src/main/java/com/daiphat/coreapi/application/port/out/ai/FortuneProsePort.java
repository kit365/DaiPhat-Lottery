package com.daiphat.coreapi.application.port.out.ai;

import com.daiphat.coreapi.application.dto.request.fortune.FortuneProseAiRequest;

import java.util.Optional;

/**
 * Dedicated fortune-cast prose generator — independent from chatbot AI.
 */
public interface FortuneProsePort {

    Optional<String> generateProse(FortuneProseAiRequest request);
}
