import '../entities/support_ticket.dart';
import '../repositories/support_ticket_repository.dart';

class GetTicketCategories {
  final SupportTicketRepository _repository;
  const GetTicketCategories(this._repository);

  Future<List<TicketCategoryResponse>> call() => _repository.getCategories();
}

class GetMySupportTickets {
  final SupportTicketRepository _repository;
  const GetMySupportTickets(this._repository);

  Future<SupportTicketPageResult> call({
    int page = 1,
    int limit = 10,
    String? status,
    String? search,
  }) =>
      _repository.getMyTickets(
        page: page,
        limit: limit,
        status: status,
        search: search,
      );
}

class GetMyActiveSupportTicketCount {
  final SupportTicketRepository _repository;
  const GetMyActiveSupportTicketCount(this._repository);

  Future<int> call() => _repository.getMyActiveCount();
}

class GetSupportTicketDetail {
  final SupportTicketRepository _repository;
  const GetSupportTicketDetail(this._repository);

  Future<SupportTicketResponse> call(int id) => _repository.getById(id);
}

class CreateSupportTicket {
  final SupportTicketRepository _repository;
  const CreateSupportTicket(this._repository);

  Future<SupportTicketResponse> call(
    SupportTicketFormData data, {
    String? filePath,
  }) =>
      _repository.create(data, filePath: filePath);
}

class UpdateSupportTicket {
  final SupportTicketRepository _repository;
  const UpdateSupportTicket(this._repository);

  Future<SupportTicketResponse> call(
    int id,
    SupportTicketFormData data, {
    String? filePath,
  }) =>
      _repository.update(id, data, filePath: filePath);
}

class CloseSupportTicket {
  final SupportTicketRepository _repository;
  const CloseSupportTicket(this._repository);

  Future<SupportTicketResponse> call(int id) => _repository.close(id);
}

class SubmitSupportTicketResolutionFeedback {
  final SupportTicketRepository _repository;
  const SubmitSupportTicketResolutionFeedback(this._repository);

  Future<SupportTicketResponse> call(int id, bool satisfied) =>
      _repository.submitResolutionFeedback(id, satisfied);
}

class AddSupportTicketComment {
  final SupportTicketRepository _repository;
  const AddSupportTicketComment(this._repository);

  Future<SupportTicketCommentResponse> call(
    int id,
    String content, {
    String? filePath,
  }) =>
      _repository.addComment(id, content, filePath: filePath);
}
