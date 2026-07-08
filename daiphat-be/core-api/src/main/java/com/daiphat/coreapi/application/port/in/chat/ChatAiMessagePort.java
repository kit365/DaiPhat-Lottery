package com.daiphat.coreapi.application.port.in.chat;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;


public interface ChatAiMessagePort {

    void saveAndPublish(ConversationModel conversation, String content, Long parentId);

    void saveBotReply(ConversationModel conversation, String content, Long parentId, String intent);

    void saveBotReply(ConversationModel conversation, String content, String displayContent, Long parentId, String intent);

    void saveSystemNoticeAndPublish(ConversationModel conversation, String content);
}
