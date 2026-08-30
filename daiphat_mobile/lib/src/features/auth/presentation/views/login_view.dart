import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import 'package:daiphat_mobile/src/app/routing/app_routes.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';
import 'package:daiphat_mobile/src/features/auth/presentation/viewmodels/login_viewmodel.dart';

class LoginView extends StatefulWidget {
  final LoginViewModel viewModel;

  const LoginView({super.key, required this.viewModel});

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  static const _googleIconSvg = '''
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
  <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
</svg>
''';

  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      AppToast.info('Vui lòng nhập tài khoản và mật khẩu');
      return;
    }

    final success = await widget.viewModel.login(username, password);
    if (!mounted || !success) {
      return;
    }

    AppToast.success('Đăng nhập thành công');
    context.go(AppRoute.home.path);
  }

  Future<void> _handleGoogleLogin() async {
    final success = await widget.viewModel.loginWithGoogle();
    if (!mounted || !success) {
      return;
    }

    AppToast.success('Đăng nhập Google thành công');
    context.go(AppRoute.home.path);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor:
          AppColors.brandPrimaryCrimson, // Màu nền đỏ phía dưới nếu cuộn
      body: Stack(
        children: [
          // Background Image nằm cố định phía trên
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Image.asset(
              'assets/images/background_login.png',
              fit: BoxFit.fitWidth,
              alignment: Alignment.topCenter,
            ),
          ),

          SafeArea(
            bottom: false,
            child: ListenableBuilder(
              listenable: widget.viewModel,
              builder: (context, _) {
                return LayoutBuilder(
                  builder: (context, constraints) {
                    return SingleChildScrollView(
                      physics: const ClampingScrollPhysics(),
                      child: ConstrainedBox(
                        constraints: BoxConstraints(
                          minHeight: constraints.maxHeight,
                        ),
                        child: IntrinsicHeight(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // Khoảng trống phía trên để hở hình Ông Thần Tài
                              SizedBox(height: constraints.maxHeight * 0.28),

                              // Box trắng Form Đăng Nhập
                              Container(
                                margin: const EdgeInsets.fromLTRB(
                                  16,
                                  0,
                                  16,
                                  24,
                                ),
                                padding: const EdgeInsets.all(24),
                                decoration: BoxDecoration(
                                  color: AppColors.surfacePrimary,
                                  borderRadius: BorderRadius.circular(24),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Color.fromRGBO(0, 0, 0, 0.15),
                                      blurRadius: 30,
                                      offset: Offset(0, 12),
                                    ),
                                  ],
                                ),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    // Title: ~ Đăng nhập ~
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          '~',
                                          style: AppTypography.h2(
                                            color: AppColors.loginGold,
                                            fontSize: 24,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          'Đăng nhập',
                                          style: AppTypography.h2(
                                            color: AppColors.loginTitle,
                                            fontSize: 24,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          '~',
                                          style: AppTypography.h2(
                                            color: AppColors.loginGold,
                                            fontSize: 24,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Chào mừng bạn quay trở lại!',
                                      style: AppTypography.bodyMedium(
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.contentNeutral,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                    const SizedBox(height: 24),

                                    // Báo lỗi nếu có
                                    if (widget.viewModel.error != null) ...[
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 14,
                                          vertical: 12,
                                        ),
                                        decoration: BoxDecoration(
                                          color:
                                              AppColors.surfaceDestructiveSoft,
                                          border: Border.all(
                                            color: AppColors.brandPrimaryBorder,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            14,
                                          ),
                                        ),
                                        child: Text(
                                          widget.viewModel.error!,
                                          style: AppTypography.subtitle2(
                                            fontWeight: FontWeight.w600,
                                            color:
                                                AppColors.brandPrimaryDarkRed,
                                          ),
                                          textAlign: TextAlign.center,
                                        ),
                                      ),
                                      const SizedBox(height: 16),
                                    ],

                                    // Email
                                    _buildInput(
                                      controller: _usernameController,
                                      labelText: 'Email hoặc số điện thoại',
                                      hintText: 'Nhập email hoặc số điện thoại',
                                      prefixIcon: Icons.person_outline_rounded,
                                      keyboardType: TextInputType.emailAddress,
                                      autofillHints: const [
                                        AutofillHints.username,
                                      ],
                                    ),
                                    const SizedBox(height: 16),

                                    // Mật khẩu
                                    _buildInput(
                                      controller: _passwordController,
                                      labelText: 'Mật khẩu',
                                      hintText: 'Nhập mật khẩu',
                                      prefixIcon: Icons.lock_outline_rounded,
                                      obscureText: _obscurePassword,
                                      autofillHints: const [
                                        AutofillHints.password,
                                      ],
                                      suffixIcon: IconButton(
                                        tooltip: _obscurePassword
                                            ? 'Hiện mật khẩu'
                                            : 'Ẩn mật khẩu',
                                        onPressed: () {
                                          setState(() {
                                            _obscurePassword =
                                                !_obscurePassword;
                                          });
                                        },
                                        icon: Icon(
                                          _obscurePassword
                                              ? Icons.visibility_off_outlined
                                              : Icons.visibility_outlined,
                                          color: AppColors.loginPlaceholder,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 8),

                                    // Quên mật khẩu
                                    Align(
                                      alignment: Alignment.centerRight,
                                      child: TextButton(
                                        onPressed: () => context.go(
                                          AppRoute.forgotPassword.path,
                                        ),
                                        style: TextButton.styleFrom(
                                          foregroundColor:
                                              AppColors.loginPrimary,
                                          padding: EdgeInsets.zero,
                                          minimumSize: const Size(0, 32),
                                          tapTargetSize:
                                              MaterialTapTargetSize.shrinkWrap,
                                        ),
                                        child: Text(
                                          'Quên mật khẩu?',
                                          style: AppTypography.buttonSmall(
                                            color: AppColors.loginPrimary,
                                            fontWeight: FontWeight.w700,
                                            fontSize: 13,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 12),

                                    // Nút Đăng nhập
                                    SizedBox(
                                      height: 52,
                                      child: ElevatedButton(
                                        onPressed: widget.viewModel.isLoading
                                            ? null
                                            : _handleLogin,
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor:
                                              AppColors.loginPrimary,
                                          disabledBackgroundColor: AppColors
                                              .loginPrimary
                                              .withValues(alpha: 0.65),
                                          foregroundColor:
                                              AppColors.surfacePrimary,
                                          elevation: 0,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(
                                              12,
                                            ),
                                          ),
                                        ),
                                        child: widget.viewModel.isLoading
                                            ? const SizedBox(
                                                height: 22,
                                                width: 22,
                                                child: CircularProgressIndicator(
                                                  strokeWidth: 2,
                                                  valueColor:
                                                      AlwaysStoppedAnimation(
                                                        AppColors
                                                            .surfacePrimary,
                                                      ),
                                                ),
                                              )
                                            : Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment.center,
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  const Icon(
                                                    Icons.lock_outline,
                                                    size: 20,
                                                  ),
                                                  const SizedBox(width: 8),
                                                  Text(
                                                    'Đăng nhập',
                                                    style:
                                                        AppTypography.buttonLarge(),
                                                  ),
                                                ],
                                              ),
                                      ),
                                    ),
                                    const SizedBox(height: 18),

                                    // Hoặc
                                    Row(
                                      children: [
                                        const Expanded(
                                          child: Divider(
                                            color: AppColors.loginBorder,
                                          ),
                                        ),
                                        Padding(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 16,
                                          ),
                                          child: Text(
                                            'hoặc',
                                            style: AppTypography.caption(
                                              fontSize: 13,
                                              color: AppColors.loginPlaceholder,
                                            ),
                                          ),
                                        ),
                                        const Expanded(
                                          child: Divider(
                                            color: AppColors.loginBorder,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 18),

                                    // Nút Google
                                    _buildSocialButton(
                                      icon: SvgPicture.string(
                                        _googleIconSvg,
                                        width: 20,
                                        height: 20,
                                      ),
                                      text: 'Đăng nhập với Google',
                                      onPressed: widget.viewModel.isLoading
                                          ? null
                                          : _handleGoogleLogin,
                                    ),
                                    const SizedBox(height: 24),

                                    // Box Đăng ký (Đơn giản)
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          'Chưa có tài khoản? ',
                                          style: AppTypography.bodyMedium(
                                            color: AppColors.contentNeutral,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                        GestureDetector(
                                          onTap: () => context.go(
                                            AppRoute.register.path,
                                          ),
                                          child: Text(
                                            'Đăng ký ngay',
                                            style: AppTypography.bodyMedium(
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.loginPrimary,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),

                              const SizedBox(height: 20), // Padding đáy an toàn
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),

          // Nút Back (phải để dưới cùng của Stack để nổi lên trên cùng và nhận tap)
          Positioned(
            top: MediaQuery.of(context).padding.top + 6,
            left: 14,
            child: Semantics(
              button: true,
              label: 'Quay lại trang trước',
              onTap: () => context.go(AppRoute.home.path),
              child: ExcludeSemantics(
                child: SizedBox(
                  width: 44,
                  height: 44,
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => context.go(AppRoute.home.path),
                    child: Center(
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: const BoxDecoration(
                          color: AppColors.surfacePrimary,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.shadowLight,
                              blurRadius: 8,
                              offset: Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.arrow_back_rounded,
                          color: AppColors.loginPrimary,
                          size: 22,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInput({
    required TextEditingController controller,
    required String labelText,
    required String hintText,
    required IconData prefixIcon,
    bool obscureText = false,
    Widget? suffixIcon,
    TextInputType? keyboardType,
    Iterable<String>? autofillHints,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      autofillHints: autofillHints,
      style: AppTypography.bodyLarge(
        fontSize: 15,
        fontWeight: FontWeight.w500,
        color: AppColors.loginTitle,
      ),
      decoration: InputDecoration(
        labelText: labelText,
        floatingLabelBehavior: FloatingLabelBehavior.always,
        labelStyle: AppTypography.labelLarge(
          fontWeight: FontWeight.w700,
          color: AppColors.loginLabel,
        ),
        hintText: hintText,
        hintStyle: AppTypography.bodyMedium(
          fontSize: 15,
          color: AppColors.loginPlaceholder,
        ),
        prefixIcon: Icon(
          prefixIcon,
          color: AppColors.loginPlaceholder,
          size: 20,
        ),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: AppColors.surfacePrimary,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 16,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.loginBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(
            color: AppColors.loginPrimary,
            width: 1.4,
          ),
        ),
      ),
    );
  }

  Widget _buildSocialButton({
    required Widget icon,
    required String text,
    required VoidCallback? onPressed,
  }) {
    return SizedBox(
      height: 52,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          backgroundColor: AppColors.surfacePrimary,
          side: const BorderSide(color: AppColors.loginBorder),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              icon,
              const SizedBox(width: 12),
              Text(
                text,
                style: AppTypography.buttonMedium(
                  fontSize: 15,
                  color: AppColors.loginLabel,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
