package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentProfileRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.streetagent.StreetAgentProfileStatus;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.streetagent.StreetAgentProfilePersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.StreetAgentProfileRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.StreetAgentProfileSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class StreetAgentProfileRepositoryAdapter implements StreetAgentProfileRepositoryPort {

    private final StreetAgentProfileRepository streetAgentProfileRepository;
    private final StreetAgentProfilePersistenceMapper streetAgentProfilePersistenceMapper;

    @Override
    public Optional<StreetAgentProfileModel> findById(Long id) {
        return streetAgentProfileRepository.findById(id)
                .filter(entity -> entity.getDeletedAt() == null)
                .map(streetAgentProfilePersistenceMapper::toDomain);
    }

    @Override
    public StreetAgentProfileModel save(StreetAgentProfileModel profile) {
        var entity = streetAgentProfilePersistenceMapper.toEntity(profile);
        return streetAgentProfilePersistenceMapper.toDomain(streetAgentProfileRepository.save(entity));
    }

    @Override
    public boolean existsByPhone(String phone) {
        return streetAgentProfileRepository.existsByPhone(phone);
    }

    @Override
    public boolean existsByCccd(String cccd) {
        return streetAgentProfileRepository.existsByCccd(cccd);
    }

    @Override
    public boolean existsByPhoneAndIdNot(String phone, Long id) {
        return streetAgentProfileRepository.existsByPhoneAndIdNot(phone, id);
    }

    @Override
    public boolean existsByCccdAndIdNot(String cccd, Long id) {
        return streetAgentProfileRepository.existsByCccdAndIdNot(cccd, id);
    }

    @Override
    public Page<StreetAgentProfileModel> findAll(
            Pageable pageable, String search, StreetAgentProfileStatus status) {
        String normalizedSearch = (search == null || search.isBlank()) ? null : search.trim();
        return streetAgentProfileRepository.findAll(
                        StreetAgentProfileSpecification.filter(normalizedSearch, status),
                        pageable)
                .map(streetAgentProfilePersistenceMapper::toDomain);
    }
}
