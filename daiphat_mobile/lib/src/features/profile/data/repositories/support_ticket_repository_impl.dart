import '../../domain/entities/support_ticket.dart';
import '../../domain/repositories/support_ticket_repository.dart';
import '../support_ticket_service.dart';

class SupportTicketRepositoryImpl implements SupportTicketRepository {
  final SupportTicketService _remoteDataSource;

  const SupportTicketRepositoryImpl(this._remoteDataSource);

  @override
  Future<List<TicketCategoryResponse>> getCategories() =>
      _remoteDataSource.getCategories();

  @override
  Future<SupportTicketPageResult> getMyTickets({
    int page = 1,
    int limit = 10,
    String? status,
    String? search,
  }) =>
      _remoteDataSource.getMyTickets(
        page: page,
        limit: limit,
        status: status,
        search: search,
      );

  @override
  Future<int> getMyActiveCount() => _remoteDataSource.getMyActiveCount();

  @override
  Future<SupportTicketResponse> getById(int id) => _remoteDataSource.getById(id);

  @override
  Future<SupportTicketResponse> create(
    SupportTicketFormData data, {
    String? filePath,
  }) =>
      _remoteDataSource.create(data, filePath: filePath);

  @override
  Future<SupportTicketResponse> update(
    int id,
    SupportTicketFormData data, {
    String? filePath,
  }) =>
      _remoteDataSource.update(id, data, filePath: filePath);

  @override
  Future<SupportTicketResponse> close(int id) => _remoteDataSource.close(id);

  @override
  Future<SupportTicketResponse> submitResolutionFeedback(
    int id,
    bool satisfied,
  ) =>
      _remoteDataSource.submitResolutionFeedback(id, satisfied);

  @override
  Future<List<SupportTicketCommentResponse>> getComments(int id) =>
      _remoteDataSource.getComments(id);

  @override
  Future<SupportTicketCommentResponse> addComment(
    int id,
    String content, {
    String? filePath,
  }) =>
      _remoteDataSource.addComment(id, content, filePath: filePath);
}
