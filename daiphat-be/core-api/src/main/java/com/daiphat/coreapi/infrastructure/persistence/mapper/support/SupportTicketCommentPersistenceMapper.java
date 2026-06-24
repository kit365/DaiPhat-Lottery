package com.daiphat.coreapi.infrastructure.persistence.mapper.support;

import com.daiphat.coreapi.domain.model.support.SupportTicketCommentModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.support.SupportTicketCommentEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.support.SupportTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.List;
import java.util.UUID;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SupportTicketCommentPersistenceMapper {

    @Mapping(target = "supportTicketId", source = "supportTicket.id")
    @Mapping(target = "senderId", source = "sender.id")
    SupportTicketCommentModel toDomain(SupportTicketCommentEntity entity);

    List<SupportTicketCommentModel> toDomainList(List<SupportTicketCommentEntity> entities);

    @Mapping(target = "supportTicket", source = "supportTicketId")
    @Mapping(target = "sender", source = "senderId")
    SupportTicketCommentEntity toEntity(SupportTicketCommentModel domain);

    default SupportTicketEntity mapTicketId(Long ticketId) {
        if (ticketId == null) {
            return null;
        }
        SupportTicketEntity ticket = new SupportTicketEntity();
        ticket.setId(ticketId);
        return ticket;
    }

    default UserEntity mapSenderId(UUID senderId) {
        if (senderId == null) {
            return null;
        }
        UserEntity user = new UserEntity();
        user.setId(senderId);
        return user;
    }
}
