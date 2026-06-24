package com.daiphat.coreapi.infrastructure.persistence.mapper.support;

import com.daiphat.coreapi.domain.model.support.SupportTicketModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.support.SupportTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.support.TicketCategoryEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.UUID;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SupportTicketPersistenceMapper {

    @Mapping(target = "ticketCategoryId", source = "ticketCategory.id")
    @Mapping(target = "customerId", source = "customer.id")
    @Mapping(target = "assignedTo", source = "assignedTo.id")
    SupportTicketModel toDomain(SupportTicketEntity entity);

    @Mapping(target = "ticketCategory", source = "ticketCategoryId")
    @Mapping(target = "customer", source = "customerId")
    @Mapping(target = "assignedTo", source = "assignedTo")
    SupportTicketEntity toEntity(SupportTicketModel domain);

    default TicketCategoryEntity mapCategoryId(Long categoryId) {
        if (categoryId == null) {
            return null;
        }
        TicketCategoryEntity category = new TicketCategoryEntity();
        category.setId(categoryId);
        return category;
    }

    default UserEntity mapUserId(UUID userId) {
        if (userId == null) {
            return null;
        }
        UserEntity user = new UserEntity();
        user.setId(userId);
        return user;
    }
}
