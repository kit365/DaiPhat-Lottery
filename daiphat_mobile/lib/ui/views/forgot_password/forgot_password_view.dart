import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../viewmodels/forgot_password_viewmodel.dart';

class ForgotPasswordView extends StatefulWidget {
  final ForgotPasswordViewModel viewModel;

  const ForgotPasswordView({super.key, required this.viewModel});

  @override
  State<ForgotPasswordView> createState() => _ForgotPasswordViewState();
}

class _ForgotPasswordViewState extends State<ForgotPasswordView> {
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  final _formKeyEmail = GlobalKey<FormState>();
  final _formKeyOtp = GlobalKey<FormState>();
  final _formKeyReset = GlobalKey<FormState>();

  bool _obscureNew = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _handleRequestOtp() async {
    if (!_formKeyEmail.currentState!.validate()) return;
    await widget.viewModel.requestOtp(_emailController.text.trim());
    if (widget.viewModel.error != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(widget.viewModel.error!), backgroundColor: AppColors.error));
    }
  }

  void _handleVerifyOtp() async {
    if (!_formKeyOtp.currentState!.validate()) return;
    await widget.viewModel.verifyOtp(_otpController.text.trim());
    if (widget.viewModel.error != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(widget.viewModel.error!), backgroundColor: AppColors.error));
    }
  }

  void _handleResetPassword() async {
    if (!_formKeyReset.currentState!.validate()) return;
    final success = await widget.viewModel.resetPassword(_newPasswordController.text, _confirmPasswordController.text);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đổi mật khẩu thành công!'), backgroundColor: AppColors.success));
      context.go(AppRoute.login.path);
    } else if (mounted && widget.viewModel.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(widget.viewModel.error!), backgroundColor: AppColors.error));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFC61111),
      body: Stack(
        children: [
          Positioned(
            top: 0, left: 0, right: 0,
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
                        constraints: BoxConstraints(minHeight: constraints.maxHeight),
                        child: IntrinsicHeight(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              SizedBox(height: constraints.maxHeight * 0.28),
                              Container(
                                margin: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                                padding: const EdgeInsets.all(24),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(24),
                                  boxShadow: const [BoxShadow(color: Color.fromRGBO(0, 0, 0, 0.15), blurRadius: 30, offset: Offset(0, 12))],
                                ),
                                child: AnimatedSwitcher(
                                  duration: const Duration(milliseconds: 300),
                                  child: _buildCurrentStep(),
                                ),
                              ),
                              const SizedBox(height: 20),
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
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 16,
            child: GestureDetector(
              onTap: () {
                if (widget.viewModel.currentStep == ForgotPasswordStep.email) {
                  context.go(AppRoute.login.path);
                } else {
                  widget.viewModel.reset();
                }
              },
              child: Container(
                width: 40, height: 40,
                decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8, offset: const Offset(0, 2))]),
                child: const Icon(Icons.arrow_back_rounded, color: AppColors.loginPrimary, size: 22),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentStep() {
    switch (widget.viewModel.currentStep) {
      case ForgotPasswordStep.email:
        return _buildEmailStep();
      case ForgotPasswordStep.otp:
        return _buildOtpStep();
      case ForgotPasswordStep.reset:
        return _buildResetStep();
    }
  }

  Widget _buildEmailStep() {
    return Form(
      key: _formKeyEmail,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildHeader('Quên mật khẩu'),
          const SizedBox(height: 12),
          Text('Vui lòng nhập email đã đăng ký để nhận mã OTP.', textAlign: TextAlign.center, style: GoogleFonts.publicSans(fontSize: 14, color: AppColors.textMuted)),
          const SizedBox(height: 24),
          _buildLabel('Email *'),
          const SizedBox(height: 8),
          _buildInput(controller: _emailController, hintText: 'Nhập email của bạn', prefixIcon: Icons.email_outlined, keyboardType: TextInputType.emailAddress, validator: (v) {
            if (v == null || v.isEmpty) return 'Bắt buộc';
            if (!v.contains('@')) return 'Email không hợp lệ';
            return null;
          }),
          const SizedBox(height: 24),
          _buildSubmitButton('NHẬN MÃ OTP', _handleRequestOtp),
        ],
      ),
    );
  }

  Widget _buildOtpStep() {
    return Form(
      key: _formKeyOtp,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildHeader('Xác thực OTP'),
          const SizedBox(height: 12),
          Text('Nhập mã OTP gồm 6 chữ số được gửi đến email ${widget.viewModel.email}', textAlign: TextAlign.center, style: GoogleFonts.publicSans(fontSize: 14, color: AppColors.textMuted)),
          const SizedBox(height: 24),
          _buildLabel('Mã OTP *'),
          const SizedBox(height: 8),
          _buildInput(controller: _otpController, hintText: 'Nhập mã OTP', prefixIcon: Icons.pin_outlined, keyboardType: TextInputType.number, validator: (v) {
            if (v == null || v.isEmpty) return 'Bắt buộc';
            return null;
          }),
          const SizedBox(height: 24),
          _buildSubmitButton('XÁC THỰC', _handleVerifyOtp),
        ],
      ),
    );
  }

  Widget _buildResetStep() {
    return Form(
      key: _formKeyReset,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildHeader('Tạo mật khẩu mới'),
          const SizedBox(height: 24),
          _buildLabel('Mật khẩu mới *'),
          const SizedBox(height: 8),
          _buildInput(
            controller: _newPasswordController,
            hintText: 'Tối thiểu 6 ký tự',
            prefixIcon: Icons.lock_outline,
            obscureText: _obscureNew,
            suffixIcon: IconButton(
              onPressed: () => setState(() => _obscureNew = !_obscureNew),
              icon: Icon(_obscureNew ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: AppColors.loginPlaceholder),
            ),
            validator: (v) {
              if (v == null || v.isEmpty) return 'Bắt buộc';
              if (v.length < 6) return 'Tối thiểu 6 ký tự';
              return null;
            },
          ),
          const SizedBox(height: 16),
          _buildLabel('Nhập lại mật khẩu mới *'),
          const SizedBox(height: 8),
          _buildInput(
            controller: _confirmPasswordController,
            hintText: 'Nhập lại mật khẩu',
            prefixIcon: Icons.lock_outline,
            obscureText: _obscureConfirm,
            suffixIcon: IconButton(
              onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
              icon: Icon(_obscureConfirm ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: AppColors.loginPlaceholder),
            ),
            validator: (v) {
              if (v != _newPasswordController.text) return 'Mật khẩu không khớp';
              return null;
            },
          ),
          const SizedBox(height: 24),
          _buildSubmitButton('ĐỔI MẬT KHẨU', _handleResetPassword),
        ],
      ),
    );
  }

  Widget _buildHeader(String title) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text('~', style: TextStyle(color: AppColors.loginGold, fontSize: 24, fontWeight: FontWeight.bold)),
        const SizedBox(width: 8),
        Text(title, style: GoogleFonts.publicSans(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.loginTitle)),
        const SizedBox(width: 8),
        const Text('~', style: TextStyle(color: AppColors.loginGold, fontSize: 24, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildLabel(String text) {
    return Text(text, style: GoogleFonts.publicSans(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.loginLabel));
  }

  Widget _buildSubmitButton(String text, VoidCallback onPressed) {
    return ElevatedButton(
      onPressed: widget.viewModel.isLoading ? null : onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.loginPrimary,
        foregroundColor: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        padding: const EdgeInsets.symmetric(vertical: 16),
      ),
      child: widget.viewModel.isLoading
          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
          : Text(text, style: GoogleFonts.publicSans(fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
    );
  }

  Widget _buildInput({
    required TextEditingController controller,
    required String hintText,
    required IconData prefixIcon,
    bool obscureText = false,
    Widget? suffixIcon,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      validator: validator,
      style: GoogleFonts.publicSans(fontSize: 15, fontWeight: FontWeight.w500, color: AppColors.loginTitle),
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: GoogleFonts.publicSans(fontSize: 15, color: AppColors.loginPlaceholder),
        prefixIcon: Icon(prefixIcon, color: AppColors.loginPlaceholder, size: 20),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.loginBorder)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.loginPrimary, width: 1.4)),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.error)),
        focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.error, width: 1.4)),
      ),
    );
  }
}
