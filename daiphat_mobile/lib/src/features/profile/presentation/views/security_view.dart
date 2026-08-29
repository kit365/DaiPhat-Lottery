import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

import 'package:daiphat_mobile/src/features/auth/data/models/password_policy.dart';
import 'package:daiphat_mobile/src/features/auth/data/services/auth_api_service.dart';
import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';

class SecurityView extends ConsumerStatefulWidget {
  const SecurityView({super.key});

  @override
  ConsumerState<SecurityView> createState() => _SecurityViewState();
}

class _SecurityViewState extends ConsumerState<SecurityView> {
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _showCurrentPassword = false;
  bool _showNewPassword = false;
  bool _showConfirmPassword = false;
  bool _isNewPasswordFocused = false;
  bool _isSubmitting = false;
  bool _isLoadingPolicy = true;

  PasswordPolicy? _passwordPolicy;

  @override
  void initState() {
    super.initState();
    _currentPasswordController.addListener(_onFieldsChanged);
    _newPasswordController.addListener(_onFieldsChanged);
    _confirmPasswordController.addListener(_onFieldsChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _loadPasswordPolicy();
    });
  }

  @override
  void dispose() {
    _currentPasswordController
      ..removeListener(_onFieldsChanged)
      ..dispose();
    _newPasswordController
      ..removeListener(_onFieldsChanged)
      ..dispose();
    _confirmPasswordController
      ..removeListener(_onFieldsChanged)
      ..dispose();
    super.dispose();
  }

  void _onFieldsChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _loadPasswordPolicy() async {
    try {
      final policy = await AuthApiService(
        ref.read(apiClientProvider),
      ).getPasswordPolicy();
      if (!mounted) return;
      setState(() {
        _passwordPolicy = policy;
        _isLoadingPolicy = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoadingPolicy = false);
    }
  }

  bool get _isPasswordValid {
    final policy = _passwordPolicy;
    if (policy == null) return true;
    return policy.isPasswordValid(_newPasswordController.text);
  }

  bool get _canSubmit {
    final current = _currentPasswordController.text;
    final next = _newPasswordController.text;
    final confirm = _confirmPasswordController.text;
    return !_isSubmitting &&
        current.isNotEmpty &&
        next.isNotEmpty &&
        confirm.isNotEmpty &&
        next == confirm &&
        _isPasswordValid;
  }

  Future<void> _handleSubmit() async {
    final current = _currentPasswordController.text;
    final next = _newPasswordController.text;
    final confirm = _confirmPasswordController.text;

    if (current.isEmpty || next.isEmpty || confirm.isEmpty) {
      AppToast.error('Vui lòng điền đầy đủ các trường mật khẩu.');
      return;
    }

    if (next != confirm) {
      AppToast.error('Mật khẩu nhập lại không khớp.');
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      // Web cũng chưa gọi API đổi mật khẩu — giữ cùng hành vi stub.
      await Future<void>.delayed(const Duration(milliseconds: 800));
      if (!mounted) return;
      AppToast.info('Tính năng đổi mật khẩu sẽ sớm ra mắt!');
      _currentPasswordController.clear();
      _newPasswordController.clear();
      _confirmPasswordController.clear();
    } catch (_) {
      if (!mounted) return;
      AppToast.error('Không thể cập nhật mật khẩu.');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      appBar: AppBar(
        backgroundColor: AppColors.surfacePrimary,
        surfaceTintColor: AppColors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 20,
            color: AppColors.primary,
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Bảo mật',
          style: AppTypography.mainWith(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textMain,
          ),
        ),
        centerTitle: true,
      ),
      body: _isLoadingPolicy
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: [
                Text(
                  'Bảo mật tài khoản',
                  style: AppTypography.mainWith(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppColors.navy,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Cập nhật mật khẩu để bảo vệ tài khoản của bạn.',
                  style: AppTypography.mainWith(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surfacePrimary,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFF0E6E4)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildPasswordField(
                        label: 'Mật khẩu hiện tại',
                        controller: _currentPasswordController,
                        hintText: 'Nhập mật khẩu hiện tại',
                        obscure: !_showCurrentPassword,
                        onToggle: () => setState(
                          () => _showCurrentPassword = !_showCurrentPassword,
                        ),
                      ),
                      const SizedBox(height: 20),
                      const Divider(height: 1, color: Color(0xFFF1F5F9)),
                      const SizedBox(height: 20),
                      _buildPasswordField(
                        label: 'Mật khẩu mới',
                        controller: _newPasswordController,
                        hintText: 'Nhập mật khẩu mới',
                        obscure: !_showNewPassword,
                        onToggle: () => setState(
                          () => _showNewPassword = !_showNewPassword,
                        ),
                        onFocusChange: (focused) =>
                            setState(() => _isNewPasswordFocused = focused),
                      ),
                      if (_isNewPasswordFocused && _passwordPolicy != null) ...[
                        const SizedBox(height: 12),
                        _PasswordStrengthMeter(
                          password: _newPasswordController.text,
                          policy: _passwordPolicy!,
                          isFocused: _isNewPasswordFocused,
                        ),
                      ],
                      const SizedBox(height: 16),
                      _buildPasswordField(
                        label: 'Xác nhận mật khẩu mới',
                        controller: _confirmPasswordController,
                        hintText: 'Nhập lại mật khẩu mới',
                        obscure: !_showConfirmPassword,
                        onToggle: () => setState(
                          () => _showConfirmPassword = !_showConfirmPassword,
                        ),
                        hasError:
                            _confirmPasswordController.text.isNotEmpty &&
                            _confirmPasswordController.text !=
                                _newPasswordController.text,
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _canSubmit ? _handleSubmit : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            disabledBackgroundColor: AppColors.primary
                                .withValues(alpha: 0.45),
                            foregroundColor: AppColors.surfacePrimary,
                            disabledForegroundColor: Colors.white70,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text(
                            _isSubmitting
                                ? 'Đang cập nhật...'
                                : 'Cập nhật mật khẩu',
                            style: AppTypography.mainWith(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildPasswordField({
    required String label,
    required TextEditingController controller,
    required String hintText,
    required bool obscure,
    required VoidCallback onToggle,
    ValueChanged<bool>? onFocusChange,
    bool hasError = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.mainWith(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.navy,
          ),
        ),
        const SizedBox(height: 8),
        Focus(
          onFocusChange: onFocusChange,
          child: TextField(
            controller: controller,
            obscureText: obscure,
            style: AppTypography.mainWith(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.ink,
            ),
            decoration: InputDecoration(
              hintText: hintText,
              hintStyle: AppTypography.mainWith(
                fontSize: 14,
                color: AppColors.contentSubtle,
                fontWeight: FontWeight.w500,
              ),
              prefixIcon: const Icon(
                Icons.lock_outline_rounded,
                size: 20,
                color: AppColors.contentSubtle,
              ),
              suffixIcon: IconButton(
                onPressed: onToggle,
                icon: Icon(
                  obscure
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  size: 20,
                  color: AppColors.contentSubtle,
                ),
              ),
              filled: true,
              fillColor: AppColors.surfaceSoft,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 14,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: hasError
                      ? const Color(0xFFF87171)
                      : AppColors.borderSubtle,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: hasError ? const Color(0xFFF87171) : AppColors.primary,
                  width: 1.4,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _PasswordStrengthMeter extends StatelessWidget {
  const _PasswordStrengthMeter({
    required this.password,
    required this.policy,
    required this.isFocused,
  });

  final String password;
  final PasswordPolicy policy;
  final bool isFocused;

  @override
  Widget build(BuildContext context) {
    if (!isFocused) return const SizedBox.shrink();

    final items = policy.requirements.map((req) {
      final isMet = switch (req.id) {
        'min_length' => password.length >= policy.minLength,
        'max_length' =>
          password.isNotEmpty && password.length <= policy.maxLength,
        _ =>
          req.regex != null &&
              req.regex!.isNotEmpty &&
              RegExp(req.regex!).hasMatch(password),
      };
      return (id: req.id, description: req.description, isMet: isMet);
    }).toList();

    final metCount = items.where((item) => item.isMet).length;
    final totalCount = items.length;
    final isAllMet =
        totalCount > 0 && metCount == totalCount && password.isNotEmpty;
    final strengthPercent = totalCount > 0
        ? (metCount / totalCount) * 100
        : 0.0;

    Color strengthColor = const Color(0xFFCBD5E1);
    var strengthLabel = '';
    if (password.isNotEmpty) {
      if (strengthPercent < 60) {
        strengthColor = const Color(0xFFEF4444);
        strengthLabel = 'Yếu';
      } else if (strengthPercent < 90) {
        strengthColor = AppColors.statusWarningAccent;
        strengthLabel = 'Trung bình';
      } else if (strengthPercent < 100) {
        strengthColor = const Color(0xFFFBBF24);
        strengthLabel = 'Khá';
      } else {
        strengthColor = const Color(0xFF22C55E);
        strengthLabel = 'Mạnh';
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (password.isNotEmpty) ...[
          Row(
            children: [
              Expanded(
                child: Row(
                  children: List.generate(4, (index) {
                    final seg = index + 1;
                    final isActive = strengthPercent >= (seg * 25 - 5);
                    return Expanded(
                      child: Container(
                        height: 6,
                        margin: EdgeInsets.only(right: seg < 4 ? 4 : 0),
                        decoration: BoxDecoration(
                          color: isActive
                              ? strengthColor
                              : const Color(0x0F0F172A),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                strengthLabel,
                style: AppTypography.mainWith(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: strengthColor,
                  letterSpacing: 0.4,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
        ],
        if (!isAllMet)
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: items
                .map(
                  (item) => SizedBox(
                    width: (MediaQuery.sizeOf(context).width - 76) / 2,
                    child: Row(
                      children: [
                        Icon(
                          item.isMet
                              ? Icons.check_circle_rounded
                              : Icons.circle,
                          size: item.isMet ? 14 : 8,
                          color: item.isMet
                              ? const Color(0xFF22C55E)
                              : AppColors.contentMuted,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            item.description,
                            style: AppTypography.mainWith(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: item.isMet
                                  ? AppColors.navy
                                  : const Color(0xFF475569),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
                .toList(),
          ),
      ],
    );
  }
}
