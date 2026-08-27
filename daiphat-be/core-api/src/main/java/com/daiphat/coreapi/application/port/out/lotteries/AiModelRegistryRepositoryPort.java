package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.AiModelRegistryModel;

import java.util.List;
import java.util.Optional;

public interface AiModelRegistryRepositoryPort {

    Optional<AiModelRegistryModel> findById(Long id);

    List<AiModelRegistryModel> findAllActive();

    Optional<AiModelRegistryModel> findDefaultActiveByProvider(String provider);

    Optional<AiModelRegistryModel> findAnyActiveDefault();

    AiModelRegistryModel save(AiModelRegistryModel model);
}
