import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/chat/data/models/chat_models.dart';
import 'package:daiphat_mobile/src/features/chat/presentation/viewmodels/chat_viewmodel.dart';
import 'package:daiphat_mobile/src/features/chat/utils/chat_message_mapper.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({
    super.key,
    this.onBack,
    this.isAuthenticated = false,
    this.isActive = false,
  });

  final VoidCallback? onBack;
  final bool isAuthenticated;
  final bool isActive;

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _scrollController = ScrollController();
  final _inputController = TextEditingController();
  ProviderSubscription<ChatState>? _chatSubscription;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _chatSubscription = ref.listenManual(chatViewModelProvider, (previous, next) {
      if ((previous?.visibleMessages.length ?? 0) !=
          next.visibleMessages.length) {
        _scrollToBottom();
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _ensureBootstrap());
  }

  @override
  void didUpdateWidget(covariant ChatScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActive && !oldWidget.isActive) {
      _ensureBootstrap();
    }
    if (widget.isAuthenticated && !oldWidget.isAuthenticated) {
      _ensureBootstrap();
    }
  }

  void _ensureBootstrap() {
    if (!widget.isActive) return;
    ref
        .read(chatViewModelProvider.notifier)
        .bootstrap(isAuthenticated: widget.isAuthenticated);
  }

  @override
  void dispose() {
    _chatSubscription?.close();
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _inputController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels <= 48) {
      ref.read(chatViewModelProvider.notifier).loadMoreTimeline();
    }
  }

  void _scrollToBottom() {
    if (!_scrollController.hasClients) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 280),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _sendMessage() async {
    final text = _inputController.text;
    if (text.trim().isEmpty) return;
    _inputController.clear();
    await ref.read(chatViewModelProvider.notifier).sendText(text);
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    final chatState = ref.watch(chatViewModelProvider);

    final bottomInset = MediaQuery.paddingOf(context).bottom;

    if (!widget.isAuthenticated) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        if (widget.onBack != null) {
          widget.onBack!();
        } else if (context.canPop()) {
          context.pop();
        }
      });
      return const SizedBox.shrink();
    }

    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          _ChatHeader(onBack: widget.onBack),
          if (chatState.statusBanner != null)
            _StatusBanner(text: chatState.statusBanner!),
          if (chatState.isLoading && chatState.visibleMessages.isEmpty)
            const Expanded(
              child: Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            )
          else
            Expanded(
              child: RefreshIndicator(
                color: AppColors.primary,
                onRefresh: () =>
                    ref.read(chatViewModelProvider.notifier).refresh(),
                child: ListView.builder(
                  controller: _scrollController,
                  physics: const AlwaysScrollableScrollPhysics(
                    parent: BouncingScrollPhysics(),
                  ),
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  itemCount: chatState.visibleMessages.length + 1,
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      return const Padding(
                        padding: EdgeInsets.only(bottom: 16),
                        child: _OfficialProfileCard(),
                      );
                    }

                    final message = chatState.visibleMessages[index - 1];
                    if (message.variant == ChatMessageVariant.divider) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: _SystemNotice(text: message.text),
                      );
                    }
                    if (message.variant == ChatMessageVariant.typing) {
                      return const Padding(
                        padding: EdgeInsets.only(bottom: 12),
                        child: _TypingBubble(),
                      );
                    }
                    if (message.variant == ChatMessageVariant.ticketSuggest) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _TicketSuggestBlock(message: message),
                      );
                    }

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: message.isUser
                          ? _UserBubble(message: message)
                          : _SupportBubble(message: message),
                    );
                  },
                ),
              ),
            ),
          if (chatState.errorMessage != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Text(
                chatState.errorMessage!,
                style: GoogleFonts.publicSans(
                  fontSize: 11,
                  color: AppColors.error,
                ),
              ),
            ),
          if (chatState.quickReplies.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: _QuickReplyChips(
                replies: chatState.quickReplies,
                onTap: (chip) async {
                  await ref
                      .read(chatViewModelProvider.notifier)
                      .handleQuickReply(chip);
                  _scrollToBottom();
                },
              ),
            ),
          _ChatInputBar(
            controller: _inputController,
            bottomInset: bottomInset,
            enabled: !chatState.isSending,
            onSend: _sendMessage,
          ),
        ],
      ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  const _StatusBanner({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: const Color(0xFFFFF6F6),
      child: Text(
        text,
        style: GoogleFonts.publicSans(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: AppColors.primary,
        ),
      ),
    );
  }
}

