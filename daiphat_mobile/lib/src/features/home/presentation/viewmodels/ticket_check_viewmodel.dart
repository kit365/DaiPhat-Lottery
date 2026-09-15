import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:daiphat_mobile/src/shared/network/api_exception.dart';

import '../../domain/entities/ticket_check.dart';
import '../../domain/entities/lottery_result.dart';
import '../../domain/repositories/ticket_check_repository.dart';
import '../../domain/usecases/fetch_home_lottery_results.dart';
import '../../domain/usecases/ticket_check_usecases.dart';
import 'home_viewmodel.dart';

final ticketCheckRepositoryProvider = Provider<TicketCheckRepository>((ref) {
  throw UnimplementedError(
    'ticketCheckRepositoryProvider must be overridden in bootstrap',
  );
});

final getTicketCheckStationsForDateProvider =
    Provider<GetTicketCheckStationsForDate>((ref) {
  return GetTicketCheckStationsForDate(ref.watch(ticketCheckRepositoryProvider));
});

final checkTicketWinningProvider = Provider<CheckTicketWinning>((ref) {
  return CheckTicketWinning(ref.watch(ticketCheckRepositoryProvider));
});

class TicketCheckState {
  const TicketCheckState({
    this.selectedDate,
    this.stations = const [],
    this.selectedStationId,
    this.ticketNumber = '',
    this.isLoadingStations = false,
    this.isChecking = false,
    this.hasChecked = false,
    this.checkResult,
    this.checkedStationResult,
    this.isLoadingCheckedStationResult = false,
    this.errorMessage,
    this.dateError,
    this.stationError,
    this.numberError,
  });

  final DateTime? selectedDate;
  final List<LotteryStationDraw> stations;
  final int? selectedStationId;
  final String ticketNumber;
  final bool isLoadingStations;
  final bool isChecking;
  final bool hasChecked;
  final TicketCheckResult? checkResult;
  final LotteryResult? checkedStationResult;
  final bool isLoadingCheckedStationResult;
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
    LotteryResult? checkedStationResult,
    bool clearCheckedStationResult = false,
    bool? isLoadingCheckedStationResult,
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
      checkedStationResult: clearCheckedStationResult
          ? null
          : (checkedStationResult ?? this.checkedStationResult),
      isLoadingCheckedStationResult:
          isLoadingCheckedStationResult ?? this.isLoadingCheckedStationResult,
      errorMessage:
          clearErrorMessage ? null : (errorMessage ?? this.errorMessage),
      dateError: clearDateError ? null : (dateError ?? this.dateError),
      stationError:
          clearStationError ? null : (stationError ?? this.stationError),
      numberError: clearNumberError ? null : (numberError ?? this.numberError),
    );
  }
}

class TicketCheckViewModel extends Notifier<TicketCheckState> {
  GetTicketCheckStationsForDate get _getStationsForDate =>
      ref.read(getTicketCheckStationsForDateProvider);

  CheckTicketWinning get _checkTicketWinning =>
      ref.read(checkTicketWinningProvider);

  FetchHomeLotteryResults get _fetchHomeLotteryResults =>
      ref.read(fetchHomeLotteryResultsProvider);

  @override
  TicketCheckState build() {
    return const TicketCheckState();
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
      final stations = await _getStationsForDate(date);
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
      clearCheckedStationResult: true,
      isLoadingCheckedStationResult: false,
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

    if (state.selectedDate == null) {
      state = state.copyWith(dateError: 'Vui lòng chọn ngày quay.');
      return;
    }

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

    final drawDate = state.selectedDate!;
    final stationId = state.selectedStationId!;
    state = state.copyWith(
      isChecking: true,
      hasChecked: false,
      clearCheckResult: true,
      clearCheckedStationResult: true,
      isLoadingCheckedStationResult: false,
    );

    try {
      final result = await _checkTicketWinning(
        stationId: stationId,
        drawDate: drawDate,
        ticketNumber: number,
      );
      state = state.copyWith(
        isChecking: false,
        hasChecked: true,
        checkResult: result,
        isLoadingCheckedStationResult: true,
      );

      LotteryResult? stationResult;
      try {
        final board = await _fetchHomeLotteryResults(drawDate);
        for (final item in board.data.results) {
          if (item.stationId == stationId) {
            stationResult = item;
            break;
          }
        }
      } catch (_) {
        // Ticket checking remains successful even when the presentation board
        // cannot be loaded. The UI will show a non-blocking fallback state.
      }

      final currentResult = state.checkResult;
      final isStillShowingLookup =
          ref.mounted &&
          state.hasChecked &&
          state.isLoadingCheckedStationResult &&
          currentResult?.ticketNumber == result.ticketNumber &&
          state.selectedStationId == stationId &&
          _isSameDate(state.selectedDate, drawDate);
      if (isStillShowingLookup) {
        state = state.copyWith(
          checkedStationResult: stationResult,
          isLoadingCheckedStationResult: false,
        );
      }
    } catch (e) {
      state = state.copyWith(
        isChecking: false,
        hasChecked: false,
        isLoadingCheckedStationResult: false,
        clearCheckedStationResult: true,
        errorMessage: e is ApiException
            ? e.message
            : 'Không tìm thấy kết quả quay số của đài này vào ngày đã chọn.',
      );
    }
  }
}

bool _isSameDate(DateTime? left, DateTime right) {
  return left != null &&
      left.year == right.year &&
      left.month == right.month &&
      left.day == right.day;
}

final ticketCheckViewModelProvider =
    NotifierProvider<TicketCheckViewModel, TicketCheckState>(
  TicketCheckViewModel.new,
);
