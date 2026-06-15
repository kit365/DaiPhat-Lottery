package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.domain.model.enums.CodedLabeledEnum;
import com.daiphat.coreapi.domain.model.enums.LabeledEnum;

import java.util.function.BiFunction;
import java.util.Arrays;
import java.util.List;

public final class EnumOptionUtils {

    private EnumOptionUtils() {
    }

    public static <E extends Enum<E> & LabeledEnum> List<EnumOptionResponse> toEnumOptions(E[] values) {
        return Arrays.stream(values)
                .map(value -> new EnumOptionResponse(value.name(), value.getLabel()))
                .toList();
    }

    public static <E extends Enum<E> & CodedLabeledEnum, R> List<R> toCodeLabelResponses(
            E[] values,
            BiFunction<String, String, R> responseFactory
    ) {
        return Arrays.stream(values)
                .map(value -> responseFactory.apply(value.getCode(), value.getLabel()))
                .toList();
    }
}
