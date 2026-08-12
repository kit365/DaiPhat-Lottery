import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/shared/network/api_exception.dart';
import 'package:daiphat_mobile/src/shared/providers/api_providers.dart';

import '../../data/models/ticket_check_models.dart';
import '../../data/services/ticket_check_api_service.dart';

final ticketCheckApiServiceProvider = Provider<TicketCheckApiService>((ref) {
  return TicketCheckApiService(ref.watch(apiClientProvider));
});

class TicketCheckState {
  const TicketCheckState({
    required this.selectedDate,
    this.stations = const [],
    this.selectedStationId,
    this.ticketNumber = '',
    this.isLoadingStations = false,
    this.isChecking = false,
    this.hasChecked = false,
    this.checkResult,
    this.errorMessage,
    this.dateError,
    this.stationError,
    this.numberError,
  });

  final DateTime selectedDate;
  final List<LotteryStationDraw> stations;
  final int? selectedStationId;
  final String ticketNumber;
  final bool isLoadingStations;
  final bool isChecking;
  final bool hasChecked;
  final TicketCheckResult? checkResult;
  final String? errorMessage;
  final String? dateError;
  final String? stationError;
  final String? numberError;

  LotteryStationDraw? get selectedStation {
    final id = selectedStationId;
    if (id == null) return null;
    for (final station in stations) {
      if (station.id == id) return station;
    }
    return null;
  }

  TicketCheckState copyWith({
    DateTime? selectedDate,
    List<LotteryStationDraw>? stations,
    int? selectedStationId,
    bool clearSelectedStation = false,
    String? ticketNumber,
    bool? isLoadingStations,
    bool? isChecking,
    bool? hasChecked,
    TicketCheckResult? checkResult,
    bool clearCheckResult = false,
    String? errorMessage,
    bool clearErrorMessage = false,
    String? dateError,
    bool clearDateError = false,
    String? stationError,
    bool clearStationError = false,
    String? numberError,
    bool clearNumberError = false,
  }) {
    return TicketCheckState(
      selectedDate: selectedDate ?? this.selectedDate,
      stations: stations ?? this.stations,
      selectedStationId:
          clearSelectedStation ? null : (selectedStationId ?? this.selectedStationId),
      ticketNumber: ticketNumber ?? this.ticketNumber,
      isLoadingStations: isLoadingStations ?? this.isLoadingStations,
      isChecking: isChecking ?? this.isChecking,
      hasChecked: hasChecked ?? this.hasChecked,
      checkResult: clearCheckResult ? null : (checkResult ?? this.checkResult),
      errorMessage:
          clearErrorMessage ? null : (errorMessage ?? this.errorMessage),
      dateError: clearDateError ? null : (dateError ?? this.dateError),
      stationError:
          clearStationError ? null : (stationError ?? this.stationError),
      numberError: clearNumberError ? null : (numberError ?? this.numberError),
    );
  }
}

DateTime _defaultCheckDate() {
  final now = DateTime.now();
  final isBeforeResults =
      now.hour < 16 || (now.hour == 16 && now.minute < 40);
  if (isBeforeResults) {
    return DateTime(now.year, now.month, now.day)
        .subtract(const Duration(days: 1));
  }
  return DateTime(now.year, now.month, now.day);
}

class TicketCheckViewModel extends Notifier<TicketCheckState> {
  TicketCheckApiService get _api => ref.read(ticketCheckApiServiceProvider);

  @override
  TicketCheckState build() {
    final date = _defaultCheckDate();
    Future.microtask(() => loadStations(date));
    return TicketCheckState(selectedDate: date);
  }

  Future<void> loadStations(DateTime date) async {
    state = state.copyWith(
      selectedDate: date,
      isLoadingStations: true,
      clearSelectedStation: true,
      stations: const [],
      clearDateError: true,
    );
    try {
      final stations = await _api.getScheduleForDate(date);
      state = state.copyWith(
        stations: stations,
        isLoadingStations: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoadingStations: false,
        stations: const [],
        errorMessage: e is ApiException
            ? e.message
            : 'Không thể tải danh sách đài.',
      );
    }
  }

  void setTicketNumber(String value) {
    final digits = value.replaceAll(RegExp(r'[^0-9]'), '');
    final clipped =
        digits.length > 6 ? digits.substring(0, 6) : digits;
    state = state.copyWith(
      ticketNumber: clipped,
      clearNumberError: true,
    );
  }

  void selectStation(int? stationId) {
    state = state.copyWith(
      selectedStationId: stationId,
      clearSelectedStation: stationId == null,
      clearStationError: true,
    );
  }

  void clearErrorMessage() {
    state = state.copyWith(clearErrorMessage: true);
  }

  void resetCheck() {
    state = state.copyWith(
      ticketNumber: '',
      hasChecked: false,
      clearCheckResult: true,
      clearErrorMessage: true,
      clearDateError: true,
      clearStationError: true,
      clearNumberError: true,
    );
  }

  Future<void> check() async {
    state = state.copyWith(
      clearDateError: true,
      clearStationError: true,
      clearNumberError: true,
      clearErrorMessage: true,
    );

    if (state.selectedStationId == null) {
      state = state.copyWith(stationError: 'Vui lòng chọn đài quay.');
      return;
    }

    final number = state.ticketNumber.trim();
    if (number.isEmpty) {
      state = state.copyWith(numberError: 'Vui lòng nhập dãy số trên vé.');
      return;
    }
    if (number.length < 5) {
      state = state.copyWith(
        numberError: 'Vui lòng nhập đúng 5 hoặc 6 chữ số trên vé.',
      );
      return;
    }

    state = state.copyWith(
      isChecking: true,
      hasChecked: false,
      clearCheckResult: true,
    );

    try {
      final result = await _api.checkWinning(
        stationId: state.selectedStationId!,
        drawDate: state.selectedDate,
        ticketNumber: number,
      );
      state = state.copyWith(
        isChecking: false,
        hasChecked: true,
        checkResult: result,
      );
    } catch (e) {
      state = state.copyWith(
        isChecking: false,
        hasChecked: false,
        errorMessage: e is ApiException
            ? e.message
            : 'Không tìm thấy kết quả quay số của đài này vào ngày đã chọn.',
      );
    }
  }
}

final ticketCheckViewModelProvider =
    NotifierProvider<TicketCheckViewModel, TicketCheckState>(
  TicketCheckViewModel.new,
);
