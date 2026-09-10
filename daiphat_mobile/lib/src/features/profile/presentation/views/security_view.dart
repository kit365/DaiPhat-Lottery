import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';

import 'package:daiphat_mobile/src/features/auth/data/models/password_policy.dart';
import 'package:daiphat_mobile/src/features/auth/data/dto/change_password_request.dart';
import 'package:daiphat_mobile/src/features/auth/data/services/auth_api_service.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/viewmodels/profile_viewmodel.dart';
import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';

class SecurityView extends ConsumerStatefulWidget {
  const SecurityView({super.key, required this.profileViewModel});

  final ProfileViewModel profileViewModel;

  @override
  ConsumerState<SecurityView> createState() => _SecurityViewState();
}

class _SecurityViewState extends ConsumerState<SecurityView> {
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

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
    if (!_formKey.currentState!.validate()) return;
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
      await AuthApiService(ref.read(apiClientProvider)).changePassword(
        ChangePasswordRequest(
          currentPassword: current,
          newPassword: next,
          confirmPassword: confirm,
        ),
      );
      if (!mounted) return;
      AppToast.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
      _currentPasswordController.clear();
      _newPasswordController.clear();
      _confirmPasswordController.clear();
      await widget.profileViewModel.logout();
      if (mounted) context.go(AppRoute.login.path);
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
          style: AppTypography.h4(
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
                  style: AppTypography.h3(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppColors.navy,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Cập nhật mật khẩu để bảo vệ tài khoản của bạn.',
                  style: AppTypography.bodyMedium(
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
                    border: Border.all(color: AppColors.borderDecorative),
                  ),
                  child: Form(
                    key: _formKey,
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
                          autofillHints: const [AutofillHints.password],
                          validator: (value) => value == null || value.isEmpty
                              ? 'Vui lòng nhập mật khẩu hiện tại.'
                              : null,
                        ),
                        const SizedBox(height: 20),
                        const Divider(height: 1, color: AppColors.borderLight),
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
                          autofillHints: const [AutofillHints.newPassword],
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Vui lòng nhập mật khẩu mới.';
                            }
                            if (!_isPasswordValid) {
                              return 'Mật khẩu mới chưa đáp ứng yêu cầu.';
                            }
                            return null;
                          },
                        ),
                        if (_isNewPasswordFocused &&
                            _passwordPolicy != null) ...[
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
                          autofillHints: const [AutofillHints.newPassword],
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Vui lòng xác nhận mật khẩu mới.';
                            }
                            if (value != _newPasswordController.text) {
                              return 'Mật khẩu nhập lại không khớp.';
                            }
                            return null;
                          },
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
                              disabledForegroundColor: AppColors.white.withValues(
                                alpha: 0.70,
                              ),
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: Text(
                              _isSubmitting
                                  ? 'Đang cập nhật...'
                                  : 'Cập nhật mật khẩu',
                              style: AppTypography.buttonMedium(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
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
    Iterable<String>? autofillHints,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.subtitle2(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.navy,
          ),
        ),
        const SizedBox(height: 8),
        Focus(
          onFocusChange: onFocusChange,
          child: TextFormField(
            controller: controller,
            obscureText: obscure,
            autofillHints: autofillHints,
            validator: validator,
            style: AppTypography.bodyLarge(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.ink,
            ),
            decoration: InputDecoration(
              hintText: hintText,
              hintStyle: AppTypography.bodyMedium(
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
                tooltip: obscure ? 'Hiện mật khẩu' : 'Ẩn mật khẩu',
                onPressed: onToggle,
                icon: Icon(
                  obscure
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                  size: 20,
                  color: AppColors.contentSubtle,
                ),
              ),
              filled: true,
              fillColor: AppColors.surfaceCanvas,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: hasError ? AppColors.primary : AppColors.borderLight,
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: hasError ? AppColors.primary : AppColors.borderLight,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(
                  color: AppColors.primary,
                  width: 1.5,
                ),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.primary),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 14,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _PasswordStrengthMeter extends StatelessWidget {
  final String password;
  final PasswordPolicy policy;
  final bool isFocused;

  const _PasswordStrengthMeter({
    required this.password,
    required this.policy,
    required this.isFocused,
  });

  @override
  Widget build(BuildContext context) {
    if (!isFocused && password.isEmpty) return const SizedBox.shrink();

    final items = policy.checkPassword(password);
    final metCount = items.where((e) => e.isMet).length;
    final totalCount = items.length;
    final isAllMet = metCount == totalCount;

    Color strengthColor;
    String strengthLabel;
    if (metCount == 0) {
      strengthColor = AppColors.contentMuted;
      strengthLabel = 'Chưa nhập';
    } else if (metCount <= 2) {
      strengthColor = AppColors.primary;
      strengthLabel = 'Yếu';
    } else if (metCount < totalCount) {
      strengthColor = AppColors.brandAccentGoldAmber;
      strengthLabel = 'Trung bình';
    } else {
      strengthColor = AppColors.statusSuccess;
      strengthLabel = 'Mạnh';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (password.isNotEmpty) ...[
          Row(
            children: [
              Expanded(
                child: Row(
                  children: List.generate(totalCount, (index) {
                    final isFilled = index < metCount;
                    return Expanded(
                      child: Container(
                        margin: EdgeInsets.only(
                          right: index < totalCount - 1 ? 4 : 0,
                        ),
                        height: 4,
                        decoration: BoxDecoration(
                          color: isFilled
                              ? strengthColor
                              : AppColors.borderLight,
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
                style: AppTypography.caption(
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
                              ? AppColors.statusSuccess
                              : AppColors.contentMuted,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            item.description,
                            style: AppTypography.caption(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: item.isMet
                                  ? AppColors.navy
                                  : AppColors.contentSlate600,
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
