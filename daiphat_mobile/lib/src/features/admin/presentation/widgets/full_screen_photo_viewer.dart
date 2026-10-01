import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:daiphat_mobile/src/shared/theme/app_colors.dart';
import 'package:daiphat_mobile/src/shared/theme/app_typography.dart';
import 'package:image_picker/image_picker.dart';

/// Viewer toàn màn hình hỗ trợ xem ảnh chi tiết, pinch-to-zoom,
/// vuốt qua lại giữa các ảnh, và nút xóa ảnh khi cần.
class FullScreenPhotoViewer extends StatefulWidget {
  final List<dynamic> items; // XFile or String (path/url/base64)
  final int initialIndex;
  final bool canDelete;
  final void Function(int index)? onDelete;

  const FullScreenPhotoViewer({
    super.key,
    required this.items,
    this.initialIndex = 0,
    this.canDelete = false,
    this.onDelete,
  });

  static Future<void> show(
    BuildContext context, {
    required List<dynamic> items,
    int initialIndex = 0,
    bool canDelete = false,
    void Function(int index)? onDelete,
  }) {
    return Navigator.push<void>(
      context,
      PageRouteBuilder(
        opaque: false,
        barrierDismissible: true,
        pageBuilder: (context, animation, secondaryAnimation) => FullScreenPhotoViewer(
          items: items,
          initialIndex: initialIndex,
          canDelete: canDelete,
          onDelete: onDelete,
        ),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(opacity: animation, child: child);
        },
      ),
    );
  }

  @override
  State<FullScreenPhotoViewer> createState() => _FullScreenPhotoViewerState();
}

class _FullScreenPhotoViewerState extends State<FullScreenPhotoViewer> {
  late final PageController _pageController;
  late final List<dynamic> _currentItems;
  late int _currentIndex;
  final Map<int, TransformationController> _transformControllers = {};

  @override
  void initState() {
    super.initState();
    _currentItems = List.from(widget.items);
    _currentIndex = widget.initialIndex.clamp(0, _currentItems.isEmpty ? 0 : _currentItems.length - 1);
    _pageController = PageController(initialPage: _currentIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    for (final controller in _transformControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  TransformationController _getController(int index) {
    return _transformControllers.putIfAbsent(
      index,
      () => TransformationController(),
    );
  }

    void _handleDoubleTap(int index, TapDownDetails details) {
    final controller = _getController(index);
    if (controller.value != Matrix4.identity()) {
      controller.value = Matrix4.identity();
    } else {
      final position = details.localPosition;
      final zoomed = Matrix4.identity()
        ..setEntry(0, 0, 2.5)
        ..setEntry(1, 1, 2.5)
        ..setEntry(0, 3, -position.dx * 1.5)
        ..setEntry(1, 3, -position.dy * 1.5);
      controller.value = zoomed;
    }
  }

  void _deleteCurrentPhoto() {
    if (_currentItems.isEmpty) return;

    HapticFeedback.mediumImpact();
    final indexToDelete = _currentIndex;

    setState(() {
      _currentItems.removeAt(indexToDelete);
      _transformControllers.remove(indexToDelete)?.dispose();

      if (_currentItems.isEmpty) {
        widget.onDelete?.call(indexToDelete);
        Navigator.of(context).pop();
        return;
      }

      if (_currentIndex >= _currentItems.length) {
        _currentIndex = _currentItems.length - 1;
      }
    });

    widget.onDelete?.call(indexToDelete);
  }

  @override
  Widget build(BuildContext context) {
    if (_currentItems.isEmpty) {
      return const SizedBox.shrink();
    }

    return Scaffold(
      backgroundColor: Colors.black.withValues(alpha: 0.96),
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.close, color: Colors.white, size: 20),
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Vé ${_currentIndex + 1} / ${_currentItems.length}',
          style: AppTypography.subtitle1(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        actions: [
          if (widget.canDelete)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: IconButton(
                tooltip: 'Xóa ảnh này',
                icon: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppColors.statusError.withValues(alpha: 0.8),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.delete_outline_rounded,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                onPressed: () {
                  showDialog<bool>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      backgroundColor: AppColors.surfacePrimary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      title: const Text('Xóa ảnh này?'),
                      content: const Text(
                        'Ảnh này sẽ bị gỡ khỏi danh sách vé chuẩn bị gửi sang Web Admin.',
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.of(ctx).pop(false),
                          child: const Text('Hủy'),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.statusError,
                            foregroundColor: Colors.white,
                          ),
                          onPressed: () => Navigator.of(ctx).pop(true),
                          child: const Text('Xóa'),
                        ),
                      ],
                    ),
                  ).then((confirmed) {
                    if (confirmed == true) {
                      _deleteCurrentPhoto();
                    }
                  });
                },
              ),
            ),
        ],
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          PageView.builder(
            controller: _pageController,
            itemCount: _currentItems.length,
            onPageChanged: (index) {
              setState(() {
                _currentIndex = index;
              });
            },
            itemBuilder: (context, index) {
              final item = _currentItems[index];
              final controller = _getController(index);

              return GestureDetector(
                onDoubleTapDown: (details) => _handleDoubleTap(index, details),
                onDoubleTap: () {},
                child: InteractiveViewer(
                  transformationController: controller,
                  minScale: 1.0,
                  maxScale: 5.0,
                  child: Center(
                    child: _buildImageWidget(item),
                  ),
                ),
              );
            },
          ),
          Positioned(
            bottom: 28,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.pinch_outlined,
                      color: Colors.white70,
                      size: 16,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Chụm ngón tay để phóng to • Chạm 2 lần để zoom nhanh',
                      style: AppTypography.caption(
                        color: Colors.white,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImageWidget(dynamic item) {
    if (item is XFile) {
      return Image.file(
        File(item.path),
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) => _errorPlaceholder(),
      );
    }

    if (item is File) {
      return Image.file(
        item,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) => _errorPlaceholder(),
      );
    }

    if (item is String) {
      if (item.startsWith('http://') || item.startsWith('https://')) {
        return Image.network(
          item,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) => _errorPlaceholder(),
        );
      }
      try {
        if (item.startsWith('data:') ||
            (!item.contains('\\') && !item.startsWith('/'))) {
          final raw = item.startsWith('data:')
              ? item.substring(item.indexOf(',') + 1)
              : item;
          return Image.memory(
            base64Decode(raw),
            fit: BoxFit.contain,
            errorBuilder: (context, error, stackTrace) => _errorPlaceholder(),
          );
        }
        return Image.file(
          File(item),
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) => _errorPlaceholder(),
        );
      } catch (_) {
        return _errorPlaceholder();
      }
    }

    return _errorPlaceholder();
  }

  Widget _errorPlaceholder() {
    return Container(
      padding: const EdgeInsets.all(24),
      alignment: Alignment.center,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.broken_image_rounded,
            color: Colors.white54,
            size: 48,
          ),
          const SizedBox(height: 12),
          Text(
            'Không thể tải ảnh vé số',
            style: AppTypography.subtitle2(color: Colors.white70),
          ),
        ],
      ),
    );
  }
}
