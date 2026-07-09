package com.daiphat.coreapi.application.port.out.chat;

import com.daiphat.coreapi.domain.model.chat.AiServiceConfigModel;
import com.daiphat.coreapi.domain.model.enums.chat.AiServiceName;

import java.util.Optional;

public interface AiServiceConfigRepositoryPort {

    Optional<AiServiceConfigModel> findActiveByServiceName(AiServiceName serviceName);
}
