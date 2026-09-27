import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/features/chat/domain/entities/chat_models.dart';
import 'package:daiphat_mobile/src/features/chat/presentation/viewmodels/chat_viewmodel.dart';
import 'package:daiphat_mobile/src/features/chat/utils/chat_constants.dart';
import 'package:daiphat_mobile/src/features/chat/utils/chat_message_mapper.dart';
import 'package:daiphat_mobile/src/features/home/domain/entities/lottery_result.dart';
import 'package:daiphat_mobile/src/features/home/presentation/viewmodels/home_viewmodel.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';
import 'package:daiphat_mobile/src/shared/widgets/app_date_picker_dialog.dart';

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
    _chatSubscription = ref.listenManual(chatViewModelProvider, (
      previous,
      next,
    ) {
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
    if (!widget.isAuthenticated && oldWidget.isAuthenticated) {
      ref
          .read(chatViewModelProvider.notifier)
          .bootstrap(isAuthenticated: false);
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

  void _scrollToBottom({bool animate = true}) {
    if (!_scrollController.hasClients) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      final max = _scrollController.position.maxScrollExtent;
      final current = _scrollController.position.pixels;
      if ((max - current).abs() < 4) return;

      if (animate) {
        _scrollController.animateTo(
          max,
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOutQuad,
        );
      } else {
        _scrollController.jumpTo(max);
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _inputController.text;
    if (text.trim().isEmpty) return;
    _inputController.clear();
    await ref.read(chatViewModelProvider.notifier).sendText(text);
  }

  void _showOfficialProfile() {
    showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      backgroundColor: AppColors.transparent,
      builder: (_) => const _OfficialProfileSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final chatState = ref.watch(chatViewModelProvider);
    final visibleMessages = chatState.visibleMessages;

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
      backgroundColor: AppColors.surfacePrimary,
      body: Column(
        children: [
          _ChatHeader(
            onBack: widget.onBack,
            onOpenOfficialProfile: _showOfficialProfile,
            subtitle: chatState.showChattingWithStaff
                ? 'Hỗ trợ bởi Nhân viên'
                : chatState.showWaitingForStaff
                ? 'Đang chờ Nhân viên tiếp nhận...'
                : 'Hỗ trợ trực tuyến',
          ),
          if (chatState.showWaitingForStaff)
            _StaffSessionBar(
              tone: _StaffSessionTone.waiting,
              label: 'Đang kết nối nhân viên...',
              actionLabel: chatState.isCancellingStaff
                  ? 'Đang huỷ...'
                  : 'Huỷ gặp nhân viên',
              busy: chatState.isCancellingStaff || chatState.isSending,
              onAction: () => ref
                  .read(chatViewModelProvider.notifier)
                  .cancelStaffRequest(),
            )
          else if (chatState.showChattingWithStaff)
            _StaffSessionBar(
              tone: _StaffSessionTone.active,
              label: 'Đang chat với Nhân viên',
              actionLabel: chatState.isDisconnectingStaff
                  ? 'Đang ngắt...'
                  : 'Ngắt kết nối',
              actionIcon: Icons.phone_disabled_rounded,
              busy: chatState.isDisconnectingStaff || chatState.isSending,
              onAction: () =>
                  ref.read(chatViewModelProvider.notifier).disconnectStaff(),
            )
          else if (chatState.statusBanner != null)
            _StatusBanner(text: chatState.statusBanner!),
          if (chatState.isLoading && visibleMessages.isEmpty)
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
                  itemCount: chatState.visibleMessages.length,
                  itemBuilder: (context, index) {
                    if (index < 0 || index >= visibleMessages.length) {
                      return const SizedBox.shrink();
                    }
                    final message = visibleMessages[index];
                    Widget child;
                    if (message.variant == ChatMessageVariant.divider) {
                      child = Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: _SystemNotice(text: message.text),
                      );
                    } else if (message.variant == ChatMessageVariant.typing) {
                      child = const Padding(
                        padding: EdgeInsets.only(bottom: 12),
                        child: _TypingBubble(),
                      );
                    } else if (message.variant == ChatMessageVariant.ticketSuggest) {
                      child = Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _TicketSuggestBlock(message: message),
                      );
                    } else {
                      child = Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: message.isUser
                            ? _UserBubble(message: message)
                            : _SupportBubble(message: message),
                      );
                    }
                    return KeyedSubtree(
                      key: ValueKey(message.id),
                      child: child,
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
                style: AppTypography.caption(
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
      color: AppColors.surfaceBrandWarm,
      child: Text(
        text,
        style: AppTypography.caption(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: AppColors.primary,
        ),
      ),
    );
  }
}

enum _StaffSessionTone { waiting, active }

class _StaffSessionBar extends StatelessWidget {
  const _StaffSessionBar({
    required this.tone,
    required this.label,
    required this.actionLabel,
    required this.busy,
    required this.onAction,
    this.actionIcon,
  });

  final _StaffSessionTone tone;
  final String label;
  final String actionLabel;
  final IconData? actionIcon;
  final bool busy;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    final isWaiting = tone == _StaffSessionTone.waiting;
    final background = isWaiting
        ? AppColors.surfaceWarning
        : AppColors.surfaceSuccess;
    final border = isWaiting
        ? AppColors.surfaceWarningSubtle
        : AppColors.statusSuccessBorder;
    final accent = isWaiting
        ? AppColors.statusWarningAccent
        : AppColors.statusSuccessMedium;
    final textColor = isWaiting
        ? AppColors.statusAttentionForeground
        : AppColors.statusSuccessDeep;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 8, 10, 8),
      decoration: BoxDecoration(
        color: background,
        border: Border(bottom: BorderSide(color: border)),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
          ),
          const SizedBox(width: 8),
          if (!isWaiting) ...[
            Icon(Icons.headset_mic_rounded, size: 14, color: accent),
            const SizedBox(width: 4),
          ],
          Expanded(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.caption(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: textColor,
              ),
            ),
          ),
          const SizedBox(width: 8),
          OutlinedButton(
            onPressed: busy ? null : onAction,
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.primary,
              backgroundColor: AppColors.white,
              side: const BorderSide(color: AppColors.brandPrimaryBorderLight),
              padding: const EdgeInsets.symmetric(horizontal: 10),
              minimumSize: const Size(0, 30),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              textStyle: AppTypography.buttonSmall(
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (actionIcon != null) ...[
                  Icon(actionIcon, size: 14),
                  const SizedBox(width: 4),
                ],
                Text(actionLabel),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatHeader extends StatelessWidget {
  const _ChatHeader({
    this.onBack,
    required this.onOpenOfficialProfile,
    required this.subtitle,
  });

  final VoidCallback? onBack;
  final VoidCallback onOpenOfficialProfile;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;

    return Container(
      padding: EdgeInsets.fromLTRB(8, topInset + 4, 8, 10),
      decoration: const BoxDecoration(
        color: AppColors.surfacePrimary,
        border: Border(bottom: BorderSide(color: AppColors.borderLight)),
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
          Semantics(
            button: true,
            label: 'Xem thông tin Đại Phát Official',
            child: InkResponse(
              onTap: onOpenOfficialProfile,
              radius: 24,
              child: const SizedBox(
                width: 48,
                height: 48,
                child: Center(child: _BrandAvatar(size: 40)),
              ),
            ),
          ),
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
                        style: AppTypography.subtitle1(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.contentHeading,
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
                  subtitle,
                  style: AppTypography.caption(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: AppColors.contentNeutral,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OfficialProfileSheet extends StatelessWidget {
  const _OfficialProfileSheet();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
      decoration: const BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.borderMuted,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(height: 20),
          const _OfficialProfileCard(),
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
          colors: [AppColors.surfaceBrandWarm, AppColors.surfacePrimary],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.brandPrimaryBorderLight),
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
                  style: AppTypography.subtitle2(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.contentHeading,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Hỗ trợ khách hàng 24/7',
                  style: AppTypography.caption(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: AppColors.contentSlate600,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(
                      Icons.verified_user_rounded,
                      size: 14,
                      color: AppColors.statusSuccess,
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        'Tài khoản chính thức của Đại Phát',
                        style: AppTypography.caption(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: AppColors.statusSuccess,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BrandAvatar extends StatelessWidget {
  const _BrandAvatar({this.size = 36});

  final double size;

  static const String _assetPath = 'assets/images/login_logo.jpg';

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.surfaceSoft,
        shape: BoxShape.circle,
        border: Border.all(
          color: AppColors.brandAccentGoldAmber.withValues(alpha: 0.4),
        ),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowLight,
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
            style: AppTypography.h4(
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
          color: AppColors.surfaceNeutral,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: AppTypography.caption(
            fontSize: 11,
            color: AppColors.contentSlate600,
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
            color: AppColors.surfaceDestructiveSoft,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(18),
              topRight: Radius.circular(18),
              bottomLeft: Radius.circular(18),
              bottomRight: Radius.circular(6),
            ),
            border: Border.all(color: AppColors.brandPrimaryBorderLight),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                message.text,
                style: AppTypography.bodyMedium(
                  fontSize: 13,
                  height: 1.45,
                  fontWeight: FontWeight.w500,
                  color: AppColors.contentHeading,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    message.timeLabel,
                    style: AppTypography.caption(
                      fontSize: 10,
                      color: AppColors.contentNeutral,
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

class _SupportBubble extends ConsumerWidget {
  const _SupportBubble({required this.message});

  final UiChatMessage message;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final chatState = ref.watch(chatViewModelProvider);
    final isSending = chatState.isSending;
    final isResultSummary =
        message.variant == ChatMessageVariant.scheduleResultSummary;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        const _BrandAvatar(size: 28),
        const SizedBox(width: 8),
        Flexible(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.sizeOf(context).width *
                  (isResultSummary ? 0.90 : 0.76),
            ),
            child: Container(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
              decoration: BoxDecoration(
                color: AppColors.surfacePrimary,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(18),
                  topRight: Radius.circular(18),
                  bottomRight: Radius.circular(18),
                  bottomLeft: Radius.circular(6),
                ),
                border: Border.all(color: AppColors.borderLight),
                boxShadow: const [
                  BoxShadow(
                    color: AppColors.shadowLight,
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
                        style: AppTypography.caption(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  Text(
                    message.text,
                    style: AppTypography.bodyMedium(
                      fontSize: 13,
                      height: 1.45,
                      fontWeight: FontWeight.w500,
                      color: AppColors.contentHeading,
                    ),
                  ),
                  if (isResultSummary &&
                      message.scheduleResultSummary != null) ...[
                    const SizedBox(height: 8),
                    _ChatLotteryResultSummary(
                      data: message.scheduleResultSummary!,
                    ),
                  ],
                  if (message.actions.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: message.actions.map((action) {
                        return OutlinedButton(
                          onPressed: isSending
                              ? null
                              : () async {
                                  final chatNotifier =
                                      ref.read(chatViewModelProvider.notifier);
                                  if (action.payload.startsWith('ACTION_PICK_DATE')) {
                                    final isResult =
                                        action.payload.contains('goal=RESULT');
                                    final now = DateTime.now();
                                    final picked = await AppDatePickerDialog.show(
                                      context,
                                      now,
                                      firstDate: DateTime(now.year - 1),
                                      lastDate: isResult
                                          ? now
                                          : now.add(const Duration(days: 30)),
                                      title: isResult
                                          ? 'Chọn ngày xem kết quả'
                                          : 'Chọn ngày xem lịch',
                                    );
                                    if (picked != null && context.mounted) {
                                      final d = picked.day
                                          .toString()
                                          .padLeft(2, '0');
                                      final m = picked.month
                                          .toString()
                                          .padLeft(2, '0');
                                      final y = picked.year.toString();
                                      final dateText = '$d/$m/$y';
                                      await chatNotifier.sendText(dateText);
                                    }
                                    return;
                                  }
                                  await chatNotifier.sendText(action.payload);
                                },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: action.primary
                                ? AppColors.primary
                                : AppColors.contentHeading,
                            backgroundColor: action.primary
                                ? AppColors.surfaceBrandWarm
                                : AppColors.surfaceSoft,
                            side: BorderSide(
                              color: action.primary
                                  ? AppColors.brandPrimaryBorderLight
                                  : AppColors.borderLight,
                              width: 1.0,
                            ),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 8,
                            ),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text(
                            action.label,
                            style: AppTypography.buttonSmall(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: action.primary
                                  ? AppColors.primary
                                  : AppColors.contentHeading,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                  const SizedBox(height: 4),
                  Text(
                    message.timeLabel,
                    style: AppTypography.caption(
                      fontSize: 10,
                      color: AppColors.contentNeutral,
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

class _ChatLotteryResultSummary extends ConsumerStatefulWidget {
  const _ChatLotteryResultSummary({required this.data});

  final ScheduleResultSummaryData data;

  @override
  ConsumerState<_ChatLotteryResultSummary> createState() =>
      _ChatLotteryResultSummaryState();
}

class _ChatLotteryResultSummaryState
    extends ConsumerState<_ChatLotteryResultSummary> {
  List<LotteryResult> _results = const [];
  bool _isLoading = true;
  String? _errorMessage;

  int _loadGeneration = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _loadGeneration++;
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant _ChatLotteryResultSummary oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.data.drawDate != widget.data.drawDate ||
        oldWidget.data.region != widget.data.region ||
        oldWidget.data.stationId != widget.data.stationId) {
      _load();
    }
  }

  DateTime _resolveDate(String? raw) {
    if (raw == null || raw.isEmpty) return DateTime.now();
    final upper = raw.toUpperCase().trim();
    if (upper == 'YESTERDAY') {
      return DateTime.now().subtract(const Duration(days: 1));
    }
    if (upper == 'TODAY') {
      return DateTime.now();
    }
    if (upper == 'TOMORROW') {
      return DateTime.now().add(const Duration(days: 1));
    }
    if (RegExp(r'^\d{4}-\d{2}-\d{2}').hasMatch(raw)) {
      return DateTime.tryParse(raw) ?? DateTime.now();
    }
    if (RegExp(r'^\d{1,2}/\d{1,2}/\d{4}').hasMatch(raw)) {
      final parts = raw.split('/');
      final day = int.tryParse(parts[0]) ?? 1;
      final month = int.tryParse(parts[1]) ?? 1;
      final year = int.tryParse(parts[2].substring(0, 4)) ?? DateTime.now().year;
      return DateTime(year, month, day);
    }
    return DateTime.now();
  }

  String _formatDateLabel(DateTime date) {
    final d = date.day.toString().padLeft(2, '0');
    final m = date.month.toString().padLeft(2, '0');
    return '$d/$m/${date.year}';
  }

  String? _regionLabel(String? region) {
    if (region == null) return null;
    return switch (region) {
      'MIEN_NAM' => 'Miền Nam',
      'MIEN_TRUNG' => 'Miền Trung',
      'MIEN_BAC' => 'Miền Bắc',
      _ => region,
    };
  }

  List<LotteryResult> _filterResults(
    List<LotteryResult> results,
    int? stationId,
    List<int>? stationIds,
  ) {
    if (stationId != null && stationId > 0) {
      final match = results.where((r) => r.stationId == stationId).toList();
      if (match.isNotEmpty) return match;
    }
    if (stationIds != null && stationIds.isNotEmpty) {
      final idSet = stationIds.toSet();
      final match = results.where((r) => idSet.contains(r.stationId)).toList();
      if (match.isNotEmpty) return match;
    }
    return results;
  }

  Future<void> _load() async {
    final currentGen = ++_loadGeneration;
    final targetDate = _resolveDate(widget.data.drawDate);
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _results = const [];
    });

    const maxAttempts = 6;
    const pollInterval = Duration(milliseconds: 2500);

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      if (!mounted || currentGen != _loadGeneration) return;

      try {
        final fetch = ref.read(fetchHomeLotteryResultsProvider);
        final fetchResult = await fetch(targetDate, region: widget.data.region);

        if (!mounted || currentGen != _loadGeneration) return;

        final filtered = _filterResults(
          fetchResult.data.results,
          widget.data.stationId,
          widget.data.stationIds,
        );

        final hasPrizeData = filtered.any((r) =>
            r.prizes.special.trim().isNotEmpty ||
            r.prizes.first.trim().isNotEmpty ||
            r.prizes.eighth.any((v) => v.trim().isNotEmpty));

        if (filtered.isNotEmpty && hasPrizeData) {
          setState(() {
            _results = filtered;
            _isLoading = false;
          });
          return;
        }

        if (attempt < maxAttempts - 1) {
          await Future<void>.delayed(pollInterval);
          continue;
        }

        setState(() {
          _results = filtered;
          _isLoading = false;
        });
        return;
      } catch (_) {
        if (!mounted || currentGen != _loadGeneration) return;
        if (attempt < maxAttempts - 1) {
          await Future<void>.delayed(pollInterval);
          continue;
        }
        setState(() {
          _errorMessage =
              'Không thể tải kết quả. Bạn có thể xem chi tiết trên trang Kết quả.';
          _isLoading = false;
        });
        return;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final targetDate = _resolveDate(widget.data.drawDate);
    final displayDate = _formatDateLabel(targetDate);
    final region = _regionLabel(widget.data.region);

    if (_isLoading) {
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.surfaceSoft,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            const SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Đang tải kết quả ngày $displayDate...',
                style: AppTypography.bodySmall(color: AppColors.contentNeutral),
              ),
            ),
          ],
        ),
      );
    }

    if (_errorMessage != null) {
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.surfaceSoft,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          _errorMessage!,
          style: AppTypography.bodySmall(color: AppColors.contentMuted),
        ),
      );
    }

    final hasPrizeData = _results.any((r) =>
        r.prizes.special.trim().isNotEmpty ||
        r.prizes.first.trim().isNotEmpty ||
        r.prizes.eighth.any((v) => v.trim().isNotEmpty));

    if (_results.isEmpty || !hasPrizeData) {
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: AppColors.surfaceSoft,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          'Chưa có kết quả cho ngày $displayDate${region != null ? ' ($region)' : ''}.',
          style: AppTypography.bodySmall(color: AppColors.contentMuted),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < _results.length; i++) ...[
          if (i > 0) const SizedBox(height: 10),
          _ChatLotteryStationCard(
            result: _results[i],
            fallbackDate: displayDate,
          ),
        ],
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerLeft,
          child: ElevatedButton(
            onPressed: () => context.go(AppRoute.checkTicket.path),
            style: ElevatedButton.styleFrom(
              foregroundColor: AppColors.white,
              backgroundColor: AppColors.primary,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: Text(
              'Xem chi tiết',
              style: AppTypography.buttonSmall(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: AppColors.white,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ChatLotteryStationCard extends StatelessWidget {
  const _ChatLotteryStationCard({
    required this.result,
    required this.fallbackDate,
  });

  final LotteryResult result;
  final String fallbackDate;

  String _formatValues(List<String> values) {
    final clean = values.where((v) => v.trim().isNotEmpty).toList();
    return clean.isEmpty ? '—' : clean.join(' · ');
  }

  String _formatSingle(String value) {
    return value.trim().isEmpty ? '—' : value.trim();
  }

  @override
  Widget build(BuildContext context) {
    final rows = <_PrizeItem>[
      _PrizeItem(
        label: 'Đặc biệt',
        value: _formatSingle(result.prizes.special),
        accent: true,
      ),
      _PrizeItem(label: 'Giải 1', value: _formatSingle(result.prizes.first)),
      _PrizeItem(label: 'Giải 2', value: _formatSingle(result.prizes.second)),
      _PrizeItem(label: 'Giải 3', value: _formatValues(result.prizes.third)),
      _PrizeItem(label: 'Giải 4', value: _formatValues(result.prizes.fourth)),
      _PrizeItem(label: 'Giải 5', value: _formatValues(result.prizes.fifth)),
      _PrizeItem(label: 'Giải 6', value: _formatValues(result.prizes.sixth)),
      _PrizeItem(label: 'Giải 7', value: _formatValues(result.prizes.seventh)),
      _PrizeItem(label: 'Giải 8', value: _formatValues(result.prizes.eighth)),
    ];

    final dateLabel =
        result.dateLabel.isNotEmpty ? result.dateLabel : fallbackDate;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: const BoxDecoration(
              color: AppColors.surfaceSlate100,
              border: Border(bottom: BorderSide(color: AppColors.borderLight)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  result.province,
                  style: AppTypography.caption(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.contentHeading,
                  ),
                ),
                Text(
                  dateLabel,
                  style: AppTypography.caption(
                    fontSize: 11,
                    color: AppColors.contentMuted,
                  ),
                ),
              ],
            ),
          ),
          for (var i = 0; i < rows.length; i++) ...[
            if (i > 0)
              const Divider(
                height: 1,
                thickness: 1,
                color: AppColors.borderSubtle,
              ),
            Container(
              color: rows[i].accent
                  ? AppColors.surfaceBrandWarm
                  : AppColors.white,
              padding: const EdgeInsets.symmetric(
                horizontal: 10,
                vertical: 6.5,
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 66,
                    child: Text(
                      rows[i].label,
                      style: AppTypography.caption(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: rows[i].accent
                            ? AppColors.primary
                            : AppColors.contentNeutral,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      rows[i].value,
                      style: AppTypography.caption(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.4,
                        color: rows[i].accent
                            ? AppColors.primary
                            : AppColors.contentHeading,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _PrizeItem {
  const _PrizeItem({
    required this.label,
    required this.value,
    this.accent = false,
  });

  final String label;
  final String value;
  final bool accent;
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
        Flexible(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.surfacePrimary,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Text(
              'Đại Phát đang soạn tin...',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.caption(
                fontSize: 12,
                color: AppColors.contentSlate600,
                fontStyle: FontStyle.italic,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _TicketSuggestBlock extends ConsumerWidget {
  const _TicketSuggestBlock({required this.message});

  final UiChatMessage message;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final chatState = ref.watch(chatViewModelProvider);
    final isSending = chatState.isSending;
    final canSuggestAgain = isOpenBotThread(chatState.conversationStatus) &&
        chatState.conversationStatus !=
            ConversationStatus.waitingForOperator &&
        message.suggestedTickets.isNotEmpty;

    return Column(
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
        Padding(
          padding: const EdgeInsets.only(left: 36),
          child: SizedBox(
            height: 148,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: message.suggestedTickets.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                if (index < 0 || index >= message.suggestedTickets.length) {
                  return const SizedBox.shrink();
                }
                final ticket = message.suggestedTickets[index];
                return _TicketSuggestCard(ticket: ticket);
              },
            ),
          ),
        ),
        if (canSuggestAgain) ...[
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.only(left: 36),
            child: OutlinedButton.icon(
              onPressed: isSending
                  ? null
                  : () {
                      final excludeIds = collectSuggestedTicketIds(
                        chatState.visibleMessages,
                      );
                      final nextMessage = buildSuggestAgainMessage(excludeIds);
                      ref
                          .read(chatViewModelProvider.notifier)
                          .sendText(nextMessage);
                    },
              icon: const Icon(
                Icons.refresh_rounded,
                size: 15,
                color: AppColors.primary,
              ),
              label: Text(
                'Gợi ý số khác',
                style: AppTypography.buttonSmall(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                backgroundColor: AppColors.surfacePrimary,
                side: const BorderSide(
                  color: AppColors.brandPrimaryBorderLight,
                  width: 1.0,
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 6,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(999),
                ),
                elevation: 0,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _TicketSuggestCard extends StatelessWidget {
  const _TicketSuggestCard({required this.ticket});

  final SuggestedTicketModel ticket;

  String _formatPrice() {
    if (ticket.price == null) return '—';
    return AppFormatters.formatCurrency(ticket.price);
  }

  String _formatDrawDate() =>
      AppFormatters.formatDateIso(ticket.drawDate, fallback: '—');

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 180,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surfacePrimary,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.brandPrimaryBorderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            ticket.numbers,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AppTypography.lotteryDigit(
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
            style: AppTypography.caption(
              fontSize: 11,
              color: AppColors.contentSlate600,
            ),
          ),
          Text(
            _formatDrawDate(),
            style: AppTypography.caption(
              fontSize: 11,
              color: AppColors.contentSlate600,
            ),
          ),
          const Spacer(),
          Row(
            children: [
              Expanded(
                child: Text(
                  _formatPrice(),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.priceMedium(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.contentHeading,
                  ),
                ),
              ),
              const SizedBox(width: 4),
              TextButton(
                onPressed: () {
                  final params = <String, String>{
                    if (ticket.stationId != null)
                      'stationId': '${ticket.stationId}',
                    if (ticket.drawDate != null) 'drawDate': ticket.drawDate!,
                    'search': ticket.numbers,
                  };
                  final query = params.entries
                      .map(
                        (entry) =>
                            '${entry.key}=${Uri.encodeComponent(entry.value)}',
                      )
                      .join('&');
                  context.push('${AppRoute.buyTicket.path}?$query');
                },
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.surfacePrimary,
                  backgroundColor: AppColors.primary,
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 6,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Text(
                  'Mua ngay',
                  style: AppTypography.buttonSmall(
                    color: AppColors.surfacePrimary,
                  ),
                ),
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
          if (index < 0 || index >= replies.length) {
            return const SizedBox.shrink();
          }
          final reply = replies[index];
          final textColor = reply.primary ? AppColors.white : AppColors.primary;
          return OutlinedButton(
            onPressed: () => onTap(reply),
            style: OutlinedButton.styleFrom(
              foregroundColor: textColor,
              backgroundColor: reply.primary
                  ? AppColors.primary
                  : AppColors.surfacePrimary,
              side: BorderSide(
                color: reply.primary
                    ? AppColors.primary
                    : AppColors.brandPrimaryBorderLight,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(999),
              ),
              textStyle: AppTypography.buttonSmall(
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
            child: Text(
              reply.label,
              style: AppTypography.buttonSmall(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: textColor,
              ),
            ),
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
      padding: EdgeInsets.fromLTRB(16, 10, 16, 10 + bottomInset),
      decoration: const BoxDecoration(
        color: AppColors.surfacePrimary,
        border: Border(top: BorderSide(color: AppColors.borderLight)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              enabled: enabled,
              textInputAction: TextInputAction.send,
              onSubmitted: enabled ? (_) => onSend() : null,
              decoration: InputDecoration(
                hintText: 'Nhập tin nhắn...',
                hintStyle: AppTypography.bodySmall(
                  fontSize: 13,
                  color: AppColors.contentPlaceholderStrong,
                ),
                filled: true,
                fillColor: AppColors.surfaceNeutral,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 10,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(999),
                  borderSide: BorderSide.none,
                ),
              ),
              style: AppTypography.bodySmall(
                fontSize: 13,
                color: AppColors.contentHeading,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Material(
            color: enabled ? AppColors.primary : AppColors.borderLight,
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: enabled ? onSend : null,
              child: const SizedBox(
                width: 40,
                height: 40,
                child: Icon(
                  Icons.send_rounded,
                  color: AppColors.surfacePrimary,
                  size: 20,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
