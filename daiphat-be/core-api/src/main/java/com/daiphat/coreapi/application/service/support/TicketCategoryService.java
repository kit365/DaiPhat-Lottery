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

    @Override
    @Transactional
    public TicketCategoryResponse updateCategory(Long id, com.daiphat.coreapi.application.dto.request.support.UpdateTicketCategoryRequest request) {
        var category = ticketCategoryRepositoryPort.findById(id)
                .orElseThrow(() -> new com.daiphat.coreapi.domain.exception.DomainException(com.daiphat.coreapi.domain.exception.ErrorCode.TICKET_CATEGORY_NOT_FOUND));

        if (category.getPriority() != request.getPriority()) {
            boolean exists = ticketCategoryRepositoryPort.existsByParentIdAndPriorityAndIdNot(category.getParentId(), request.getPriority(), id);
            if (exists) {
                throw new com.daiphat.coreapi.domain.exception.DomainException(com.daiphat.coreapi.domain.exception.ErrorCode.INVALID_INPUT, "Độ ưu tiên này đã tồn tại trong cùng cấp danh mục. Vui lòng chọn giá trị khác.");
            }
        }

        category.setPriority(request.getPriority());
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        boolean statusChanged = category.isActive() != request.getIsActive();
        category.setActive(request.getIsActive());

        var savedCategory = ticketCategoryRepositoryPort.save(category);

        if (statusChanged && category.getParentId() == null) {
            List<com.daiphat.coreapi.domain.model.support.TicketCategoryModel> allCategories = ticketCategoryRepositoryPort.findAll();
            for (var child : allCategories) {
                if (savedCategory.getId().equals(child.getParentId())) {
                    child.setActive(request.getIsActive());
                    ticketCategoryRepositoryPort.save(child);
                }
            }
        }

        return supportApplicationMapper.toCategoryResponse(savedCategory);
    }
}
