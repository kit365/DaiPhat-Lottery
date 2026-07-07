package com.daiphat.coreapi.application.mapper.chat;

import com.daiphat.coreapi.application.dto.request.chat.CreateConversationRequest;
import com.daiphat.coreapi.application.dto.request.chat.CreateMessageRequest;
import com.daiphat.coreapi.application.dto.response.chat.ConversationResponse;
import com.daiphat.coreapi.application.dto.response.chat.MessageResponse;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ChatApplicationMapper {

    ConversationModel toConversationModel(CreateConversationRequest request);

    MessageModel toMessageModel(CreateMessageRequest request);

    ConversationResponse toConversationResponse(ConversationModel model);

    List<ConversationResponse> toConversationResponses(List<ConversationModel> models);

    MessageResponse toMessageResponse(MessageModel model);

    List<MessageResponse> toMessageResponses(List<MessageModel> models);
}
