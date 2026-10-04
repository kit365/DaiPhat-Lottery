import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Keeps the camera open while each captured photo is added to the parent's queue.
class ContinuousCameraView extends StatefulWidget {
  const ContinuousCameraView({
    super.key,
    required this.onCaptured,
    required this.onRemoved,
  });

  final ValueChanged<XFile> onCaptured;
  final ValueChanged<XFile> onRemoved;

  @override
  State<ContinuousCameraView> createState() => _ContinuousCameraViewState();
}

class _ContinuousCameraViewState extends State<ContinuousCameraView>
    with WidgetsBindingObserver {
  CameraController? _controller;
  final List<XFile> _photos = [];
  bool _capturing = false;
  String? _error;
  int _generation = 0;
  bool _opening = false;
  Future<void> _closing = Future.value();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(_openCamera());
  }

  Future<void> _openCamera() async {
    if (_opening) return;
    _opening = true;
    final generation = ++_generation;
    CameraController? camera;
    try {
      await _closing;
      final cameras = await availableCameras();
      if (!mounted || generation != _generation) return;
      if (cameras.isEmpty) {
        throw CameraException('NoCamera', 'Không tìm thấy camera.');
      }
      final selected =
          cameras
              .where((c) => c.lensDirection == CameraLensDirection.back)
              .firstOrNull ??
          cameras.first;
      camera = CameraController(
        selected,
        ResolutionPreset.high,
        enableAudio: false,
      );
      await camera.initialize();
      if (!mounted || generation != _generation) {
        await camera.dispose();
        return;
      }
      setState(() {
        _controller = camera;
        _error = null;
      });
    } catch (error) {
      await camera?.dispose();
      if (!mounted || generation != _generation) return;
      setState(() {
        _error =
            error is CameraException && error.code.startsWith('CameraAccess')
            ? 'Hãy cho phép ứng dụng dùng camera trong Cài đặt để tiếp tục chụp.'
            : 'Không mở được camera. Vui lòng thử lại hoặc chọn ảnh từ thư viện.';
      });
    } finally {
      _opening = false;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Permission prompts during initialization also change lifecycle state.
    if (state == AppLifecycleState.inactive && _controller != null) {
      _generation++;
      final camera = _controller;
      setState(() => _controller = null);
      _closing = camera?.dispose() ?? Future.value();
    } else if (state == AppLifecycleState.resumed && _controller == null) {
      unawaited(_openCamera());
    }
  }

  Future<void> _capture() async {
    final camera = _controller;
    if (camera == null || !camera.value.isInitialized || _capturing) return;
    setState(() => _capturing = true);
    try {
      final photo = await camera.takePicture();
      if (!mounted) return;
      widget.onCaptured(photo);
      setState(() => _photos.add(photo));
      unawaited(HapticFeedback.lightImpact());
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Chưa chụp được ảnh, vui lòng thử lại.'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _capturing = false);
    }
  }

  @override
  void dispose() {
    _generation++;
    WidgetsBinding.instance.removeObserver(this);
    unawaited(_controller?.dispose());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final camera = _controller;
    return PopScope(
      canPop: !_capturing,
      child: Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.black,
          foregroundColor: Colors.white,
          title: Text('Chụp liên tục • ${_photos.length} ảnh'),
          actions: [
            TextButton(
              onPressed: _capturing ? null : () => Navigator.of(context).pop(),
              child: const Text('Xong'),
            ),
          ],
        ),
        body: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: Center(
                  child: _error != null
                      ? Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _error!,
                                style: const TextStyle(color: Colors.white),
                                textAlign: TextAlign.center,
                              ),
                              TextButton(
                                onPressed: () {
                                  setState(() => _error = null);
                                  unawaited(_openCamera());
                                },
                                child: const Text('Thử lại'),
                              ),
                            ],
                          ),
                        )
                      : camera == null
                      ? const CircularProgressIndicator()
                      : CameraPreview(camera),
                ),
              ),
              if (_photos.isNotEmpty)
                SizedBox(
                  height: 96,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    reverse: true,
                    padding: const EdgeInsets.all(8),
                    itemCount: _photos.length,
                    separatorBuilder: (_, index) => const SizedBox(width: 8),
                    itemBuilder: (_, index) {
                      final photo = _photos[_photos.length - 1 - index];
                      return SizedBox(
                        key: ValueKey(photo.path),
                        width: 80,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.file(
                                File(photo.path),
                                fit: BoxFit.cover,
                                cacheWidth: 160,
                              ),
                            ),
                            Positioned(
                              top: 0,
                              right: 0,
                              child: IconButton(
                                tooltip: 'Xóa ảnh ${_photos.length - index}',
                                onPressed: () {
                                  widget.onRemoved(photo);
                                  setState(() => _photos.remove(photo));
                                  unawaited(HapticFeedback.lightImpact());
                                },
                                style: IconButton.styleFrom(
                                  backgroundColor: Colors.black87,
                                  foregroundColor: Colors.white,
                                  minimumSize: const Size(48, 48),
                                  padding: const EdgeInsets.all(12),
                                ),
                                icon: const Icon(Icons.close, size: 24),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Text(
                  'Bấm × để bỏ ảnh không cần. Chụp tiếp hoặc bấm Xong để gửi sang Web.',
                  style: TextStyle(color: Colors.white),
                  textAlign: TextAlign.center,
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: IconButton.filled(
                  tooltip: 'Chụp thêm ảnh',
                  iconSize: 52,
                  onPressed: camera == null || _capturing ? null : _capture,
                  icon: _capturing
                      ? const SizedBox(
                          width: 52,
                          height: 52,
                          child: CircularProgressIndicator(),
                        )
                      : const Icon(Icons.camera_alt),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
