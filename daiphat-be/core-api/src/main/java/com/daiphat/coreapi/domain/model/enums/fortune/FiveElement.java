package com.daiphat.coreapi.domain.model.enums.fortune;

/**
 * Five elements (Wu Xing) used by fortune-cast scoring.
 */
public enum FiveElement {
    METAL,
    WOOD,
    WATER,
    FIRE,
    EARTH;

    /** Element that this element generates (tương sinh forward). */
    public FiveElement generates() {
        return switch (this) {
            case WOOD -> FIRE;
            case FIRE -> EARTH;
            case EARTH -> METAL;
            case METAL -> WATER;
            case WATER -> WOOD;
        };
    }

    /** Element that this element controls / overcomes (tương khắc forward). */
    public FiveElement controls() {
        return switch (this) {
            case WOOD -> EARTH;
            case FIRE -> METAL;
            case EARTH -> WATER;
            case METAL -> WOOD;
            case WATER -> FIRE;
        };
    }
}
