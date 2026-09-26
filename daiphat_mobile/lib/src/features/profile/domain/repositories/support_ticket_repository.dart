import '../entities/support_ticket.dart';

abstract class SupportTicketRepository {
  Future<List<TicketCategoryResponse>> getCategories();

  Future<SupportTicketPageResult> getMyTickets({
    int page = 1,
    int limit = 10,
    String? status,
    String? search,
  });

  Future<int> getMyActiveCount();

  Future<SupportTicketResponse> getById(int id);

  Future<SupportTicketResponse> create(
    SupportTicketFormData data, {
    String? filePath,
  });

  Future<SupportTicketResponse> update(
    int id,
    SupportTicketFormData data, {
    String? filePath,
  });

  Future<SupportTicketResponse> close(int id);

  Future<SupportTicketResponse> submitResolutionFeedback(
    int id,
    bool satisfied,
  );

  Future<List<SupportTicketCommentResponse>> getComments(int id);

  Future<SupportTicketCommentResponse> addComment(
    int id,
    String content, {
    String? filePath,
  });
}
