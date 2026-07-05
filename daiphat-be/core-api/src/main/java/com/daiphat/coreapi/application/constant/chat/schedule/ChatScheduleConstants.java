package com.daiphat.coreapi.application.constant.chat.schedule;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ChatScheduleConstants {

    public static final String ENTITY_REGION = "region";
    public static final String ENTITY_STATION_ID = "stationId";
    public static final String ENTITY_STATION_CANONICAL = "stationCanonical";
    public static final String ENTITY_DRAW_DATE = "drawDate";

    public static final String ENTITY_STATION_IDS = "stationIds";

    public static final String SLOT_STATION_ID = ENTITY_STATION_ID;
    public static final String SLOT_STATION_IDS = "stationIds";
    public static final String SLOT_REGION = ENTITY_REGION;
    public static final String SLOT_DRAW_DATE = ENTITY_DRAW_DATE;
    public static final String SLOT_DATE_MODE = "dateMode";
    public static final String SLOT_SCOPE = "scope";
    public static final String SLOT_CONFIRM_STATION_IDS = "confirmStationIds";

    public static final String SCOPE_STATION = "STATION";
    public static final String SCOPE_STATIONS = "STATIONS";
    public static final String SCOPE_REGION_ALL = "REGION_ALL";
    public static final String SCOPE_NATION_ALL = "NATION_ALL";
    public static final String SCOPE_PICK_STATION = "PICK_STATION";

    public static final String TOKEN_ASK_LOCATION = "SCHEDULE_ASK_LOCATION";
    public static final String TOKEN_ASK_DATE = "SCHEDULE_ASK_DATE";
    public static final String TOKEN_ASK_DATE_MODE = "SCHEDULE_ASK_DATE_MODE";
    public static final String TOKEN_ASK_STATION_PREFIX = "SCHEDULE_ASK_STATION:";
    public static final String TOKEN_CONFIRM_STATION_PREFIX = "SCHEDULE_CONFIRM_STATION:";
    public static final String TOKEN_REGION_CHOICE_PREFIX = "SCHEDULE_REGION_CHOICE:";
    public static final String TOKEN_RESULT_PREFIX = "SCHEDULE_RESULT:";

    public static final String TOKEN_LEGACY_SCHEDULE_OPTIONS = "SCHEDULE_OPTIONS";
    /** Token từ quick-reply chip — restart WEB_SCHEDULE, không phụ thuộc classify. */
    public static final String TOKEN_RESTART = "SCHEDULE_RESTART";

    public static final String RELATIVE_TODAY = "TODAY";
    public static final String RELATIVE_TOMORROW = "TOMORROW";
    public static final String RELATIVE_YESTERDAY = "YESTERDAY";

    public static final String RESULT_PARAM_STATION = "station";
    public static final String RESULT_PARAM_STATIONS = "stations";
    public static final String RESULT_PARAM_REGION = "region";
    public static final String RESULT_PARAM_DATE = "date";
    public static final String RESULT_PARAM_SCOPE_ALL = "scope=all";

    public static final double FUZZY_MATCH_THRESHOLD = 0.75;
    public static final double FUZZY_AMBIGUITY_GAP = 0.10;
    public static final int FUZZY_MIN_TOKEN_WORDS = 2;
    public static final int FUZZY_MAX_TOKEN_WORDS = 4;
}
