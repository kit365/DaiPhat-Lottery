package com.daiphat.coreapi.infrastructure.persistence.mapper.chat;

import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.chat.ConversationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.chat.MessageEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.List;
import java.util.UUID;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ChatPersistenceMapper {

    @Mapping(target = "customerId", source = "customer.id")
    @Mapping(target = "assignedOperatorId", source = "assignedOperator.id")
    @Mapping(target = "activeFlows", expression = "java(new java.util.ArrayList<>())")
    ConversationModel toConversationDomain(ConversationEntity entity);

    List<ConversationModel> toConversationDomains(List<ConversationEntity> entities);

    @Mapping(target = "customer", source = "customerId")
    @Mapping(target = "assignedOperator", source = "assignedOperatorId")
    ConversationEntity toConversationEntity(ConversationModel model);

    @Mapping(target = "conversationId", source = "conversation.id")
    @Mapping(target = "parentId", source = "parent.id")
    @Mapping(target = "senderId", source = "sender.id")
    MessageModel toMessageDomain(MessageEntity entity);

    List<MessageModel> toMessageDomains(List<MessageEntity> entities);

    @Mapping(target = "conversation", source = "conversationId")
    @Mapping(target = "parent", source = "parentId")
    @Mapping(target = "sender", source = "senderId")
    MessageEntity toMessageEntity(MessageModel model);

    default ConversationEntity mapConversationId(Long id) {
        if (id == null) {
            return null;
        }
        ConversationEntity entity = new ConversationEntity();
        entity.setId(id);
        return entity;
    }

    default MessageEntity mapMessageId(Long id) {
        if (id == null) {
            return null;
        }
        MessageEntity entity = new MessageEntity();
        entity.setId(id);
        return entity;
    }

    default UserEntity mapUserId(UUID id) {
        if (id == null) {
            return null;
        }
        UserEntity entity = new UserEntity();
        entity.setId(id);
        return entity;
    }
}
