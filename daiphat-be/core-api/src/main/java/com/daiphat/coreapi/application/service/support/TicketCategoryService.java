package com.daiphat.coreapi.application.service.support;

import com.daiphat.coreapi.application.dto.response.support.TicketCategoryResponse;
import com.daiphat.coreapi.application.mapper.support.SupportApplicationMapper;
import com.daiphat.coreapi.application.port.in.support.TicketCategoryServicePort;
import com.daiphat.coreapi.application.port.out.support.TicketCategoryRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TicketCategoryService implements TicketCategoryServicePort {

    private final TicketCategoryRepositoryPort ticketCategoryRepositoryPort;
    private final SupportApplicationMapper supportApplicationMapper;

    @Override
    @Transactional(readOnly = true)
    public List<TicketCategoryResponse> getActiveCategories() {
        return supportApplicationMapper.toCategoryResponses(ticketCategoryRepositoryPort.findAll());
    }
}
