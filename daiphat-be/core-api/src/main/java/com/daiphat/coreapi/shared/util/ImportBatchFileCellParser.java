package com.daiphat.coreapi.shared.util;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Reads the multi-valued cells of a ticket import file: the serial list and the
 * matching ticket images.
 */
public final class ImportBatchFileCellParser {

    /** lottery_ticket_serials.ticket_img is varchar(500). */
    public static final int MAX_IMAGE_URL_LENGTH = 500;

    private static final char NON_BREAKING_SPACE = ' ';

    private ImportBatchFileCellParser() {
    }

    /**
     * Splits a cell holding several values. Blank entries are dropped rather than
     * kept as empty strings, because a trailing separator ("a;b;") is a typo, not
     * a third value.
     */
    public static List<String> splitList(String raw, String separator) {
        if (raw == null) {
            return List.of();
        }
        String cleaned = raw.replace(NON_BREAKING_SPACE, ' ').trim();
        if (cleaned.isEmpty()) {
            return List.of();
        }

        String delimiter = separator == null || separator.isEmpty() ? ";" : separator;
        List<String> values = new ArrayList<>();
        for (String part : cleaned.split(java.util.regex.Pattern.quote(delimiter))) {
            String value = part.trim();
            if (!value.isEmpty()) {
                values.add(value);
            }
        }
        return values;
    }

    /**
     * A ticket image URL is accepted only if it is an absolute http(s) link that
     * fits the column. Anything else is dropped with a warning rather than failing
     * the row - a missing photo must never block importing the ticket itself.
     */
    public static boolean isValidImageUrl(String value) {
        if (value == null || value.isBlank() || value.length() > MAX_IMAGE_URL_LENGTH) {
            return false;
        }
        String lower = value.trim().toLowerCase(Locale.ROOT);
        return lower.startsWith("http://") || lower.startsWith("https://");
    }

    /**
     * Lines images up with serials.
     *
     * <p>Two shapes are accepted: a single image shared by every serial of the row,
     * or exactly one image per serial in the same order. Any other count is
     * ambiguous - pairing it by guesswork would attach the wrong photo to a
     * ticket - so an empty result is returned and the caller warns.
     *
     * @return one entry per serial (null where there is no usable image), or an
     *         empty list when the counts cannot be reconciled
     */
    public static List<String> alignImagesToSerials(List<String> images, int serialCount) {
        if (serialCount <= 0) {
            return List.of();
        }
        if (images == null || images.isEmpty()) {
            return nulls(serialCount);
        }

        if (images.size() == 1) {
            String shared = images.getFirst();
            String usable = isValidImageUrl(shared) ? shared.trim() : null;
            List<String> aligned = new ArrayList<>(serialCount);
            for (int index = 0; index < serialCount; index++) {
                aligned.add(usable);
            }
            return aligned;
        }

        if (images.size() != serialCount) {
            return List.of();
        }

        List<String> aligned = new ArrayList<>(serialCount);
        for (String image : images) {
            aligned.add(isValidImageUrl(image) ? image.trim() : null);
        }
        return aligned;
    }

    private static List<String> nulls(int size) {
        List<String> values = new ArrayList<>(size);
        for (int index = 0; index < size; index++) {
            values.add(null);
        }
        return values;
    }
}
