import 'dart:io';
import 'package:flutter/material.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../viewmodels/profile_viewmodel.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/utils/app_toast.dart';
import 'package:daiphat_mobile/src/features/profile/data/dto/update_profile_request.dart';

class ProfileEditView extends StatefulWidget {
  final ProfileViewModel viewModel;

  const ProfileEditView({super.key, required this.viewModel});

  @override
  State<ProfileEditView> createState() => _ProfileEditViewState();
}

class _ProfileEditViewState extends State<ProfileEditView> {
  final _formKey = GlobalKey<FormState>();

  XFile? _selectedAvatarFile;

  late TextEditingController _usernameController;
  late TextEditingController _hoController;
  late TextEditingController _tenController;
  late TextEditingController _phoneController;
  late TextEditingController _emailController;
  late TextEditingController _dobController;
  late TextEditingController _genderController;

  @override
  void initState() {
    super.initState();
    final user = widget.viewModel.user;

    final names = (user?.fullName ?? '').trim().split(' ');
    final ho = names.isNotEmpty ? names.first : '';
    final ten = names.length > 1 ? names.sublist(1).join(' ') : '';

    _usernameController = TextEditingController(text: user?.username ?? '');
    _hoController = TextEditingController(text: ho);
    _tenController = TextEditingController(text: ten);
    _phoneController = TextEditingController(text: user?.phone ?? '');
    _emailController = TextEditingController(text: user?.email ?? '');
    _dobController = TextEditingController(text: user?.dob ?? '');
    _genderController = TextEditingController(text: user?.gender ?? 'Nam');
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _hoController.dispose();
    _tenController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _dobController.dispose();
    _genderController.dispose();
    super.dispose();
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    if (!mounted) return;
    if (pickedFile != null) {
      setState(() {
        _selectedAvatarFile = pickedFile;
      });
    }
  }

