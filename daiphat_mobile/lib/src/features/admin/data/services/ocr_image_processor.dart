import 'dart:math' as math;
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;
import 'package:image_picker/image_picker.dart';
import 'package:mime/mime.dart';

const ocrUploadSoftMaxBytes = 7500000;
const ocrUploadHardMaxBytes = 45000000;
const ocrPrepMaxDimension = 1920;

class OcrPreparedImage {
  final Uint8List bytes;
  final String name;
  final String mimeType;
  const OcrPreparedImage(this.bytes, this.name, this.mimeType);
  XFile get file => XFile.fromData(bytes, name: name, mimeType: mimeType);
}

class OcrImageProcessor {
  Future<OcrPreparedImage> prepare(XFile file) async {
    final bytes = await file.readAsBytes();
    final mime =
        file.mimeType ??
        lookupMimeType(file.name, headerBytes: bytes) ??
        'application/octet-stream';
    if (!mime.startsWith('image/'))
      throw const FormatException('Vui lòng chọn tệp hình ảnh.');
    return compute(_prepare, (bytes: bytes, name: file.name, mime: mime));
  }
}

OcrPreparedImage _prepare(({Uint8List bytes, String name, String mime}) input) {
  final original = OcrPreparedImage(input.bytes, input.name, input.mime);
  if (input.name.endsWith('-ocr.jpg') && input.mime == 'image/jpeg')
    return original;
  try {
    final decoded = img.decodeImage(input.bytes);
    if (decoded == null) return original;
    final source = img.bakeOrientation(decoded);
    final w = source.width, h = source.height;
    var x = 0, y = 0, width = w, height = h;
    var cropped = false;
    if (w >= 40 && h >= 40) {
      final scale = math.min(1.0, 640 / math.max(w, h));
      final probe = img.copyResize(
        source,
        width: math.max(1, (w * scale).round()),
        height: math.max(1, (h * scale).round()),
        interpolation: img.Interpolation.average,
      );
      var minX = probe.width, minY = probe.height, maxX = -1, maxY = -1;
      for (final pixel in probe) {
        final gray = (pixel.r + pixel.g + pixel.b) / 3;
        if (gray > 28 && gray < 245) {
          minX = math.min(minX, pixel.x);
          minY = math.min(minY, pixel.y);
          maxX = math.max(maxX, pixel.x);
          maxY = math.max(maxY, pixel.y);
        }
      }
      if (maxX >= minX && maxY >= minY) {
        final pad = (math.min(w, h) * .03).round();
        final left = math.max(0, (minX / scale).floor() - pad);
        final top = math.max(0, (minY / scale).floor() - pad);
        final right = math.min(w, ((maxX + 1) / scale).ceil() + pad);
        final bottom = math.min(h, ((maxY + 1) / scale).ceil() + pad);
        final ratio = (right - left) * (bottom - top) / (w * h);
        if (ratio <= .98 && ratio >= .82) {
          x = left;
          y = top;
          width = right - left;
          height = bottom - top;
          cropped = true;
        }
      }
    }
    if (input.mime == 'image/jpeg' &&
        input.bytes.length <= ocrUploadSoftMaxBytes &&
        !cropped &&
        math.max(width, height) <= ocrPrepMaxDimension)
      return original;
    final crop = img.copyCrop(source, x: x, y: y, width: width, height: height);
    var scale = math.min(1.0, ocrPrepMaxDimension / math.max(width, height));
    var quality = 95;
    final target = input.bytes.length > ocrUploadHardMaxBytes
        ? ocrUploadSoftMaxBytes
        : math.min(ocrUploadSoftMaxBytes, math.max(input.bytes.length, 800000));
    Uint8List? output;
    for (var attempt = 0; attempt < 8; attempt++) {
      final image = img.copyResize(
        crop,
        width: math.max(1, (width * scale).round()),
        height: math.max(1, (height * scale).round()),
        interpolation: img.Interpolation.cubic,
      );
      // CSS contrast(1.06) brightness(1.03) saturate(1.02), in that order.
      for (final pixel in image) {
        final r = ((pixel.r / 255 - .5) * 1.06 + .5) * 1.03;
        final g = ((pixel.g / 255 - .5) * 1.06 + .5) * 1.03;
        final b = ((pixel.b / 255 - .5) * 1.06 + .5) * 1.03;
        final luminance = r * .213 + g * .715 + b * .072;
        pixel.setRgb(
          ((luminance + (r - luminance) * 1.02) * 255).clamp(0, 255),
          ((luminance + (g - luminance) * 1.02) * 255).clamp(0, 255),
          ((luminance + (b - luminance) * 1.02) * 255).clamp(0, 255),
        );
      }
      output = img.encodeJpg(image, quality: quality);
      if (output.length <= target) break;
      if (quality > 90) {
        quality = math.max(90, quality - 2);
      } else if (scale > .72) {
        scale *= .92;
        quality = 95;
      } else {
        break;
      }
    }
    return OcrPreparedImage(
      output!,
      '${input.name.replaceFirst(RegExp(r'\.[^.]+$'), '')}-ocr.jpg',
      'image/jpeg',
    );
  } catch (_) {
    return original;
  }
}
