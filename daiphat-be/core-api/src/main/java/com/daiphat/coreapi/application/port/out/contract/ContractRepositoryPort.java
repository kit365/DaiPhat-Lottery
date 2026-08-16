package com.daiphat.coreapi.application.port.out.contract;

import com.daiphat.coreapi.domain.model.contract.ContractModel;
import com.daiphat.coreapi.domain.model.enums.contract.ContractType;

import java.util.List;
import java.util.Optional;

public interface ContractRepositoryPort {

    Optional<ContractModel> findById(Long id);

    Optional<ContractModel> findActiveByType(ContractType type);

    Optional<ContractModel> findDefaultByType(ContractType type);

    Optional<ContractModel> findByCode(String code);

    List<ContractModel> findAllActive();

    List<ContractModel> findAll();

    List<ContractModel> findAllByType(ContractType type);

    long countByType(ContractType type);

    int nextCodeSequence(String prefix);

    void clearDefaultForType(ContractType type, Long excludeId);

    ContractModel save(ContractModel model);
}
