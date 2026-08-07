package com.daiphat.coreapi.application.service.fortune;

import com.daiphat.coreapi.application.dto.request.fortune.FortuneProseAiRequest;

import java.time.format.DateTimeFormatter;

/**
 * Vietnamese fallback fortune prose when the dedicated AI service fails or times out.
 * Code identifiers stay English; customer-facing copy is Vietnamese to match the client app.
 * Multiple openings / middle lines are picked deterministically so repeats feel less templated.
 */
public final class FortuneProseTemplates {

    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    private static final String[] OPENINGS = {
            "Khí %s trong bản mệnh hôm nay gặp ngày mang sắc %s.",
            "Bản mệnh %s đang đón ngày mang khí %s — hai dòng khí giao nhau trên quẻ.",
            "Ngày mang hành %s chiếu vào mệnh %s của bạn.",
            "Que xăm vừa rơi giữa mệnh %s và khí ngày %s.",
            "Vận %s của bạn hôm nay được khí ngày %s nâng đỡ.",
    };

    /** Openings that put day element first (indices 2–3 use day, user order). */
    private static final boolean[] OPENING_DAY_FIRST = {false, false, true, false, false};

    private static final String[] MIDDLES = {
            "Đuôi may mắn %s hiện lên như một dấu ấn tài lộc — giữ số này gần khi chọn vé.",
            "Số %s trên que chính là đuôi đang hợp với nhịp ngày của bạn.",
            "Hãy để đuôi %s dẫn lối: chọn chậm, tin vào thời điểm của mình.",
            "Que chỉ đuôi %s — một con số đủ ngắn để nhớ, đủ mạnh để mang theo cả ngày.",
            "Đuôi %s vừa khớp khí ngũ hành hôm nay; đừng vội bỏ qua khi dạo qua kệ vé.",
    };

    private static final String[] CLOSINGS = {
            "Chúc bạn may mắn và tài lộc.",
            "Giữ tâm an, vận sẽ đến đúng lúc.",
            "Chúc một ngày đầy hỷ khí và cơ hội.",
            "Mong đuôi may mắn này mang vận đến tay bạn.",
    };

    private FortuneProseTemplates() {
    }

    public static String render(FortuneProseAiRequest request) {
        String user = viElement(request.userElement());
        String day = viElement(request.dayElement());
        String tail = request.luckyTail() == null ? "" : request.luckyTail();
        int seed = stableSeed(user, day, tail, request.birthYear());

        StringBuilder sb = new StringBuilder();
        int openIdx = Math.floorMod(seed, OPENINGS.length);
        if (OPENING_DAY_FIRST[openIdx]) {
            sb.append(String.format(OPENINGS[openIdx], day, user));
        } else {
            sb.append(String.format(OPENINGS[openIdx], user, day));
        }
        sb.append(' ');
        sb.append(String.format(MIDDLES[Math.floorMod(seed / 7, MIDDLES.length)], tail));
        sb.append(' ');

        if (request.fallbackUsed()) {
            sb.append("Số đuôi ưu tiên ban đầu đã hết hàng, nên hệ thống đã chọn một đuôi cùng nhóm ngũ hành gần nhất còn trong kho. ");
        }
        if (request.previousCast() != null) {
            String[] previousLines = {
                    "So với lần gieo ngày %s (đuôi %s), lời quẻ hôm nay mở sang một nhịp khác.",
                    "Lần trước (%s, đuôi %s) đã khép lại; hôm nay que xăm kể tiếp câu chuyện mới.",
                    "Đối chiếu ngày %s với đuôi %s trước đó — hôm nay khí đổi, số cũng đổi theo.",
            };
            int p = Math.floorMod(seed / 3, previousLines.length);
            String previousDate = request.previousCast().castDate() == null
                    ? ""
                    : request.previousCast().castDate().format(DISPLAY_DATE);
            sb.append(String.format(
                    previousLines[p],
                    previousDate,
                    request.previousCast().luckyTail()
            ));
            sb.append(' ');
        }

        sb.append(CLOSINGS[Math.floorMod(seed / 11, CLOSINGS.length)]);
        return sb.toString();
    }

    private static int stableSeed(String user, String day, String tail, int birthYear) {
        int h = 17;
        h = 31 * h + (user == null ? 0 : user.hashCode());
        h = 31 * h + (day == null ? 0 : day.hashCode());
        h = 31 * h + (tail == null ? 0 : tail.hashCode());
        h = 31 * h + birthYear;
        return h == Integer.MIN_VALUE ? 0 : Math.abs(h);
    }

    static String viElement(String element) {
        if (element == null) {
            return "Thổ";
        }
        return switch (element.trim().toUpperCase()) {
            case "METAL" -> "Kim";
            case "WOOD" -> "Mộc";
            case "WATER" -> "Thủy";
            case "FIRE" -> "Hỏa";
            case "EARTH" -> "Thổ";
            default -> element;
        };
    }
}
