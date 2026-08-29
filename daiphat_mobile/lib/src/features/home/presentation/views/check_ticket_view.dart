import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/features/home/data/models/ticket_check_models.dart';
import 'package:daiphat_mobile/src/features/home/presentation/viewmodels/ticket_check_viewmodel.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/shared/utils/app_formatters.dart';

class CheckTicketView extends ConsumerWidget {
  const CheckTicketView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(ticketCheckViewModelProvider);
    final vm = ref.read(ticketCheckViewModelProvider.notifier);

    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: Stack(
        children: [
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 320,
            child: ShaderMask(
              shaderCallback: (bounds) => const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [AppColors.surfacePrimary, AppColors.transparent],
                stops: [0.4, 1.0],
              ).createShader(bounds),
              blendMode: BlendMode.dstIn,
              child: Image.asset('assets/images/home_bg.png', fit: BoxFit.cover),
            ),
          ),
          SafeArea(
            bottom: false,
            child: RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () async {
                final date = state.selectedDate;
                if (date != null) {
                  await vm.loadStations(date);
                }
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  children: [
                    // Header Bar on top of background
                    const Padding(
                      padding: EdgeInsets.fromLTRB(16, 8, 16, 12),
                      child: _HeaderBar(),
                    ),

                    // Main Form Card
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
                        decoration: BoxDecoration(
                          color: AppColors.surfacePrimary,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(
                            color: const Color(0xFFEAEBED),
                            width: 1.0,
                          ),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x0A000000),
                              blurRadius: 16,
                              offset: Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'TRA CỨU VÉ SỐ',
                              textAlign: TextAlign.center,
                              style: AppTypography.display(
                                const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.primary,
                                  letterSpacing: 0.6,
                                ),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Nhập thông tin vé để kiểm tra kết quả nhanh chóng',
                              textAlign: TextAlign.center,
                              style: AppTypography.main(
                                const TextStyle(
                                  fontSize: 13,
                                  color: AppColors.contentMuted,
                                ),
                              ),
                            ),
                            const SizedBox(height: 22),
                            if (state.isChecking)
                              const _CheckingState()
                            else if (state.errorMessage != null)
                              _ErrorState(
                                message: state.errorMessage!,
                                onRetry: vm.clearErrorMessage,
                              )
                            else if (state.hasChecked &&
                                state.checkResult != null)
                              _ResultState(
                                result: state.checkResult!,
                                onReset: vm.resetCheck,
                              )
                            else ...[
                              _FormState(state: state, vm: vm),
                              const SizedBox(height: 22),
                              const _ImportantNotes(),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeaderBar extends StatelessWidget {
  const _HeaderBar();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          'Dò vé',
          style: AppTypography.pageTitle(),
        ),
        const Spacer(),
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: AppColors.surfacePrimary,
            shape: BoxShape.circle,
            border: Border.all(color: const Color(0xFFEAEBED)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x0A000000),
                blurRadius: 8,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: const Icon(
            Icons.search_rounded,
            color: AppColors.primary,
            size: 20,
          ),
        ),
      ],
    );
  }
}

