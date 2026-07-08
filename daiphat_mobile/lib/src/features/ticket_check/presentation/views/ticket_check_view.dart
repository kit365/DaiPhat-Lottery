import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'package:daiphat_mobile/src/features/ticket_check/data/models/ticket_check_models.dart';
import 'package:daiphat_mobile/src/features/ticket_check/presentation/providers/ticket_check_providers.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

class TicketCheckView extends ConsumerStatefulWidget {
  const TicketCheckView({super.key});

  @override
  ConsumerState<TicketCheckView> createState() => _TicketCheckViewState();
}

class _TicketCheckViewState extends ConsumerState<TicketCheckView> {
  late DateTime _selectedDate;
  final TextEditingController _ticketNumberController = TextEditingController();
  final NumberFormat _currencyFormatter = NumberFormat.currency(
    locale: 'vi_VN',
    symbol: 'đ',
    decimalDigits: 0,
  );
  final DateFormat _displayDateFormatter = DateFormat('dd/MM/yyyy');

  List<LotteryStationDraw> _stations = const [];
  int? _selectedStationId;
  bool _isLoadingStations = false;
  bool _isChecking = false;
  bool _hasChecked = false;
  String? _errorMessage;
  TicketCheckResult? _checkResult;

  @override
  void initState() {
    super.initState();
    _selectedDate = _resolveDefaultDate();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadStations());
  }

  @override
  void dispose() {
    _ticketNumberController.dispose();
    super.dispose();
  }

  DateTime _resolveDefaultDate() {
    final now = DateTime.now();
    final beforeResultTime =
        now.hour < 16 || (now.hour == 16 && now.minute < 40);
    final base = beforeResultTime ? now.subtract(const Duration(days: 1)) : now;
    return DateTime(base.year, base.month, base.day);
  }

  Future<void> _loadStations() async {
    setState(() {
      _isLoadingStations = true;
      _selectedStationId = null;
      _stations = const [];
    });

    try {
      final stations = await ref
          .read(ticketCheckApiServiceProvider)
          .getScheduleForDate(_selectedDate);
      if (!mounted) return;
      setState(() {
        _stations = stations;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _stations = const [];
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingStations = false;
        });
      }
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );

    if (picked == null) return;

    setState(() {
      _selectedDate = DateTime(picked.year, picked.month, picked.day);
      _resetResultState(clearTicketNumber: false);
    });
    await _loadStations();
  }

  Future<void> _checkTicket() async {
    FocusScope.of(context).unfocus();
    final ticketNumber = _ticketNumberController.text.trim();

    if (_selectedStationId == null) {
      setState(() {
        _errorMessage = 'Vui lòng chọn đài quay.';
      });
      return;
    }

    if (ticketNumber.length < 5) {
      setState(() {
        _errorMessage = 'Vui lòng nhập số vé hợp lệ (5 hoặc 6 chữ số).';
      });
      return;
    }

    setState(() {
      _isChecking = true;
      _errorMessage = null;
      _hasChecked = false;
      _checkResult = null;
    });

    try {
      final result = await ref.read(ticketCheckApiServiceProvider).checkWinning(
        stationId: _selectedStationId!,
        drawDate: _selectedDate,
        ticketNumber: ticketNumber,
      );

      if (!mounted) return;
      setState(() {
        _checkResult = result;
        _hasChecked = true;
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message.isNotEmpty
            ? error.message
            : 'Không tìm thấy kết quả quay số của đài này vào ngày đã chọn.';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Không thể tra cứu kết quả lúc này. Vui lòng thử lại.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isChecking = false;
        });
      }
    }
  }

  void _resetResultState({required bool clearTicketNumber}) {
    _hasChecked = false;
    _checkResult = null;
    _errorMessage = null;
    if (clearTicketNumber) {
      _ticketNumberController.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.pageBg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _HeaderCard(),
              const SizedBox(height: 16),
              _buildFormCard(),
              const SizedBox(height: 16),
              _buildResultCard(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFormCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFFFD8D8)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x12000000),
            blurRadius: 20,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionLabel(
            icon: Icons.calendar_month_outlined,
            label: 'Ngày quay',
          ),
          const SizedBox(height: 8),
          _TapField(
            icon: Icons.event_outlined,
            text: _displayDateFormatter.format(_selectedDate),
            onTap: _pickDate,
          ),
          const SizedBox(height: 16),
          _SectionLabel(
            icon: Icons.location_on_outlined,
            label: 'Chọn đài',
          ),
          const SizedBox(height: 8),
          _buildStationDropdown(),
          const SizedBox(height: 16),
          _SectionLabel(
            icon: Icons.confirmation_number_outlined,
            label: 'Số vé',
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _ticketNumberController,
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(6),
            ],
            decoration: InputDecoration(
              hintText: 'Nhập số vé (5-6 chữ số)',
              prefixIcon: const Icon(
                Icons.pin_outlined,
                color: AppColors.primary,
              ),
              filled: true,
              fillColor: const Color(0xFFFFFBFB),
              enabledBorder: _inputBorder(),
              focusedBorder: _inputBorder(color: AppColors.primary),
            ),
            onChanged: (_) {
              if (_errorMessage != null) {
                setState(() {
                  _errorMessage = null;
                });
              }
            },
          ),
          if (_errorMessage != null) ...[
            const SizedBox(height: 12),
            _MessageBox(
              backgroundColor: const Color(0xFFFFF1F1),
              borderColor: const Color(0xFFFFD6D6),
              icon: Icons.error_outline,
              iconColor: AppColors.error,
              title: 'Có lỗi xảy ra',
              message: _errorMessage!,
            ),
          ],
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _isChecking ? null : _checkTicket,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                ),
              ),
              icon: _isChecking
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Icon(Icons.search),
              label: Text(_isChecking ? 'Đang dò kết quả...' : 'Kiểm tra kết quả'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStationDropdown() {
    return InputDecorator(
      decoration: InputDecoration(
        filled: true,
        fillColor: const Color(0xFFFFFBFB),
        enabledBorder: _inputBorder(),
        focusedBorder: _inputBorder(color: AppColors.primary),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        prefixIcon: _isLoadingStations
            ? const Padding(
                padding: EdgeInsets.all(14),
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              )
            : const Icon(Icons.flag_outlined, color: AppColors.primary),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          isExpanded: true,
          value: _selectedStationId,
          hint: Text(
            _isLoadingStations
                ? 'Đang tải đài quay...'
                : _stations.isEmpty
                ? 'Không có đài nào'
                : '-- Chọn đài --',
          ),
          items: _stations
              .map(
                (station) => DropdownMenuItem<int>(
                  value: station.id,
                  child: Text(station.province),
                ),
              )
              .toList(),
          onChanged: _isLoadingStations || _stations.isEmpty
              ? null
              : (value) {
                  setState(() {
                    _selectedStationId = value;
                    _errorMessage = null;
                  });
                },
        ),
      ),
    );
  }

  Widget _buildResultCard() {
    if (_isChecking) {
      return _ResultWrapper(
        child: Column(
          children: const [
            SizedBox(height: 8),
            CircularProgressIndicator(color: AppColors.primary),
            SizedBox(height: 14),
            Text(
              'Đang dò kết quả...',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      );
    }

    if (!_hasChecked || _checkResult == null) {
      return _ResultWrapper(
        child: Column(
          children: const [
            Icon(Icons.search, size: 36, color: AppColors.primary),
            SizedBox(height: 12),
            Text(
              'Tra cứu vé số nhanh',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
              ),
            ),
            SizedBox(height: 6),
            Text(
              'Chọn ngày quay, đài và nhập số vé để kiểm tra kết quả.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                height: 1.5,
                color: AppColors.textMuted,
              ),
            ),
          ],
        ),
      );
    }

    if (_checkResult!.winning) {
      return _ResultWrapper(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF3),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFB7E4C7)),
              ),
              child: const Column(
                children: [
                  Text('🎉', style: TextStyle(fontSize: 28)),
                  SizedBox(height: 6),
                  Text(
                    'Chúc mừng bạn đã trúng!',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF166534),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            ..._checkResult!.matchedPrizes.map(_buildPrizeTile),
            if (_checkResult!.matchedPrizes.length > 1) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF3F3),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Tổng giải thưởng',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.ink,
                      ),
                    ),
                    Text(
                      _currencyFormatter.format(_checkResult!.totalWinningAmount),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 14),
            _AgainButton(
              onPressed: () => setState(() {
                _resetResultState(clearTicketNumber: true);
              }),
            ),
          ],
        ),
      );
    }

    if (!_checkResult!.resultAvailable) {
      return _ResultWrapper(
        child: Column(
          children: [
            const Text('⏳', style: TextStyle(fontSize: 32)),
            const SizedBox(height: 10),
            const Text(
              'Chưa có kết quả',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: AppColors.ink,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Kết quả xổ số đài này ngày ${_formatApiDate(_checkResult!.drawDate)} chưa được cập nhật. Vui lòng quay lại sau.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                height: 1.5,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 14),
            _AgainButton(
              onPressed: () => setState(() {
                _resetResultState(clearTicketNumber: true);
              }),
            ),
          ],
        ),
      );
    }

    return _ResultWrapper(
      child: Column(
        children: [
          const Text('🍀', style: TextStyle(fontSize: 32)),
          const SizedBox(height: 10),
          const Text(
            'Rất tiếc, chưa trúng giải',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppColors.ink,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Vé số của bạn không trùng với giải nào lần này. Chúc bạn may mắn lần sau!',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              height: 1.5,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 14),
          _AgainButton(
            onPressed: () => setState(() {
              _resetResultState(clearTicketNumber: true);
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildPrizeTile(TicketMatchedPrize prize) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE8EEF5)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  prize.prizeDisplayName,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: AppColors.ink,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Số trúng: ${prize.winningNumber}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            _currencyFormatter.format(prize.prizeValue),
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w900,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  OutlineInputBorder _inputBorder({Color color = const Color(0xFFFFDCDC)}) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(18),
      borderSide: BorderSide(color: color),
    );
  }

  String _formatApiDate(String raw) {
    try {
      return _displayDateFormatter.format(DateTime.parse(raw));
    } catch (_) {
      return raw;
    }
  }
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFD31010), Color(0xFFF25C54)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(28),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: Colors.white24,
                child: Icon(Icons.search, color: Colors.white),
              ),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Tra cứu vé số',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: 12),
          Text(
            'Dò nhanh kết quả vé số theo ngày quay và đài, giống luồng tra cứu trên web.',
            style: TextStyle(
              fontSize: 13,
              height: 1.5,
              color: Color(0xFFFFE5E5),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.primary),
        const SizedBox(width: 8),
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.ink,
          ),
        ),
      ],
    );
  }
}

class _TapField extends StatelessWidget {
  const _TapField({
    required this.icon,
    required this.text,
    required this.onTap,
  });

  final IconData icon;
  final String text;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Ink(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFBFB),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFFFDCDC)),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                text,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.ink,
                ),
              ),
            ),
            const Icon(Icons.expand_more, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}

class _MessageBox extends StatelessWidget {
  const _MessageBox({
    required this.backgroundColor,
    required this.borderColor,
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.message,
  });

  final Color backgroundColor;
  final Color borderColor;
  final IconData icon;
  final Color iconColor;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: iconColor),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: AppColors.ink,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  message,
                  style: const TextStyle(
                    fontSize: 12,
                    height: 1.4,
                    color: AppColors.textSecondary,
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

class _ResultWrapper extends StatelessWidget {
  const _ResultWrapper({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFF0E7E7)),
      ),
      child: child,
    );
  }
}

class _AgainButton extends StatelessWidget {
  const _AgainButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textSecondary,
          side: const BorderSide(color: Color(0xFFE6E6E6)),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
        ),
        child: const Text(
          'Dò vé khác',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}
