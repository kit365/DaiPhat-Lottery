import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/support_ticket.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/providers/profile_providers.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/widgets/profile_status_badge.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';
import '../viewmodels/complaint_detail_viewmodel.dart';
import 'complaint_form_page.dart';

class ComplaintDetailView extends ConsumerStatefulWidget {
  final int ticketId;
  const ComplaintDetailView({super.key, required this.ticketId});

  @override
  ConsumerState<ComplaintDetailView> createState() =>
      _ComplaintDetailViewState();
}

class _ComplaintDetailViewState extends ConsumerState<ComplaintDetailView> {
  late final ComplaintDetailViewModel _viewModel;
  final _commentController = TextEditingController();
  XFile? _commentAttachment;

  @override
  void initState() {
    super.initState();
    _viewModel = ComplaintDetailViewModel(
      ref.read(supportTicketServiceProvider),
      widget.ticketId,
    );
  }

  @override
  void dispose() {
    _viewModel.dispose();
    _commentController.dispose();
    super.dispose();
  }

  String _fmtDate(String? raw, {bool withTime = true}) {
    if (raw == null || raw.isEmpty) return '—';
    final dt = DateTime.tryParse(raw)?.toLocal();
    if (dt == null) return '—';
    return DateFormat(withTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy').format(dt);
  }

  Future<void> _pickCommentImage() async {
    final picker = ImagePicker();
    final picked =
        await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (picked != null) setState(() => _commentAttachment = picked);
  }

  Future<void> _sendComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) {
      AppToast.error('Vui lòng nhập nội dung tin nhắn');
      return;
    }
    final err = await _viewModel.sendComment(text,
        filePath: _commentAttachment?.path);
    if (!mounted) return;
    if (err == null) {
      _commentController.clear();
      setState(() => _commentAttachment = null);
    } else {
      AppToast.error(err);
    }
  }

  Future<void> _submitFeedback(bool satisfied) async {
    final err = await _viewModel.submitFeedback(satisfied);
    if (!mounted) return;
    if (err == null) {
      AppToast.success(satisfied
          ? 'Cảm ơn bạn đã xác nhận hài lòng.'
          : 'Yêu cầu đã được mở lại để tiếp tục hỗ trợ.');
    } else {
      AppToast.error(err);
    }
  }

  Future<void> _confirmCancel() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Huỷ khiếu nại',
            style: GoogleFonts.publicSans(fontWeight: FontWeight.w800)),
        content: Text(
          'Bạn có chắc muốn huỷ khiếu nại này? Hành động này không thể hoàn tác.',
          style: GoogleFonts.publicSans(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Không', style: GoogleFonts.publicSans()),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white),
            child: Text('Huỷ khiếu nại',
                style: GoogleFonts.publicSans(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final err = await _viewModel.cancel();
    if (!mounted) return;
    if (err == null) {
      AppToast.success('Đã huỷ khiếu nại.');
    } else {
      AppToast.error(err);
    }
  }

  Future<void> _openEditForm(SupportTicketResponse ticket) async {
    final result = await Navigator.of(context, rootNavigator: true).push(
      MaterialPageRoute(
        builder: (_) => ComplaintFormPage(
          service: ref.read(supportTicketServiceProvider),
          editingTicket: ticket,
        ),
      ),
    );
    if (result is SupportTicketResponse && mounted) {
      await _viewModel.load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              size: 20, color: AppColors.primary),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Chi tiết khiếu nại',
          style: GoogleFonts.publicSans(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textMain,
          ),
        ),
        centerTitle: true,
      ),
      body: ListenableBuilder(
        listenable: _viewModel,
        builder: (context, _) {
          if (_viewModel.isLoading && _viewModel.ticket == null) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }
          final ticket = _viewModel.ticket;
          if (ticket == null) return _buildError();

          return Column(
            children: [
              Expanded(child: _buildContent(ticket)),
              _buildInputArea(ticket),
            ],
          );
        },
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 48, color: AppColors.textMuted),
          const SizedBox(height: 12),
          Text(
            _viewModel.error ?? 'Không tìm thấy khiếu nại',
            textAlign: TextAlign.center,
            style: GoogleFonts.publicSans(fontSize: 14, color: AppColors.textMuted),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: _viewModel.load,
            child: Text('Thử lại',
                style: GoogleFonts.publicSans(
                    fontWeight: FontWeight.w700, color: AppColors.primary)),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(SupportTicketResponse ticket) {
    final canEdit = ticket.status == TicketStatus.open;
    final canCancel = canCustomerCancelTicket(ticket.status);

    return RefreshIndicator(
      color: AppColors.primary,
      onRefresh: _viewModel.load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildHeader(ticket),
          if (canEdit || canCancel) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                if (canEdit)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _openEditForm(ticket),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF2065D1),
                        side: const BorderSide(color: Color(0xFF2065D1)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.edit_outlined, size: 18),
                      label: Text('Chỉnh sửa',
                          style:
                              GoogleFonts.publicSans(fontWeight: FontWeight.w700)),
                    ),
                  ),
                if (canEdit && canCancel) const SizedBox(width: 12),
                if (canCancel)
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _viewModel.isBusy ? null : _confirmCancel,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.block_rounded, size: 18),
                      label: Text('Huỷ khiếu nại',
                          style:
                              GoogleFonts.publicSans(fontWeight: FontWeight.w700)),
                    ),
                  ),
              ],
            ),
          ],
          const SizedBox(height: 16),
          _buildInfoCard(ticket),
          if (ticket.attachmentUrl != null &&
              ticket.attachmentUrl!.isNotEmpty) ...[
            const SizedBox(height: 16),
            _buildAttachmentCard(ticket),
          ],
          const SizedBox(height: 16),
          _buildStatusBanner(ticket),
          const SizedBox(height: 16),
          _buildChat(ticket),
          const SizedBox(height: 12),
          Center(
            child: Text(
              'Cập nhật lần cuối: ${_fmtDate(ticket.updatedAt)}',
              style: GoogleFonts.publicSans(
                  fontSize: 12, color: const Color(0xFF919EAB)),
            ),
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }

  Widget _buildHeader(SupportTicketResponse ticket) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Khiếu nại #${ticket.id}',
                style: GoogleFonts.publicSans(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textMain,
                ),
              ),
            ),
            ComplaintStatusBadge(status: ticket.status),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          'Tạo lúc ${_fmtDate(ticket.createdAt)}'
          '${ticket.dueAt != null ? ' · Hạn xử lý: ${_fmtDate(ticket.dueAt)}' : ''}',
          style: GoogleFonts.publicSans(fontSize: 13, color: AppColors.textMuted),
        ),
      ],
    );
  }

  Widget _buildInfoCard(SupportTicketResponse ticket) {
    final categoryName = ticket.ticketCategoryName ??
        _viewModel.categoryNames[ticket.ticketCategoryId] ??
        '—';
    return _card(
      icon: Icons.description_outlined,
      title: 'Thông tin khiếu nại',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _infoRow('Danh mục', categoryName),
          const SizedBox(height: 12),
          _infoRow('Tiêu đề', ticket.title),
          const SizedBox(height: 12),
          Text('Mô tả',
              style: GoogleFonts.publicSans(
                  fontSize: 13, color: AppColors.textMuted)),
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E8EB)),
            ),
            child: Text(
              ticket.description,
              style: GoogleFonts.publicSans(
                  fontSize: 14, color: AppColors.textMain, height: 1.5),
            ),
          ),
          if (ticket.refId != null && ticket.refType != null) ...[
            const SizedBox(height: 12),
            _buildRefLink(ticket),
          ],
        ],
      ),
    );
  }

  Widget _buildRefLink(SupportTicketResponse ticket) {
    final refType = ticket.refType!;
    final refId = ticket.refId!;
    VoidCallback? onTap;
    switch (refType) {
      case TicketRefType.order:
        onTap = () => context.pushNamed(AppRoute.orderDetail.name,
            pathParameters: {'id': refId});
        break;
      case TicketRefType.refundRequest:
        final id = int.tryParse(refId);
        if (id != null) {
          onTap = () => context.pushNamed(AppRoute.refundDetail.name,
              pathParameters: {'id': '$id'});
        }
        break;
      case TicketRefType.prizeClaim:
        final id = int.tryParse(refId);
        if (id != null) {
          onTap = () => context.pushNamed(AppRoute.prizePayoutDetail.name,
              pathParameters: {'id': '$id'});
        }
        break;
      case TicketRefType.paymentTransaction:
        onTap = null;
        break;
    }
    final displayId = refId.length > 8
        ? '#${refId.substring(0, 8).toUpperCase()}'
        : '#$refId';

    return Row(
      children: [
        Text('${refType.label}: ',
            style: GoogleFonts.publicSans(
                fontSize: 13, color: AppColors.textMuted)),
        const SizedBox(width: 4),
        Flexible(
          child: GestureDetector(
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0xFFF0F5FF),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Flexible(
                    child: Text(
                      displayId,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.publicSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF2065D1),
                      ),
                    ),
                  ),
                  if (onTap != null) ...[
                    const SizedBox(width: 4),
                    const Icon(Icons.open_in_new_rounded,
                        size: 13, color: Color(0xFF2065D1)),
                  ],
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAttachmentCard(SupportTicketResponse ticket) {
    return _card(
      icon: Icons.image_outlined,
      title: 'Tệp đính kèm',
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Image.network(
          ticket.attachmentUrl!,
          fit: BoxFit.contain,
          height: 200,
          width: double.infinity,
          errorBuilder: (_, _, _) => Container(
            height: 120,
            color: const Color(0xFFF4F6F8),
            alignment: Alignment.center,
            child: Text('Không tải được ảnh',
                style: GoogleFonts.publicSans(
                    fontSize: 12, color: AppColors.textMuted)),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBanner(SupportTicketResponse ticket) {
    switch (ticket.status) {
      case TicketStatus.resolved:
        return _banner(
          color: const Color(0xFFE4F8ED),
          iconBg: const Color(0xFF1CD162),
          icon: Icons.check_rounded,
          title: 'Đã giải quyết',
          subtitle: ticket.resolvedAt != null
              ? _fmtDate(ticket.resolvedAt)
              : 'Vui lòng xác nhận bạn có hài lòng với phương án giải quyết trong phần trao đổi bên dưới.',
        );
      case TicketStatus.closed:
        return _banner(
          color: const Color(0xFFF4F6F8),
          iconBg: const Color(0xFF637381),
          icon: Icons.lock_rounded,
          title: 'Đã đóng',
          subtitle: 'Khiếu nại đã được đóng.',
        );
      case TicketStatus.rejected:
        return _banner(
          color: const Color(0xFFFFF0F0),
          iconBg: const Color(0xFFB71D18),
          icon: Icons.cancel_rounded,
          title: 'Đã từ chối',
          subtitle: _resolveReasonText(ticket),
        );
      default:
        return const SizedBox.shrink();
    }
  }

  String _resolveReasonText(SupportTicketResponse ticket) {
    SupportTicketCommentResponse? find(int? id) {
      if (id == null) return null;
      for (final c in ticket.comments) {
        if (c.id == id) return c;
      }
      return null;
    }

    final reason = find(ticket.resolvedReasonId) ?? find(ticket.rejectedReasonId);
    final text = reason?.content ?? ticket.response ?? '';
    return text.isNotEmpty ? text : 'Vui lòng xem lý do trong trao đổi phía trên.';
  }

  Widget _banner({
    required Color color,
    required Color iconBg,
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
            child: Icon(icon, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: GoogleFonts.publicSans(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textMain)),
                const SizedBox(height: 4),
                Text(subtitle,
                    style: GoogleFonts.publicSans(
                        fontSize: 13,
                        color: const Color(0xFF454F5B),
                        height: 1.5)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChat(SupportTicketResponse ticket) {
    final hideId = ticket.resolvedReasonId;
    final comments = [...ticket.comments]
      ..sort((a, b) => (DateTime.tryParse(a.createdAt) ?? DateTime(0))
          .compareTo(DateTime.tryParse(b.createdAt) ?? DateTime(0)));
    final visible =
        comments.where((c) => hideId == null || c.id != hideId).toList();

    return _card(
      icon: Icons.forum_outlined,
      title: 'Trao đổi',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (visible.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text('Chưa có trao đổi',
                    style: GoogleFonts.publicSans(
                        fontSize: 14,
                        color: const Color(0xFF919EAB),
                        fontStyle: FontStyle.italic)),
              ),
            )
          else
            ...visible.map(_buildComment),
        ],
      ),
    );
  }

  Widget _buildComment(SupportTicketCommentResponse comment) {
    if (comment.senderRole == TicketCommentSenderRole.system) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFF4F6F8),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              comment.content,
              textAlign: TextAlign.center,
              style: GoogleFonts.publicSans(
                  fontSize: 12, color: AppColors.textMuted),
            ),
          ),
        ),
      );
    }
    final isCustomer = comment.senderRole == TicketCommentSenderRole.customer;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment:
            isCustomer ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isCustomer) _avatar(false),
          if (!isCustomer) const SizedBox(width: 8),
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isCustomer ? AppColors.primary : const Color(0xFFF4F6F8),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (comment.content.isNotEmpty)
                    Text(
                      comment.content,
                      style: GoogleFonts.publicSans(
                        fontSize: 14,
                        color: isCustomer ? Colors.white : AppColors.textMain,
                        height: 1.4,
                      ),
                    ),
                  if (comment.attachmentUrl != null &&
                      comment.attachmentUrl!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(
                        comment.attachmentUrl!,
                        height: 140,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => const SizedBox.shrink(),
                      ),
                    ),
                  ],
                  const SizedBox(height: 4),
                  Text(
                    _fmtDate(comment.createdAt),
                    style: GoogleFonts.publicSans(
                      fontSize: 10,
                      color: isCustomer
                          ? Colors.white.withValues(alpha: 0.8)
                          : const Color(0xFF919EAB),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (isCustomer) const SizedBox(width: 8),
          if (isCustomer) _avatar(true),
        ],
      ),
    );
  }

  Widget _avatar(bool isCustomer) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: isCustomer
            ? AppColors.primary.withValues(alpha: 0.15)
            : const Color(0xFFE5E8EB),
        shape: BoxShape.circle,
      ),
      child: Icon(
        isCustomer ? Icons.person_rounded : Icons.support_agent_rounded,
        size: 18,
        color: isCustomer ? AppColors.primary : const Color(0xFF637381),
      ),
    );
  }

  Widget _buildInputArea(SupportTicketResponse ticket) {
    if (ticket.status == TicketStatus.resolved) {
      return _buildFeedbackArea();
    }
    final canSend = canCustomerSendComment(ticket.status, ticket.comments);
    if (ticket.status.isTerminal) {
      return _buildNotice('Yêu cầu đã đóng. Không thể gửi thêm tin nhắn.');
    }
    if (!canSend) {
      return _buildNotice('Vui lòng chờ phản hồi từ nhân viên hỗ trợ.');
    }
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFEEEEEE))),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_commentAttachment != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.file(
                        File(_commentAttachment!.path),
                        width: 48,
                        height: 48,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text('Đã đính kèm 1 ảnh',
                          style: GoogleFonts.publicSans(
                              fontSize: 12, color: AppColors.textMuted)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 18),
                      onPressed: () =>
                          setState(() => _commentAttachment = null),
                    ),
                  ],
                ),
              ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                IconButton(
                  icon: const Icon(Icons.image_outlined,
                      color: AppColors.textMuted),
                  onPressed: _viewModel.isSendingComment
                      ? null
                      : _pickCommentImage,
                ),
                Expanded(
                  child: TextField(
                    controller: _commentController,
                    minLines: 1,
                    maxLines: 4,
                    maxLength: 2000,
                    buildCounter: (_,
                            {required currentLength,
                            required isFocused,
                            maxLength}) =>
                        null,
                    style: GoogleFonts.publicSans(fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Nhập nội dung trao đổi...',
                      isDense: true,
                      filled: true,
                      fillColor: const Color(0xFFF4F6F8),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(20),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                _viewModel.isSendingComment
                    ? const Padding(
                        padding: EdgeInsets.all(10),
                        child: SizedBox(
                          width: 20,
                          height: 20,
                          child:
                              CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : IconButton(
                        icon: const Icon(Icons.send_rounded,
                            color: AppColors.primary),
                        onPressed: _sendComment,
                      ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeedbackArea() {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFEEEEEE))),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Bạn có hài lòng với phương án giải quyết không?',
              textAlign: TextAlign.center,
              style: GoogleFonts.publicSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textMain),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed:
                        _viewModel.isBusy ? null : () => _submitFeedback(true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00A76F),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.thumb_up_rounded, size: 16),
                    label: Text('Hài lòng',
                        style:
                            GoogleFonts.publicSans(fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed:
                        _viewModel.isBusy ? null : () => _submitFeedback(false),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.refresh_rounded, size: 16),
                    label: Text('Mở lại',
                        style:
                            GoogleFonts.publicSans(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotice(String text) {
    return SafeArea(
      top: false,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFEEEEEE))),
        ),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: GoogleFonts.publicSans(
              fontSize: 13, color: AppColors.textMuted),
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: GoogleFonts.publicSans(
                fontSize: 13, color: AppColors.textMuted)),
        const SizedBox(height: 4),
        Text(value,
            style: GoogleFonts.publicSans(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: AppColors.textMain,
                height: 1.4)),
      ],
    );
  }

  Widget _card({
    required IconData icon,
    required String title,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEEEEEE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: const BoxDecoration(
                  color: Color(0xFFFFF4F4),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 18, color: AppColors.primary),
              ),
              const SizedBox(width: 10),
              Text(title,
                  style: GoogleFonts.publicSans(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textMain)),
            ],
          ),
          const Divider(height: 24, color: Color(0xFFF0F0F0)),
          child,
        ],
      ),
    );
  }
}
