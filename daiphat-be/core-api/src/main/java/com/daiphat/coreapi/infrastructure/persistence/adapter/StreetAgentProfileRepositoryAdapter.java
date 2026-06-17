package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.streetagent.StreetAgentProfileRepositoryPort;
import com.daiphat.coreapi.domain.model.streetagent.StreetAgentProfileModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.streetagent.StreetAgentProfilePersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.streetagent.StreetAgentProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StreetAgentProfileRepositoryAdapter implements StreetAgentProfileRepositoryPort {

    private final StreetAgentProfileRepository streetAgentProfileRepository;
    private final StreetAgentProfilePersistenceMapper streetAgentProfilePersistenceMapper;

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
}
