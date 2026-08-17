import 'dart:async';

import 'package:flutter/foundation.dart';

import 'package:daiphat_mobile/src/features/fortune/data/fortune_cast_service.dart';
import 'package:daiphat_mobile/src/features/fortune/data/models/fortune_cast_result.dart';
import 'package:daiphat_mobile/src/features/fortune/utils/fortune_ui.dart';
import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/utils/api_error_message.dart';

enum FortuneAnimPhase { idle, shaking, ejecting, result, error }

enum FortuneCastMode { birthdate, random }

class FortuneCastViewModel extends ChangeNotifier {
  FortuneCastViewModel(this._service);

  final FortuneCastService _service;

  FortuneAnimPhase phase = FortuneAnimPhase.idle;
  FortuneCastMode? castMode;
  String birthDay = '';
  String birthMonth = '';
  String birthYear = '';
  FortuneCastResult? result;
  String? errorMessage;
  bool busy = false;
  bool loadingToday = false;
  Duration nextCastCountdown = Duration.zero;
  int sceneKey = 0;

  Timer? _countdownTimer;
  String? _profileDob;

  bool get profileHasDob => _profileDob != null && _profileDob!.isNotEmpty;

  bool get isLocked {
    if (result?.alreadyCastToday == true) return true;
    return msUntilUnlock(result?.nextUnlockAt) > Duration.zero;
  }

  bool get showCastSetup =>
      !loadingToday &&
      !isLocked &&
      (phase == FortuneAnimPhase.idle || phase == FortuneAnimPhase.error);

  void attachProfileDob(String? dob) {
    _profileDob = dob;
    if (dob == null || dob.isEmpty) return;
    if (birthDay.isNotEmpty) return;
    final parts = splitIsoDate(dob);
    birthDay = parts.day;
    birthMonth = parts.month;
    birthYear = parts.year;
    notifyListeners();
  }

  Future<void> loadToday({bool silent = false}) async {
    if (phase == FortuneAnimPhase.shaking ||
        phase == FortuneAnimPhase.ejecting) {
      return;
    }
    if (!silent) {
      loadingToday = true;
      notifyListeners();
    }
    try {
      final today = await _service.getToday();
      if (today != null) {
        result = today;
        phase = FortuneAnimPhase.result;
        _startCountdown();
      } else if (result?.alreadyCastToday == true || result?.nextUnlockAt != null) {
        result = result?.copyWith(
          alreadyCastToday: false,
          clearNextUnlockAt: true,
        );
        if (phase == FortuneAnimPhase.result) {
          phase = FortuneAnimPhase.idle;
        }
        _stopCountdown();
      }
    } catch (_) {
      // Keep current screen if today lookup fails.
    } finally {
      loadingToday = false;
      notifyListeners();
    }
  }

  void selectCastMode(FortuneCastMode mode) {
    castMode = mode;
    errorMessage = null;
    notifyListeners();
  }

  void setBirthDate({
    required String day,
    required String month,
    required String year,
  }) {
    birthDay = day;
    birthMonth = month;
    birthYear = year;
    castMode = FortuneCastMode.birthdate;
    errorMessage = null;
    notifyListeners();
  }

  Future<bool> cast({required bool isAuthenticated}) async {
    if (busy) return false;
    errorMessage = null;

    if (!isAuthenticated) {
      errorMessage = 'Đăng nhập để gieo quẻ và lưu kết quả trong ngày.';
      notifyListeners();
      return false;
    }

    if (isLocked && result != null) {
      phase = FortuneAnimPhase.result;
      notifyListeners();
      return true;
    }

    if (castMode == null) {
      errorMessage = 'Vui lòng chọn cách gieo quẻ trước khi lắc.';
      notifyListeners();
      return false;
    }

    final payload = _resolvePayload();
    if (payload == null) {
      errorMessage = 'Vui lòng nhập ngày sinh hợp lệ (ngày / tháng / năm).';
      notifyListeners();
      return false;
    }

    busy = true;
    sceneKey += 1;
    phase = FortuneAnimPhase.shaking;
    notifyListeners();

    try {
      final apiFuture = _service.cast(payload);
      await Future<void>.delayed(kFortuneShakeDuration);
      phase = FortuneAnimPhase.ejecting;
      notifyListeners();

      final castResult = await apiFuture;
      result = castResult;
      notifyListeners();
      await Future<void>.delayed(kFortuneEjectDuration);
      phase = FortuneAnimPhase.result;
      _startCountdown();
      return true;
    } on ApiException catch (e) {
      errorMessage = toUserFacingApiMessage(e);
      phase = FortuneAnimPhase.error;
      return false;
    } catch (e) {
      errorMessage = toUserFacingApiMessage(e);
      phase = FortuneAnimPhase.error;
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  void backToJar() {
    if (isLocked) return;
    phase = FortuneAnimPhase.idle;
    notifyListeners();
  }

  CastFortunePayload? _resolvePayload() {
    if (castMode == FortuneCastMode.random) {
      return CastFortunePayload(
        randomElement: true,
        birthYear: DateTime.now().year,
      );
    }
    if (castMode != FortuneCastMode.birthdate) return null;

    final iso = buildBirthDateIso(birthDay, birthMonth, birthYear);
    if (iso != null) {
      return CastFortunePayload(birthDate: iso);
    }
    if (profileHasDob) {
      return CastFortunePayload(birthDate: _profileDob!.split('T').first);
    }
    return null;
  }

  void _startCountdown() {
    _stopCountdown();
    void tick() {
      nextCastCountdown = msUntilUnlock(result?.nextUnlockAt);
      if (result?.nextUnlockAt != null && nextCastCountdown == Duration.zero) {
        result = result?.copyWith(
          alreadyCastToday: false,
          clearNextUnlockAt: true,
        );
        castMode = null;
        phase = FortuneAnimPhase.idle;
        _stopCountdown();
      }
      notifyListeners();
    }

    tick();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) => tick());
  }

  void _stopCountdown() {
    _countdownTimer?.cancel();
    _countdownTimer = null;
    nextCastCountdown = Duration.zero;
  }

  @override
  void dispose() {
    _stopCountdown();
    super.dispose();
  }
}
