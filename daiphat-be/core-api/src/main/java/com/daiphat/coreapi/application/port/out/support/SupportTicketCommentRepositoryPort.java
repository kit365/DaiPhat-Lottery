package com.daiphat.coreapi.application.port.out.support;

import com.daiphat.coreapi.domain.model.support.SupportTicketCommentModel;

import java.util.List;

public interface SupportTicketCommentRepositoryPort {

    SupportTicketCommentModel save(SupportTicketCommentModel comment);

    List<SupportTicketCommentModel> findByTicketIdOrderByCreatedAtAsc(Long ticketId);
}
