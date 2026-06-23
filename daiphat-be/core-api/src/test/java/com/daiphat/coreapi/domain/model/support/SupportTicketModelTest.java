package com.daiphat.coreapi.domain.model.support;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.support.TicketCommentSenderRole;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("SupportTicketModel Phase 2 comment rules")
class SupportTicketModelTest {

    @Test
    void ensureCommentAllowed_rejectsResolvedAndClosed() {
        SupportTicketModel resolved = SupportTicketModel.builder().status(TicketStatus.RESOLVED).build();
        SupportTicketModel closed = SupportTicketModel.builder().status(TicketStatus.CLOSED).build();

        assertThatThrownBy(resolved::ensureCommentAllowed)
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_COMMENT_NOT_ALLOWED);

        assertThatThrownBy(closed::ensureCommentAllowed)
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_COMMENT_NOT_ALLOWED);
    }

    @Test
    void ensureSenderTurn_rejectsSamePartyTwice() {
        List<SupportTicketCommentModel> comments = List.of(
                comment(TicketCommentSenderRole.CUSTOMER, "Hello"),
                comment(TicketCommentSenderRole.OPERATOR, "Reply"),
                comment(TicketCommentSenderRole.SYSTEM, "Audit log"));

        assertThatThrownBy(() -> SupportTicketModel.ensureSenderTurn(comments, TicketCommentSenderRole.OPERATOR))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_COMMENT_TURN_VIOLATION);
    }

    @Test
    void ensureSenderTurn_ignoresSystemWhenFindingLastConversationalComment() {
        List<SupportTicketCommentModel> comments = List.of(
                comment(TicketCommentSenderRole.CUSTOMER, "Hello"),
                comment(TicketCommentSenderRole.SYSTEM, "Staff assigned"));

        assertThatThrownBy(() -> SupportTicketModel.ensureSenderTurn(comments, TicketCommentSenderRole.CUSTOMER))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_COMMENT_TURN_VIOLATION);
    }

    @Test
    void recordOperatorComment_setsWaitingForCustomer() {
        SupportTicketModel ticket = SupportTicketModel.builder().status(TicketStatus.IN_PROGRESS).build();

        ticket.recordOperatorComment();

        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.WAITING_FOR_CUSTOMER);
    }

    @Test
    void recordCustomerComment_movesWaitingForCustomerToInProgress() {
        SupportTicketModel ticket = SupportTicketModel.builder().status(TicketStatus.WAITING_FOR_CUSTOMER).build();

        ticket.recordCustomerComment();

        assertThat(ticket.getStatus()).isEqualTo(TicketStatus.IN_PROGRESS);
    }

    private static SupportTicketCommentModel comment(TicketCommentSenderRole role, String content) {
        return SupportTicketCommentModel.builder()
                .senderRole(role)
                .content(content)
                .build();
    }
}