class _ImportantNotes extends StatelessWidget {
  const _ImportantNotes();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF5F5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFFE0E0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFE4E4),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.verified_user_outlined,
                  size: 16,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Lưu ý quan trọng',
                style: AppTypography.main(
                  const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF7F1D1D),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _noteLine(
            'Kết quả được cập nhật ngay sau khi có kết quả chính thức từ các đài.',
          ),
          const SizedBox(height: 6),
          _noteLine(
            'Thông tin vé của bạn được bảo mật và không lưu trữ sau khi tra cứu.',
          ),
        ],
      ),
    );
  }

  Widget _noteLine(String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Container(
            width: 5,
            height: 5,
            decoration: const BoxDecoration(
              color: AppColors.primary,
              shape: BoxShape.circle,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: AppTypography.main(
              const TextStyle(
                fontSize: 12,
                height: 1.45,
                color: Color(0xFF7F1D1D),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _CheckingState extends StatelessWidget {
  const _CheckingState();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 40),
      child: Column(
        children: [
          CircularProgressIndicator(color: AppColors.primary),
          SizedBox(height: 14),
          Text(
            'Đang dò kết quả...',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.contentMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: const BoxDecoration(
            color: Color(0xFFFFE4E4),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.error_outline, color: AppColors.primary),
        ),
        const SizedBox(height: 12),
        Text(
          message,
          textAlign: TextAlign.center,
          style: AppTypography.main(
            const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Color(0xFFB91C1C),
            ),
          ),
        ),
        const SizedBox(height: 14),
        FilledButton(
          onPressed: onRetry,
          style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
          child: const Text('Thử lại'),
        ),
      ],
    );
  }
}

class _ResultState extends StatelessWidget {
  const _ResultState({required this.result, required this.onReset});

  final TicketCheckResult result;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    if (result.winning) {
      return Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFECFDF5), Color(0xFFF0FDFA)],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFA7F3D0)),
            ),
            child: Column(
              children: [
                const Text('🎉', style: TextStyle(fontSize: 28)),
                const SizedBox(height: 6),
                Text(
                  'Chúc mừng bạn đã trúng!',
                  style: AppTypography.display(
                    const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF065F46),
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Vé số của bạn trùng khớp với kết quả:',
                  style: AppTypography.main(
                    const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF059669),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          ...result.matchedPrizes.map(
            (prize) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surfaceSoft,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          prize.prizeDisplayName,
                          style: AppTypography.main(
                            const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Số trúng: ${prize.winningNumber}',
                          style: AppTypography.main(
                            const TextStyle(
                              fontSize: 11,
                              color: AppColors.primary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    AppFormatters.formatCurrency(prize.prizeValue),
                    style: AppTypography.main(
                      const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (result.matchedPrizes.length > 1) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF1F1),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  Text(
                    'Tổng giải thưởng:',
                    style: AppTypography.main(
                      const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    AppFormatters.formatCurrency(result.totalWinningAmount),
                    style: AppTypography.number(
                      const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 14),
          OutlinedButton(
            onPressed: onReset,
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF475569),
              side: const BorderSide(color: AppColors.borderSubtle),
              minimumSize: const Size.fromHeight(44),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: const Text('Dò vé khác'),
          ),
        ],
      );
    }

    if (!result.resultAvailable) {
      return _NeutralResult(
        emoji: '⏳',
        title: 'Chưa có kết quả',
        message:
            'Kết quả xổ số đài này ngày đã chọn chưa được cập nhật. Vui lòng quay lại sau!',
        onReset: onReset,
      );
    }

    return _NeutralResult(
      emoji: '🍀',
      title: 'Rất tiếc, chưa trúng giải',
      message:
          'Vé số của bạn không trùng với giải nào lần này. Chúc bạn may mắn lần sau!',
      onReset: onReset,
    );
  }
}

class _NeutralResult extends StatelessWidget {
  const _NeutralResult({
    required this.emoji,
    required this.title,
    required this.message,
    required this.onReset,
  });

  final String emoji;
  final String title;
  final String message;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(emoji, style: const TextStyle(fontSize: 28)),
        const SizedBox(height: 8),
        Text(
          title,
          style: AppTypography.display(
            const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              color: Color(0xFF334155),
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          message,
          textAlign: TextAlign.center,
          style: AppTypography.main(
            const TextStyle(
              fontSize: 12,
              color: AppColors.contentMuted,
            ),
          ),
        ),
        const SizedBox(height: 16),
        OutlinedButton(
          onPressed: onReset,
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFF475569),
            side: const BorderSide(color: AppColors.borderSubtle),
            minimumSize: const Size.fromHeight(44),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          child: const Text('Dò vé khác'),
        ),
      ],
    );
  }
}

class _FormState extends StatefulWidget {
  const _FormState({required this.state, required this.vm});

  final TicketCheckState state;
  final TicketCheckViewModel vm;

  @override
  State<_FormState> createState() => _FormStateState();
}

class _FormStateState extends State<_FormState> {
  late final TextEditingController _numberController;

  @override
  void initState() {
    super.initState();
    _numberController = TextEditingController(text: widget.state.ticketNumber);
  }

