package com.daiphat.coreapi.infrastructure.adapter.out.contract.persistence;

import com.daiphat.coreapi.application.port.out.contract.ContractRepositoryPort;
import com.daiphat.coreapi.domain.model.contract.ContractModel;
import com.daiphat.coreapi.domain.model.enums.contract.ContractType;
import com.daiphat.coreapi.infrastructure.persistence.entity.contract.ContractEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.contract.ContractPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.contract.ContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class ContractRepositoryAdapter implements ContractRepositoryPort {

    private final ContractRepository contractRepository;
    private final ContractPersistenceMapper contractPersistenceMapper;

    @Override
    public Optional<ContractModel> findById(Long id) {
        return contractRepository.findByIdAndDeletedAtIsNull(id)
                .map(contractPersistenceMapper::toDomain);
    }

    @Override
    public Optional<ContractModel> findActiveByType(ContractType type) {
        return findDefaultByType(type)
                .or(() -> contractRepository.findFirstByTypeAndActiveTrueAndDeletedAtIsNullOrderByIdAsc(type)
                        .map(contractPersistenceMapper::toDomain));
    }

    @Override
    public Optional<ContractModel> findDefaultByType(ContractType type) {
        return contractRepository.findFirstByTypeAndIsDefaultTrueAndDeletedAtIsNull(type)
                .map(contractPersistenceMapper::toDomain);
    }

    @Override
    public Optional<ContractModel> findByCode(String code) {
        return contractRepository.findByCodeAndDeletedAtIsNull(code)
                .map(contractPersistenceMapper::toDomain);
    }

    @Override
    public List<ContractModel> findAllActive() {
        return contractRepository.findAllByActiveTrueAndDeletedAtIsNullOrderByIdAsc().stream()
                .map(contractPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public List<ContractModel> findAll() {
        return contractRepository.findAllByDeletedAtIsNullOrderByIdAsc().stream()
                .map(contractPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public List<ContractModel> findAllByType(ContractType type) {
        return contractRepository.findAllByTypeAndDeletedAtIsNullOrderByIsDefaultDescIdAsc(type).stream()
                .map(contractPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public long countByType(ContractType type) {
        return contractRepository.countByTypeAndDeletedAtIsNull(type);
    }

    @Override
    public int nextCodeSequence(String prefix) {
        int max = 0;
        for (ContractEntity entity : contractRepository.findAllByCodeStartingWithAndDeletedAtIsNull(prefix)) {
            String code = entity.getCode();
            if (code == null || code.length() <= prefix.length()) {
                continue;
            }
            String suffix = code.substring(prefix.length());
            try {
                max = Math.max(max, Integer.parseInt(suffix));
            } catch (NumberFormatException ignored) {
                // skip non-numeric suffixes
            }
        }
        return max + 1;
    }

    @Override
    public void clearDefaultForType(ContractType type, Long excludeId) {
        contractRepository.clearDefaultForType(type, excludeId);
    }

    @Override
    public ContractModel save(ContractModel model) {
        ContractEntity entity;
        if (model.getId() != null) {
            entity = contractRepository.findById(model.getId()).orElseGet(ContractEntity::new);
            ContractEntity mapped = contractPersistenceMapper.toEntity(model);
            entity.setCode(mapped.getCode());
            entity.setType(mapped.getType());
            entity.setTitle(mapped.getTitle());
            entity.setStaffName(mapped.getStaffName());
            entity.setSubtitle(mapped.getSubtitle());
            entity.setPartyARoleLabel(mapped.getPartyARoleLabel());
            entity.setPartyBRoleLabel(mapped.getPartyBRoleLabel());
            entity.setPartyASignatureLabel(mapped.getPartyASignatureLabel());
            entity.setPartyBSignatureLabel(mapped.getPartyBSignatureLabel());
            entity.setArticles(mapped.getArticles());
            entity.setFooterNote(mapped.getFooterNote());
            entity.setBasedOnId(mapped.getBasedOnId());
            entity.setIsDefault(mapped.getIsDefault());
            entity.setActive(mapped.getActive());
            entity.setDeletedAt(mapped.getDeletedAt() != null ? mapped.getDeletedAt() : entity.getDeletedAt());
        } else {
            entity = contractPersistenceMapper.toEntity(model);
        }
        return contractPersistenceMapper.toDomain(contractRepository.save(entity));
    }
}
