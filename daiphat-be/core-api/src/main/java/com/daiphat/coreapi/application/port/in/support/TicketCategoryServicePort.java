package com.daiphat.coreapi.application.port.in.support;

import com.daiphat.coreapi.application.dto.response.support.TicketCategoryResponse;

import java.util.List;

public interface TicketCategoryServicePort {

    List<TicketCategoryResponse> getActiveCategories();
}