  @override
  void didUpdateWidget(covariant _FormState oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.state.ticketNumber != _numberController.text) {
      _numberController.text = widget.state.ticketNumber;
      _numberController.selection = TextSelection.collapsed(
        offset: _numberController.text.length,
      );
    }
  }

  @override
  void dispose() {
    _numberController.dispose();
    super.dispose();
  }

  TicketCheckState get state => widget.state;
  TicketCheckViewModel get vm => widget.vm;

  @override
  Widget build(BuildContext context) {
    final selectedDate = state.selectedDate;
    final dateLabel = selectedDate == null
        ? 'Chọn ngày quay'
        : DateFormat('dd/MM/yyyy').format(selectedDate);
    final canPickStation =
        selectedDate != null && !state.isLoadingStations && state.stations.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Chọn ngày',
          style: AppTypography.main(
            const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: Color(0xFF334155),
            ),
          ),
        ),
        const SizedBox(height: 8),
        InkWell(
          onTap: () => _pickDate(context),
          borderRadius: BorderRadius.circular(14),
          child: InputDecorator(
            decoration: InputDecoration(
              filled: true,
              fillColor: AppColors.surfacePrimary,
              errorText: state.dateError,
              prefixIcon: const Icon(Icons.calendar_month_outlined,
                  color: AppColors.primary, size: 18),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppColors.borderSubtle),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(
                  color: state.dateError != null
                      ? const Color(0xFFF87171)
                      : AppColors.borderSubtle,
                ),
              ),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            ),
            child: Text(
              dateLabel,
              style: AppTypography.main(
                TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: selectedDate == null
                      ? AppColors.contentSubtle
                      : const Color(0xFF0F172A),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          'Chọn đài',
          style: AppTypography.main(
            const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: Color(0xFF334155),
            ),
          ),
        ),
        const SizedBox(height: 8),
        InkWell(
          onTap: canPickStation ? () => _pickStation(context) : null,
          borderRadius: BorderRadius.circular(14),
          child: InputDecorator(
            decoration: InputDecoration(
              filled: true,
              fillColor: canPickStation ? AppColors.surfacePrimary : AppColors.surfaceSoft,
              errorText: state.stationError,
              prefixIcon: Icon(
                Icons.place_outlined,
                color: canPickStation
                    ? AppColors.primary
                    : const Color(0xFFCBD5E1),
                size: 18,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppColors.borderSubtle),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(
                  color: state.stationError != null
                      ? const Color(0xFFF87171)
                      : AppColors.borderSubtle,
                ),
              ),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            ),
            child: Text(
              selectedDate == null
                  ? 'Chọn ngày trước'
                  : state.isLoadingStations
                      ? 'Đang tải đài...'
                      : (state.selectedStation?.province ?? 'Chọn đài'),
              style: AppTypography.main(
                TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: !canPickStation && state.selectedStation == null
                      ? AppColors.contentSubtle
                      : const Color(0xFF0F172A),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Text(
          'Nhập dãy số trên vé',
          style: AppTypography.main(
            const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: Color(0xFF334155),
            ),
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _numberController,
          keyboardType: TextInputType.number,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          onChanged: vm.setTicketNumber,
          style: AppTypography.number(
            const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              letterSpacing: 2,
            ),
          ),
          decoration: InputDecoration(
            counterText: '',
            hintText: 'Nhập dãy số (ví dụ: 123456)',
            errorText: state.numberError,
            helperText: state.numberError == null
                ? 'Nhập đúng 5 hoặc 6 chữ số trên vé của bạn'
                : null,
            prefixIcon: const Icon(Icons.confirmation_number_outlined,
                color: AppColors.primary, size: 18),
            filled: true,
            fillColor: AppColors.surfacePrimary,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppColors.borderSubtle),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(
                color: state.numberError != null
                    ? const Color(0xFFF87171)
                    : AppColors.borderSubtle,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide:
                  const BorderSide(color: AppColors.primary, width: 1.4),
            ),
          ),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: vm.check,
          icon: const Icon(Icons.search_rounded, size: 20),
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.primary,
            minimumSize: const Size.fromHeight(50),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          label: Text(
            'Tra cứu kết quả',
            style: AppTypography.main(
              const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),
        Text(
          'HOẶC CHỌN NHANH',
          textAlign: TextAlign.center,
          style: AppTypography.main(
            const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: AppColors.contentSubtle,
              letterSpacing: 0.8,
            ),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _QuickDateChip(
                label: 'Hôm nay',
                selected: state.selectedDate != null &&
                    _isSameDay(state.selectedDate!, DateTime.now()),
                onTap: () {
                  final now = DateTime.now();
                  vm.loadStations(DateTime(now.year, now.month, now.day));
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _QuickDateChip(
                label: 'Hôm qua',
                selected: state.selectedDate != null &&
                    _isSameDay(
                      state.selectedDate!,
                      DateTime.now().subtract(const Duration(days: 1)),
                    ),
                onTap: () {
                  final d = DateTime.now().subtract(const Duration(days: 1));
                  vm.loadStations(DateTime(d.year, d.month, d.day));
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _pickDate(BuildContext context) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: state.selectedDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(primary: AppColors.primary),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      await vm.loadStations(DateTime(picked.year, picked.month, picked.day));
    }
  }

  Future<void> _pickStation(BuildContext context) async {
    if (state.stations.isEmpty) return;
    final selected = await showModalBottomSheet<LotteryStationDraw>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: ListView.separated(
            shrinkWrap: true,
            itemCount: state.stations.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final station = state.stations[index];
              final isSelected = station.id == state.selectedStationId;
              return ListTile(
                leading: Icon(
                  Icons.place_outlined,
                  color:
                      isSelected ? AppColors.primary : AppColors.contentSubtle,
                ),
                title: Text(
                  station.province,
                  style: AppTypography.main(
                    TextStyle(
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      color: isSelected ? AppColors.primary : null,
                    ),
                  ),
                ),
                trailing: isSelected
                    ? const Icon(Icons.check, color: AppColors.primary)
                    : null,
                onTap: () => Navigator.of(context).pop(station),
              );
            },
          ),
        );
      },
    );
    if (selected != null) {
      vm.selectStation(selected.id);
    }
  }

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}

class _QuickDateChip extends StatelessWidget {
  const _QuickDateChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppColors.primary : const Color(0xFF475569);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFFFF1F1) : AppColors.surfaceSoft,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? const Color(0xFFFECACA) : AppColors.borderSubtle,
          ),
        ),
        alignment: Alignment.center,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.calendar_today_outlined, size: 14, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: AppTypography.main(
                TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
