import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { STORAGE_KEYS } from "../constants/storage.constants";

export interface BookingPet {
    _id: string;
    name: string;
    avatar?: string;
    weight: number;
    age?: number;
}

export interface BookingTimelineItem {
    startTime: string;
    endTime: string;
    pets: string[];
}

export interface BookingPreview {
    totalDuration: number;
    endTime: string;
    endTimeISO: string;
    timeline: BookingTimelineItem[];
}

export interface BookingService {
    id?: string | number;
    name?: string;
    description?: string;
    price?: number;
    duration?: number;
    [key: string]: unknown;
}

interface BookingState {
    // Core data
    service: BookingService | null;
    selectedPets: BookingPet[];
    selectedDate: string;
    selectedTimeSlot: { time: string; status: string; freeStaff?: number } | null;

    // UI/Preview data
    startTime: string | null; // ISO string
    endTime: string | null;   // ISO string
    totalDuration: number;
    bookingPreview: BookingPreview | null;
    note: string;

    // Actions
    setBookingData: (data: Partial<BookingState>) => void;
    resetBooking: () => void;
    clearSelectedPets: () => void;
    setNote: (note: string) => void;
}

export const useBookingStore = create<BookingState>()(
    devtools(
        immer(
            persist(
                (set) => ({
                    service: null,
                    selectedPets: [],
                    selectedDate: new Date().toISOString().split('T')[0],
                    selectedTimeSlot: null,
                    startTime: null,
                    endTime: null,
                    totalDuration: 0,
                    bookingPreview: null,
                    note: "",

                    setBookingData: (data) => {
                        set((state) => {
                            Object.assign(state, data);
                        });
                    },

                    resetBooking: () => {
                        set((state) => {
                            state.service = null;
                            state.selectedPets = [];
                            state.selectedTimeSlot = null;
                            state.startTime = null;
                            state.endTime = null;
                            state.totalDuration = 0;
                            state.bookingPreview = null;
                            state.note = "";
                        });
                    },

                    clearSelectedPets: () => {
                        set((state) => {
                            state.selectedPets = [];
                        });
                    },

                    setNote: (note) => {
                        set((state) => {
                            state.note = note;
                        });
                    },
                }),
                {
                    name: STORAGE_KEYS.BOOKING,
                }
            )
        ),
        { name: "BookingStore" }
    )
);