class _ChatHeader extends StatelessWidget {
  const _ChatHeader({this.onBack});

  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;

    return Container(
      padding: EdgeInsets.fromLTRB(8, topInset + 4, 8, 10),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: Color(0xFFF0ECEC))),
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: onBack,
            icon: const Icon(
              Icons.arrow_back_ios_new_rounded,
              color: AppColors.primary,
              size: 20,
            ),
          ),
          const _BrandAvatar(size: 40),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        'Đại Phát Official',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.publicSans(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF202124),
                        ),
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(
                      Icons.verified_rounded,
                      color: AppColors.primary,
                      size: 16,
                    ),
                  ],
                ),
                Text(
                  'Hỗ trợ trực tuyến',
                  style: GoogleFonts.publicSans(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF8A8F98),
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () {},
            icon: const Icon(
              Icons.more_horiz_rounded,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }
}

class _OfficialProfileCard extends StatelessWidget {
  const _OfficialProfileCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFFF6F6), Color(0xFFFFFBFA)],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFFFE3E5)),
      ),
      child: Row(
        children: [
          const _BrandAvatar(size: 52),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Đại Phát Official',
                  style: GoogleFonts.publicSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF202124),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Hỗ trợ khách hàng 24/7',
                  style: GoogleFonts.publicSans(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF7A8088),
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(
                      Icons.verified_user_rounded,
                      size: 14,
                      color: Color(0xFF2E9E4D),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        'Tài khoản chính thức của Đại Phát',
                        style: GoogleFonts.publicSans(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF2E9E4D),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          OutlinedButton(
            onPressed: () {},
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(0, 32),
              padding: const EdgeInsets.symmetric(horizontal: 10),
              side: const BorderSide(color: AppColors.primary),
              foregroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            child: Text(
              'Thông tin',
              style: GoogleFonts.publicSans(
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BrandAvatar extends StatelessWidget {
  const _BrandAvatar({required this.size});

  static const _assetPath = 'assets/images/logoApp.png';

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFFFAF7F2),
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFE8C9A0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Image.asset(
        _assetPath,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => Center(
          child: Text(
            'DP',
            style: GoogleFonts.publicSans(
              fontSize: size * 0.34,
              fontWeight: FontWeight.w900,
              color: AppColors.primary,
            ),
          ),
        ),
      ),
    );
  }
}

class _SystemNotice extends StatelessWidget {
  const _SystemNotice({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xFFF5F5F7),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: GoogleFonts.publicSans(
            fontSize: 11,
            color: const Color(0xFF7A8088),
          ),
        ),
      ),
    );
  }
}

class _UserBubble extends StatelessWidget {
  const _UserBubble({required this.message});

  final UiChatMessage message;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerRight,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.78,
        ),
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF0F1),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(18),
              topRight: Radius.circular(18),
              bottomLeft: Radius.circular(18),
              bottomRight: Radius.circular(6),
            ),
            border: Border.all(color: const Color(0xFFFFE0E3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                message.text,
                style: GoogleFonts.publicSans(
                  fontSize: 13,
                  height: 1.45,
                  fontWeight: FontWeight.w500,
                  color: const Color(0xFF2B2F36),
                ),
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    message.timeLabel,
                    style: GoogleFonts.publicSans(
                      fontSize: 10,
                      color: const Color(0xFF9AA0A8),
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(
                    Icons.done_all_rounded,
                    size: 14,
                    color: AppColors.primary,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SupportBubble extends StatelessWidget {
  const _SupportBubble({required this.message});

  final UiChatMessage message;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        const _BrandAvatar(size: 28),
        const SizedBox(width: 8),
        Flexible(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.sizeOf(context).width * 0.72,
            ),
            child: Container(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(18),
                  topRight: Radius.circular(18),
                  bottomRight: Radius.circular(18),
                  bottomLeft: Radius.circular(6),
                ),
                border: Border.all(color: const Color(0xFFECECF0)),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x08000000),
                    blurRadius: 10,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (message.fromStaff)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        'Nhân viên Đại Phát',
                        style: GoogleFonts.publicSans(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  Text(
                    message.text,
                    style: GoogleFonts.publicSans(
                      fontSize: 13,
                      height: 1.45,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF2B2F36),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    message.timeLabel,
                    style: GoogleFonts.publicSans(
                      fontSize: 10,
                      color: const Color(0xFF9AA0A8),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        const _BrandAvatar(size: 28),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFECECF0)),
          ),
          child: Text(
            'Đại Phát đang soạn tin...',
            style: GoogleFonts.publicSans(
              fontSize: 12,
              color: const Color(0xFF7A8088),
              fontStyle: FontStyle.italic,
            ),
          ),
        ),
      ],
    );
  }
}

