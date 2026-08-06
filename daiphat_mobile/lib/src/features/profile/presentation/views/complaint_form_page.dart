import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

import 'package:daiphat_mobile/src/features/checkout/presentation/providers/checkout_provider.dart';
import 'package:daiphat_mobile/src/features/profile/data/models/support_ticket.dart';
import 'package:daiphat_mobile/src/features/profile/data/support_ticket_service.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/providers/profile_providers.dart';
import 'package:daiphat_mobile/src/features/profile/presentation/widgets/complaint_ref_picker_sheet.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';

/// Trang tạo mới / chỉnh sửa một khiếu nại (hỗ trợ).
class ComplaintFormPage extends ConsumerStatefulWidget {
  final SupportTicketService service;
  final SupportTicketResponse? editingTicket;

  const ComplaintFormPage({
    super.key,
    required this.service,
    this.editingTicket,
  });

  @override
  ConsumerState<ComplaintFormPage> createState() => _ComplaintFormPageState();
}

class _ComplaintFormPageState extends ConsumerState<ComplaintFormPage> {
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _refController = TextEditingController();

  List<TicketCategoryResponse> _categories = const [];
  TicketCategoryResponse? _selectedCategory;
  XFile? _attachment;

  String? _selectedRefId;
  String? _selectedRefLabel;

  bool _loadingCategories = true;
  bool _submitting = false;
  String? _loadError;

  bool get _isEditing => widget.editingTicket != null;

  @override
  void initState() {
    super.initState();
    final editing = widget.editingTicket;
    if (editing != null) {
      _titleController.text = editing.title;
      _descController.text = editing.description;
      _refController.text = editing.refId ?? '';
      _selectedRefId = editing.refId;
      if (editing.refId != null) {
        final id = editing.refId!;
        _selectedRefLabel = id.length > 8
            ? '#${id.substring(0, 8).toUpperCase()}'
            : '#$id';
      }
    }
    _loadCategories();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _refController.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    setState(() {
      _loadingCategories = true;
      _loadError = null;
    });
    try {
      final all = await widget.service.getCategories();
      final selectable =
          all.where((c) => !c.code.startsWith('GROUP_')).toList();
      TicketCategoryResponse? initial;
      final editing = widget.editingTicket;
      if (editing != null) {
        for (final c in selectable) {
          if (c.id == editing.ticketCategoryId) {
            initial = c;
            break;
          }
        }
      } else if (selectable.isNotEmpty) {
        initial = selectable.first;
      }
      setState(() {
        _categories = selectable;
        _selectedCategory = initial;
        _loadingCategories = false;
      });
    } catch (e) {
      setState(() {
        _loadError = e.toString().replaceFirst('Exception: ', '');
        _loadingCategories = false;
      });
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
    );
    if (picked != null) {
      setState(() => _attachment = picked);
    }
  }

  TicketRefType? get _requiredRefType => _selectedCategory?.requiredRefType;

  bool get _usesPicker =>
      _requiredRefType == TicketRefType.order ||
      _requiredRefType == TicketRefType.refundRequest ||
      _requiredRefType == TicketRefType.prizeClaim;

  bool get _evidenceRequired => _selectedCategory?.code == 'PAYMENT_SYNC_ERROR';

  Future<void> _openRefPicker() async {
    final refType = _requiredRefType;
    if (refType == null) return;
    final result = await showComplaintRefPicker(
      context: context,
      refType: refType,
      orderService: ref.read(orderServiceProvider),
      refundService: ref.read(refundServiceProvider),
      prizePayoutService: ref.read(prizePayoutServiceProvider),
      selectedId: _selectedRefId,
    );
    if (result != null && mounted) {
      setState(() {
        _selectedRefId = result.id;
        _selectedRefLabel = result.displayLabel;
        _refController.text = result.id;
      });
    }
  }

  String? _validate() {
    if (_selectedCategory == null) return 'Vui lòng chọn danh mục khiếu nại';
    final title = _titleController.text.trim();
    if (title.isEmpty) return 'Vui lòng nhập tiêu đề';
    if (title.length > 200) return 'Tiêu đề tối đa 200 ký tự';
    if (_descController.text.trim().isEmpty) {
      return 'Vui lòng nhập mô tả chi tiết';
    }
    if (_requiredRefType != null) {
      final refValue = _usesPicker
          ? (_selectedRefId ?? '').trim()
          : _refController.text.trim();
      if (refValue.isEmpty) {
        return _usesPicker
            ? 'Vui lòng chọn ${_requiredRefType!.label.toLowerCase()}'
            : 'Vui lòng nhập mã ${_requiredRefType!.label.toLowerCase()}';
      }
    }
    if (_evidenceRequired &&
        _attachment == null &&
        widget.editingTicket?.attachmentUrl == null) {
      return 'Vui lòng đính kèm biên lai chuyển khoản cho khiếu nại này.';
    }
    return null;
  }

