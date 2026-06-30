package com.daiphat.coreapi.application.mapper.chat;

import com.daiphat.coreapi.application.dto.request.chat.CreateConversationRequest;
import com.daiphat.coreapi.application.dto.request.chat.CreateMessageRequest;
import com.daiphat.coreapi.application.dto.request.chat.UpsertParticipationRequest;
import com.daiphat.coreapi.application.dto.response.chat.ConversationResponse;
import com.daiphat.coreapi.application.dto.response.chat.MessageResponse;
import com.daiphat.coreapi.application.dto.response.chat.ParticipationResponse;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.chat.ParticipationModel;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ChatApplicationMapper {

    ConversationModel toConversationModel(CreateConversationRequest request);

    MessageModel toMessageModel(CreateMessageRequest request);

    @Mapping(target = "id", ignore = true)
    ParticipationModel toParticipationModel(UpsertParticipationRequest request);

    ConversationResponse toConversationResponse(ConversationModel model);

    List<ConversationResponse> toConversationResponses(List<ConversationModel> models);

    MessageResponse toMessageResponse(MessageModel model);

    List<MessageResponse> toMessageResponses(List<MessageModel> models);

    ParticipationResponse toParticipationResponse(ParticipationModel model);

    List<ParticipationResponse> toParticipationResponses(List<ParticipationModel> models);
}