class _TicketSuggestBlock extends StatelessWidget {
  const _TicketSuggestBlock({required this.message});

  final UiChatMessage message;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _BrandAvatar(size: 28),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _SupportBubble(
                message: UiChatMessage(
                  id: '${message.id}-intro',
                  isUser: false,
                  text: message.text,
                  timeLabel: message.timeLabel,
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 118,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: message.suggestedTickets.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final ticket = message.suggestedTickets[index];
                    return _TicketSuggestCard(ticket: ticket);
                  },
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _TicketSuggestCard extends StatelessWidget {
  const _TicketSuggestCard({required this.ticket});

  final SuggestedTicketModel ticket;

  String _formatPrice() {
    if (ticket.price == null) return '—';
    return '${NumberFormat.decimalPattern('vi').format(ticket.price)}đ';
  }

  String _formatDrawDate() {
    final raw = ticket.drawDate;
    if (raw == null || raw.isEmpty) return '—';
    final parts = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(raw);
    if (parts == null) return raw;
    return '${parts.group(3)}/${parts.group(2)}/${parts.group(1)}';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 180,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFFFE0E3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            ticket.numbers,
            style: GoogleFonts.publicSans(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            ticket.stationName ?? 'Đài xổ số',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.publicSans(fontSize: 11, color: const Color(0xFF7A8088)),
          ),
          Text(
            _formatDrawDate(),
            style: GoogleFonts.publicSans(fontSize: 11, color: const Color(0xFF7A8088)),
          ),
          const Spacer(),
          Row(
            children: [
              Text(
                _formatPrice(),
                style: GoogleFonts.publicSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF2B2F36),
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: () {
                  final params = <String, String>{
                    if (ticket.stationId != null) 'stationId': '${ticket.stationId}',
                    if (ticket.drawDate != null) 'drawDate': ticket.drawDate!,
                    'search': ticket.numbers,
                  };
                  final query = params.entries
                      .map((entry) => '${entry.key}=${Uri.encodeComponent(entry.value)}')
                      .join('&');
                  context.push('${AppRoute.buyTicket.path}?$query');
                },
                child: const Text('Mua ngay'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _QuickReplyChips extends StatelessWidget {
  const _QuickReplyChips({required this.replies, required this.onTap});

  final List<QuickReplyChip> replies;
  final ValueChanged<QuickReplyChip> onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 42,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: replies.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final reply = replies[index];
          return OutlinedButton(
            onPressed: () => onTap(reply),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primary,
              backgroundColor: Colors.white,
              side: const BorderSide(color: Color(0xFFF5CBCD)),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
              ),
              textStyle: GoogleFonts.publicSans(
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
            child: Text(reply.label),
          );
        },
      ),
    );
  }
}

class _ChatInputBar extends StatelessWidget {
  const _ChatInputBar({
    required this.controller,
    required this.bottomInset,
    required this.onSend,
    this.enabled = true,
  });

  final TextEditingController controller;
  final double bottomInset;
  final VoidCallback onSend;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(12, 10, 12, 10 + bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFF0ECEC))),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFFFF2F3),
              borderRadius: BorderRadius.circular(12),
            ),
            child: IconButton(
              onPressed: enabled ? () {} : null,
              padding: EdgeInsets.zero,
              icon: const Icon(Icons.add_rounded, color: AppColors.primary),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: controller,
              enabled: enabled,
              textInputAction: TextInputAction.send,
              onSubmitted: enabled ? (_) => onSend() : null,
              decoration: InputDecoration(
                hintText: 'Nhập tin nhắn...',
                hintStyle: GoogleFonts.publicSans(
                  fontSize: 13,
                  color: const Color(0xFFB0B6BE),
                ),
                filled: true,
                fillColor: const Color(0xFFF5F5F7),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 10,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(999),
                  borderSide: BorderSide.none,
                ),
              ),
              style: GoogleFonts.publicSans(
                fontSize: 13,
                color: const Color(0xFF2B2F36),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Material(
            color: enabled ? AppColors.primary : const Color(0xFFE0E0E0),
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: enabled ? onSend : null,
              child: const SizedBox(
                width: 40,
                height: 40,
                child: Icon(Icons.send_rounded, color: Colors.white, size: 20),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