  void _onSave() async {
    final formState = _formKey.currentState;
    if (formState == null || !formState.validate()) return;

    final selectedAvatar = _selectedAvatarFile;
    if (selectedAvatar != null) {
      final avatarSuccess = await widget.viewModel.uploadAvatar(
        selectedAvatar.path,
      );
      if (!mounted) return;
      if (!avatarSuccess) {
        AppToast.error(widget.viewModel.errorMessage ?? 'Tải ảnh thất bại');
        return;
      }
    }

    final request = UpdateProfileRequest(
      firstName: _tenController.text.trim(),
      lastName: _hoController.text.trim(),
      phone: _phoneController.text,
      email: _emailController.text,
      dob: _dobController.text,
      gender: _genderController.text,
    );

    final success = await widget.viewModel.updateProfile(request);

    if (!mounted) return;
    if (success) {
      AppToast.success('Cập nhật thành công');
      context.pop();
    } else {
      AppToast.error(widget.viewModel.errorMessage ?? 'Cập nhật thất bại');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surfaceCanvas,
      body: Stack(
        children: [
          // Top Background Image
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 300,
            child: Image.asset('assets/images/home_bg.png', fit: BoxFit.cover),
          ),

          SafeArea(
            child: Column(
              children: [
                // Custom AppBar
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.surfacePrimary,
                        ),
                        child: IconButton(
                          icon: const Icon(
                            Icons.arrow_back_ios_new,
                            size: 22,
                            color: AppColors.primary,
                          ),
                          onPressed: () => context.pop(),
                        ),
                      ),
                      Expanded(
                        child: Center(
                          child: Text(
                            'Chỉnh sửa hồ sơ',
                            style: AppTypography.mainWith(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 44), // Balance for centering
                    ],
                  ),
                ),

                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        children: [
                          // Avatar Section
                          Center(
                            child: ListenableBuilder(
                              listenable: widget.viewModel,
                              builder: (context, _) {
                                final user = widget.viewModel.user;
                                final isUploading = widget
                                    .viewModel
                                    .isLoading; // Use loading state for spinner
                                return Stack(
                                  children: [
                                    Container(
                                      width: 120,
                                      height: 120,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: Colors.grey[200],
                                        border: Border.all(
                                          color: AppColors.surfacePrimary,
                                          width: 4,
                                        ),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withValues(
                                              alpha: 0.1,
                                            ),
                                            blurRadius: 10,
                                            offset: const Offset(0, 5),
                                          ),
                                        ],
                                      ),
                                      clipBehavior: Clip.antiAlias,
                                      child: () {
                                        final selectedAvatar =
                                            _selectedAvatarFile;
                                        final networkAvatar = user?.avatarUrl;
                                        if (selectedAvatar != null) {
                                          return Image.file(
                                            File(selectedAvatar.path),
                                            fit: BoxFit.cover,
                                          );
                                        }
                                        if (networkAvatar != null &&
                                            networkAvatar.isNotEmpty) {
                                          return Image.network(
                                            networkAvatar,
                                            fit: BoxFit.cover,
                                          );
                                        }
                                        return const Icon(
                                          Icons.person,
                                          size: 60,
                                          color: AppColors.textMuted,
                                        );
                                      }(),
                                    ),
                                    Positioned(
                                      right: 0,
                                      bottom: 0,
                                      child: GestureDetector(
                                        onTap: isUploading ? null : _pickAvatar,
                                        child: Container(
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            color: AppColors.primary,
                                            shape: BoxShape.circle,
                                            border: Border.all(
                                              color: AppColors.surfacePrimary,
                                              width: 2,
                                            ),
                                          ),
                                          child: isUploading
                                              ? const SizedBox(
                                                  width: 22,
                                                  height: 22,
                                                  child:
                                                      CircularProgressIndicator(
                                                        color: AppColors.surfacePrimary,
                                                        strokeWidth: 2,
                                                      ),
                                                )
                                              : const Icon(
                                                  Icons.camera_alt,
                                                  color: AppColors.surfacePrimary,
                                                  size: 22,
                                                ),
                                        ),
                                      ),
                                    ),
                                  ],
                                );
                              },
                            ),
                          ),
                          const SizedBox(height: 32),

                          // Form fields wrapper
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.surfacePrimary,
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.05),
                                  blurRadius: 20,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: Column(
                              children: [
                                _buildTextField(
                                  'Tên đăng nhập',
                                  _usernameController,
                                  enabled: false,
                                ),
                                const SizedBox(height: 16),
                                Row(
                                  children: [
                                    Expanded(
                                      child: _buildTextField(
                                        'Họ',
                                        _hoController,
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: _buildTextField(
                                        'Tên',
                                        _tenController,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                _buildTextField(
                                  'Số điện thoại',
                                  _phoneController,
                                ),
                                const SizedBox(height: 16),
                                _buildTextField(
                                  'Email',
                                  _emailController,
                                  keyboardType: TextInputType.emailAddress,
                                ),
                                const SizedBox(height: 16),
                                _buildDatePicker('Ngày sinh', _dobController),
                                const SizedBox(height: 16),
                                _buildGenderDropdown(
                                  'Giới tính',
                                  _genderController,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 32),
                          SizedBox(
                            width: double.infinity,
                            child: ListenableBuilder(
                              listenable: widget.viewModel,
                              builder: (context, _) {
                                return ElevatedButton(
                                  onPressed: widget.viewModel.isLoading
                                      ? null
                                      : _onSave,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 16,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                  child: widget.viewModel.isLoading
                                      ? const SizedBox(
                                          width: 24,
                                          height: 24,
                                          child: CircularProgressIndicator(
                                            color: AppColors.surfacePrimary,
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : Text(
                                          'Lưu thay đổi',
                                          style: AppTypography.mainWith(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w700,
                                            color: AppColors.surfacePrimary,
                                          ),
                                        ),
                                );
                              },
                            ),
                          ),
                        ],
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

  Widget _buildTextField(
    String label,
    TextEditingController controller, {
    bool enabled = true,
    TextInputType? keyboardType,
    int maxLines = 1,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.mainWith(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.textMain,
          ),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          enabled: enabled,
          keyboardType: keyboardType,
          maxLines: maxLines,
          style: TextStyle(
            color: enabled ? AppColors.textMain : AppColors.textMuted,
          ),
          decoration: InputDecoration(
            filled: true,
            fillColor: enabled ? AppColors.surfaceCanvas : Colors.grey[200],
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 14,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDatePicker(String label, TextEditingController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.mainWith(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.textMain,
          ),
        ),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: () async {
            DateTime initialDate = DateTime.now();
            if (controller.text.isNotEmpty) {
              try {
                final parts = controller.text.split(RegExp(r'[-/]'));
                if (parts.length == 3) {
                  initialDate = DateTime(
                    int.parse(parts.last),
                    int.parse(parts[1]),
                    int.parse(parts.first),
                  );
                }
              } catch (_) {}
            }
            final date = await showDatePicker(
              context: context,
              initialDate: initialDate,
              firstDate: DateTime(1900),
              lastDate: DateTime.now(),
            );
            if (date != null) {
              controller.text =
                  '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
            }
          },
          child: AbsorbPointer(
            child: TextFormField(
              controller: controller,
              decoration: InputDecoration(
                filled: true,
                fillColor: AppColors.surfacePrimary,
                suffixIcon: const Icon(
                  Icons.calendar_month,
                  color: AppColors.textMuted,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGenderDropdown(String label, TextEditingController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.mainWith(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.textMain,
          ),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          initialValue: ['Nam', 'Nữ', 'Khác'].contains(controller.text)
              ? controller.text
              : 'Nam',
          decoration: InputDecoration(
            filled: true,
            fillColor: AppColors.surfaceCanvas,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 14,
            ),
          ),
          items: ['Nam', 'Nữ', 'Khác'].map((String value) {
            return DropdownMenuItem<String>(value: value, child: Text(value));
          }).toList(),
          onChanged: (newValue) {
            if (newValue != null) {
              controller.text = newValue;
            }
          },
        ),
      ],
    );
  }
}
