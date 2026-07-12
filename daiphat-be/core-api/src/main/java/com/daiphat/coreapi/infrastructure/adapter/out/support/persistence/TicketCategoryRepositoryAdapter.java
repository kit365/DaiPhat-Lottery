package com.daiphat.coreapi.infrastructure.adapter.out.support;

import com.daiphat.coreapi.application.port.out.support.TicketCategoryRepositoryPort;
import com.daiphat.coreapi.domain.model.support.TicketCategoryModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.support.TicketCategoryPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.support.TicketCategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class TicketCategoryRepositoryAdapter implements TicketCategoryRepositoryPort {

    private final TicketCategoryRepository ticketCategoryRepository;
    private final TicketCategoryPersistenceMapper ticketCategoryPersistenceMapper;

    @Override
    public Optional<TicketCategoryModel> findById(Long id) {
        return ticketCategoryRepository.findById(id)
                .map(ticketCategoryPersistenceMapper::toDomain);
    }

    @Override
    public List<TicketCategoryModel> findAll() {
        return ticketCategoryPersistenceMapper.toDomainList(ticketCategoryRepository.findAll());
    }
}
