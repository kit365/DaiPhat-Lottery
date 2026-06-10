import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/router/app_routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../viewmodels/register_viewmodel.dart';
import '../../../data/dto/auth/register_request.dart';

class RegisterView extends StatefulWidget {
  final RegisterViewModel viewModel;

  const RegisterView({super.key, required this.viewModel});

  @override
  State<RegisterView> createState() => _RegisterViewState();
}

class _RegisterViewState extends State<RegisterView> {
  final _formKeyStep1 = GlobalKey<FormState>();
  final _formKeyStep2 = GlobalKey<FormState>();
  
  int _currentStep = 1;

  final _usernameController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _agreedToTerms = false;

  @override
  void dispose() {
    _usernameController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _handleRegister() async {
    if (!_formKeyStep2.currentState!.validate()) return;
    if (!_agreedToTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng đồng ý với điều khoản sử dụng.')),
      );
      return;
    }

    final request = RegisterRequest(
      username: _usernameController.text.trim(),
      email: _emailController.text.trim(),
      password: _passwordController.text,
      firstName: _firstNameController.text.trim(),
      lastName: _lastNameController.text.trim(),
      phone: _phoneController.text.trim(),
      agreedToTerms: _agreedToTerms,
    );

    final success = await widget.viewModel.register(request);
    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.'), backgroundColor: AppColors.success),
      );
      context.go(AppRoute.login.path);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(widget.viewModel.error ?? 'Đăng ký thất bại!'), backgroundColor: AppColors.error),
      );
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
                              SizedBox(height: constraints.maxHeight * 0.15), // Less space than login to fit more fields
                              Container(
                                margin: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                                padding: const EdgeInsets.all(24),
                                decoration: BoxDecoration(
                                  color: Colors.white,
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
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    _buildStepper(),
                                    const SizedBox(height: 16),
                                    if (_currentStep == 1) _buildStep1() else _buildStep2(),
                                    const SizedBox(height: 24),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text('Đã có tài khoản? ', style: GoogleFonts.publicSans(fontSize: 14, color: const Color(0xFF666666), fontWeight: FontWeight.w500)),
                                        GestureDetector(
                                          onTap: () => context.go(AppRoute.login.path),
                                          child: Text('Đăng nhập', style: GoogleFonts.publicSans(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.loginPrimary)),
                                        ),
                                      ],
                                    ),
                                  ],
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
                if (_currentStep == 2) {
                  setState(() => _currentStep = 1);
                } else {
                  context.go(AppRoute.home.path);
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

  Widget _buildStepper() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _buildStepIndicator(1, _currentStep >= 1),
        Container(width: 40, height: 1, color: _currentStep >= 2 ? AppColors.loginPrimary : Colors.grey[300]),
        _buildStepIndicator(2, _currentStep >= 2),
      ],
    );
  }

  Widget _buildStepIndicator(int step, bool active) {
    return Container(
      width: 24, height: 24,
      decoration: BoxDecoration(
        color: active ? AppColors.loginPrimary : Colors.grey[300],
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: _currentStep > step 
        ? const Icon(Icons.check, size: 14, color: Colors.white)
        : Text('$step', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildStep1() {
    return Form(
      key: _formKeyStep1,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Bước 1/2', textAlign: TextAlign.center, style: GoogleFonts.publicSans(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.loginPlaceholder)),
          const SizedBox(height: 8),
          Text('Tạo tài khoản', textAlign: TextAlign.center, style: GoogleFonts.publicSans(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.loginPrimary)),
          const SizedBox(height: 4),
          Text('Nhập thông tin cơ bản để bắt đầu', textAlign: TextAlign.center, style: GoogleFonts.publicSans(fontSize: 14, color: AppColors.loginLabel)),
          const SizedBox(height: 24),
          _buildLabel('Tên đăng nhập *'),
          const SizedBox(height: 8),
          _buildInput(
            controller: _usernameController,
            hintText: 'Tối thiểu 4 ký tự',
            prefixIcon: Icons.person_outline,
            validator: (v) {
              if (v == null || v.isEmpty) return 'Bắt buộc';
              if (v.length < 4) return 'Tối thiểu 4 ký tự';
              return null;
            },
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildLabel('Họ *'),
                    const SizedBox(height: 8),
                    _buildInput(controller: _lastNameController, hintText: 'Nguyễn', prefixIcon: Icons.badge_outlined, validator: (v) => v!.isEmpty ? 'Bắt buộc' : null),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildLabel('Tên *'),
                    const SizedBox(height: 8),
                    _buildInput(controller: _firstNameController, hintText: 'Văn A', prefixIcon: Icons.badge_outlined, validator: (v) => v!.isEmpty ? 'Bắt buộc' : null),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildLabel('Email *'),
          const SizedBox(height: 8),
          _buildInput(controller: _emailController, hintText: 'email@example.com', prefixIcon: Icons.email_outlined, keyboardType: TextInputType.emailAddress, validator: (v) {
            if (v == null || v.isEmpty) return 'Bắt buộc';
            if (!v.contains('@')) return 'Email không hợp lệ';
            return null;
          }),
          const SizedBox(height: 16),
          _buildLabel('Số điện thoại'),
          const SizedBox(height: 8),
          _buildInput(controller: _phoneController, hintText: '09xxxxxxxxx', prefixIcon: Icons.phone_outlined, keyboardType: TextInputType.phone),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () {
              if (_formKeyStep1.currentState!.validate()) {
                setState(() => _currentStep = 2);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.loginPrimary,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: Text('Tiếp tục', style: GoogleFonts.publicSans(fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
          ),
        ],
      ),
    );
  }

  Widget _buildStep2() {
    return Form(
      key: _formKeyStep2,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Bước 2/2', textAlign: TextAlign.center, style: GoogleFonts.publicSans(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.loginPlaceholder)),
          const SizedBox(height: 8),
          Text('Bảo mật tài khoản', textAlign: TextAlign.center, style: GoogleFonts.publicSans(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.loginPrimary)),
          const SizedBox(height: 4),
          Text('Tạo mật khẩu để bảo vệ tài khoản', textAlign: TextAlign.center, style: GoogleFonts.publicSans(fontSize: 14, color: AppColors.loginLabel)),
          const SizedBox(height: 24),
          _buildLabel('Mật khẩu *'),
          const SizedBox(height: 8),
          _buildInput(
            controller: _passwordController,
            hintText: 'Tối thiểu 6 ký tự, có chữ hoa',
            prefixIcon: Icons.lock_outline,
            obscureText: _obscurePassword,
            suffixIcon: IconButton(
              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              icon: Icon(_obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, color: AppColors.loginPlaceholder),
            ),
            validator: (v) {
              if (v == null || v.isEmpty) return 'Bắt buộc';
              if (v.length < 6) return 'Tối thiểu 6 ký tự';
              if (v.length > 100) return 'Tối đa 100 ký tự';
              if (v.contains(' ')) return 'Không được chứa khoảng trắng';
              if (!RegExp(r'^[A-Z]').hasMatch(v)) return 'Phải bắt đầu bằng chữ hoa';
              return null;
            },
          ),
          Padding(
            padding: const EdgeInsets.only(top: 8, left: 4),
            child: Text('Tối thiểu 6 ký tự, bắt đầu bằng chữ hoa, không khoảng trắng', style: GoogleFonts.publicSans(fontSize: 12, color: AppColors.loginPlaceholder)),
          ),
          const SizedBox(height: 16),
          _buildLabel('Nhập lại mật khẩu *'),
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
              if (v != _passwordController.text) return 'Mật khẩu không khớp';
              return null;
            },
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Checkbox(
                value: _agreedToTerms,
                onChanged: (v) => setState(() => _agreedToTerms = v ?? false),
                activeColor: AppColors.loginPrimary,
              ),
              Expanded(
                child: Text('Tôi đồng ý với Điều khoản sử dụng', style: GoogleFonts.publicSans(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.loginPrimary)),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _currentStep = 1),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    side: const BorderSide(color: AppColors.loginPrimary),
                  ),
                  child: Text('Quay lại', style: GoogleFonts.publicSans(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.loginPrimary)),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: widget.viewModel.isLoading ? null : _handleRegister,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.loginPrimary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: widget.viewModel.isLoading
                      ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                      : Text('Đăng ký', style: GoogleFonts.publicSans(fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(text, style: GoogleFonts.publicSans(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.loginLabel));
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
