package com.daiphat.coreapi.application.port.out.support;

import com.daiphat.coreapi.domain.model.support.TicketCategoryModel;

import java.util.List;
import java.util.Optional;

public interface TicketCategoryRepositoryPort {

    Optional<TicketCategoryModel> findById(Long id);

    List<TicketCategoryModel> findAll();
}
