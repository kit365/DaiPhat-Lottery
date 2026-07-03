package com.daiphat.coreapi.application.port.in.chat;

import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;

public interface ChatAiMessagePort {

    MessageModel saveAndPublish(ConversationModel conversation, String content, Long parentId);

    /** System/divider notice (AI disabled, session events shown as gray text). */
    MessageModel saveSystemNoticeAndPublish(ConversationModel conversation, String content);
}