  Future<void> _submit() async {
    final err = _validate();
    if (err != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err), backgroundColor: AppColors.error),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      final refType = _requiredRefType;
      final refId = refType == null
          ? null
          : (_usesPicker
              ? _selectedRefId!.trim()
              : _refController.text.trim());
      final data = SupportTicketFormData(
        ticketCategoryId: _selectedCategory!.id,
        title: _titleController.text.trim(),
        description: _descController.text.trim(),
        refId: refId,
        refType: refType?.value,
      );
      final SupportTicketResponse result;
      if (_isEditing) {
        result = await widget.service.update(
          widget.editingTicket!.id,
          data,
          filePath: _attachment?.path,
        );
      } else {
        result = await widget.service.create(data, filePath: _attachment?.path);
      }
      if (!mounted) return;
      Navigator.of(context).pop(result);
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, color: AppColors.textMain),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          _isEditing ? 'Chỉnh sửa khiếu nại' : 'Tạo khiếu nại mới',
          style: GoogleFonts.publicSans(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textMain,
          ),
        ),
        centerTitle: true,
      ),
      body: _loadingCategories
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : _loadError != null
              ? _buildError()
              : _buildForm(),
      bottomNavigationBar: _loadingCategories || _loadError != null
          ? null
          : _buildSubmitBar(),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 48, color: AppColors.textMuted),
          const SizedBox(height: 12),
          Text(_loadError!,
              style: GoogleFonts.publicSans(color: AppColors.textMuted)),
          const SizedBox(height: 12),
          TextButton(
            onPressed: _loadCategories,
            child: Text('Thử lại',
                style: GoogleFonts.publicSans(
                    color: AppColors.primary, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Widget _buildForm() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _label('Danh mục *'),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: _isEditing ? const Color(0xFFF4F6F8) : Colors.white,
            border: Border.all(color: const Color(0xFFE5E8EB)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<TicketCategoryResponse>(
              isExpanded: true,
              value: _selectedCategory,
              hint: Text('Chọn danh mục...',
                  style: GoogleFonts.publicSans(
                    fontSize: 14,
                    color: AppColors.loginPlaceholder,
                  )),
              items: _categories
                  .map(
                    (c) => DropdownMenuItem(
                      value: c,
                      child: Text(c.name,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.publicSans(fontSize: 14)),
                    ),
                  )
                  .toList(),
              onChanged: _isEditing
                  ? null
                  : (v) => setState(() {
                        _selectedCategory = v;
                        _refController.clear();
                        _selectedRefId = null;
                        _selectedRefLabel = null;
                      }),
            ),
          ),
        ),
        if (_selectedCategory?.description.isNotEmpty == true)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              _selectedCategory!.description,
              style: GoogleFonts.publicSans(
                  fontSize: 12, color: AppColors.textMuted),
            ),
          ),
        if (_requiredRefType != null) ...[
          const SizedBox(height: 16),
          _label('${_requiredRefType!.label} *'),
          const SizedBox(height: 6),
          if (_usesPicker)
            _buildRefPickerField()
          else
            TextField(
              controller: _refController,
              style: GoogleFonts.publicSans(fontSize: 14),
              decoration: _inputDecoration(
                'Nhập mã ${_requiredRefType!.label.toLowerCase()}',
              ),
            ),
        ],
        const SizedBox(height: 16),
        _label('Tiêu đề *'),
        const SizedBox(height: 6),
        TextField(
          controller: _titleController,
          maxLength: 200,
          style: GoogleFonts.publicSans(fontSize: 14),
          decoration: _inputDecoration('Tóm tắt vấn đề của bạn...'),
        ),
        const SizedBox(height: 8),
        _label('Mô tả chi tiết *'),
        const SizedBox(height: 6),
        TextField(
          controller: _descController,
          maxLines: 5,
          style: GoogleFonts.publicSans(fontSize: 14),
          decoration:
              _inputDecoration('Mô tả chi tiết vấn đề bạn gặp phải...'),
        ),
        const SizedBox(height: 16),
        _label('Hình ảnh đính kèm'),
        const SizedBox(height: 2),
        Text(
          _evidenceRequired
              ? 'Bắt buộc đính kèm biên lai chuyển khoản để đối soát'
              : 'Hình ảnh minh chứng (không bắt buộc)',
          style:
              GoogleFonts.publicSans(fontSize: 12, color: AppColors.textMuted),
        ),
        const SizedBox(height: 8),
        _buildAttachment(),
      ],
    );
  }

  Widget _buildRefPickerField() {
    final hasValue = _selectedRefId != null && _selectedRefId!.isNotEmpty;
    return InkWell(
      onTap: _isEditing ? null : _openRefPicker,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: _isEditing ? const Color(0xFFF4F6F8) : Colors.white,
          border: Border.all(color: const Color(0xFFE5E8EB)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                hasValue
                    ? (_selectedRefLabel ?? '#$_selectedRefId')
                    : 'Chọn ${_requiredRefType!.label.toLowerCase()}...',
                style: GoogleFonts.publicSans(
                  fontSize: 14,
                  fontWeight: hasValue ? FontWeight.w700 : FontWeight.w400,
                  color: hasValue
                      ? AppColors.textMain
                      : AppColors.loginPlaceholder,
                ),
              ),
            ),
            if (!_isEditing)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFF4F6F8),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  hasValue ? 'Thay đổi' : 'Chọn',
                  style: GoogleFonts.publicSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF454F5B),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttachment() {
    final existingUrl = widget.editingTicket?.attachmentUrl;
    return GestureDetector(
      onTap: _pickImage,
      child: Container(
        height: 160,
        width: double.infinity,
        decoration: BoxDecoration(
          color: const Color(0xFFF9FAFB),
          border: Border.all(color: const Color(0xFFE5E8EB)),
          borderRadius: BorderRadius.circular(12),
        ),
        clipBehavior: Clip.antiAlias,
        child: _attachment != null
            ? Stack(
                fit: StackFit.expand,
                children: [
                  Image.file(
                    File(_attachment!.path),
                    fit: BoxFit.contain,
                    errorBuilder: (_, _, _) => _buildFilePlaceholder(),
                  ),
                  _removeBadge(),
                ],
              )
            : (existingUrl != null && existingUrl.isNotEmpty)
                ? Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.network(existingUrl, fit: BoxFit.contain),
                      Positioned(
                        bottom: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.black54,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text('Nhấn để đổi ảnh',
                              style: GoogleFonts.publicSans(
                                  fontSize: 12, color: Colors.white)),
                        ),
                      ),
                    ],
                  )
                : _buildFilePlaceholder(),
      ),
    );
  }

  Widget _buildFilePlaceholder() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.add_photo_alternate_outlined,
            size: 36, color: AppColors.textMuted),
        const SizedBox(height: 8),
        Text('Chọn ảnh từ thư viện',
            style: GoogleFonts.publicSans(
                fontSize: 13, color: AppColors.textMuted)),
      ],
    );
  }

  Widget _removeBadge() {
    return Positioned(
      top: 8,
      right: 8,
      child: GestureDetector(
        onTap: () => setState(() => _attachment = null),
        child: Container(
          padding: const EdgeInsets.all(4),
          decoration: const BoxDecoration(
            color: Colors.black54,
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.close_rounded, size: 16, color: Colors.white),
        ),
      ),
    );
  }

  Widget _buildSubmitBar() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: ElevatedButton(
          onPressed: _submitting ? null : _submit,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 15),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: _submitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white),
                )
              : Text(
                  _isEditing ? 'Lưu thay đổi' : 'Gửi yêu cầu',
                  style: GoogleFonts.publicSans(
                      fontSize: 15, fontWeight: FontWeight.w700),
                ),
        ),
      ),
    );
  }

  Widget _label(String text) => Text(
        text,
        style: GoogleFonts.publicSans(
          fontSize: 13,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF454F5B),
        ),
      );

  InputDecoration _inputDecoration(String hint) => InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.publicSans(
          fontSize: 14,
          color: AppColors.loginPlaceholder,
        ),
        isDense: true,
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE5E8EB)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE5E8EB)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary),
        ),
      );
}
