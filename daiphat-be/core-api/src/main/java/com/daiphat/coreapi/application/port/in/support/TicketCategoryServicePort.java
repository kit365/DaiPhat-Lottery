package com.daiphat.coreapi.application.port.in.support;

import com.daiphat.coreapi.application.dto.response.support.TicketCategoryResponse;

import java.util.List;

public interface TicketCategoryServicePort {

    List<TicketCategoryResponse> getActiveCategories();

    TicketCategoryResponse updateCategory(Long id, com.daiphat.coreapi.application.dto.request.support.UpdateTicketCategoryRequest request);
}
