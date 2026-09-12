import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/features/profile/domain/repositories/support_ticket_repository.dart';
import 'package:daiphat_mobile/src/features/profile/domain/usecases/support_ticket_usecases.dart';

final supportTicketRepositoryProvider =
    Provider<SupportTicketRepository>((ref) {
  throw UnimplementedError(
    'supportTicketRepositoryProvider phải được override trong bootstrap',
  );
});

final getTicketCategoriesProvider = Provider<GetTicketCategories>((ref) {
  return GetTicketCategories(ref.watch(supportTicketRepositoryProvider));
});

final getMySupportTicketsProvider = Provider<GetMySupportTickets>((ref) {
  return GetMySupportTickets(ref.watch(supportTicketRepositoryProvider));
});

final getMyActiveSupportTicketCountProvider =
    Provider<GetMyActiveSupportTicketCount>((ref) {
  return GetMyActiveSupportTicketCount(
    ref.watch(supportTicketRepositoryProvider),
  );
});

final getSupportTicketDetailProvider = Provider<GetSupportTicketDetail>((ref) {
  return GetSupportTicketDetail(ref.watch(supportTicketRepositoryProvider));
});

final createSupportTicketProvider = Provider<CreateSupportTicket>((ref) {
  return CreateSupportTicket(ref.watch(supportTicketRepositoryProvider));
});

final updateSupportTicketProvider = Provider<UpdateSupportTicket>((ref) {
  return UpdateSupportTicket(ref.watch(supportTicketRepositoryProvider));
});

final closeSupportTicketProvider = Provider<CloseSupportTicket>((ref) {
  return CloseSupportTicket(ref.watch(supportTicketRepositoryProvider));
});

final submitSupportTicketResolutionFeedbackProvider =
    Provider<SubmitSupportTicketResolutionFeedback>((ref) {
  return SubmitSupportTicketResolutionFeedback(
    ref.watch(supportTicketRepositoryProvider),
  );
});

final addSupportTicketCommentProvider = Provider<AddSupportTicketComment>((ref) {
  return AddSupportTicketComment(ref.watch(supportTicketRepositoryProvider));
});
