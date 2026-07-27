import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../../components/layout/header';
import { ChevronRight, Calendar as CalendarIcon, CheckCircle2, ShieldCheck, RefreshCw, ChevronDown, ChevronUp, Filter, LayoutGrid, Heart, SlidersHorizontal, Trash2, Search } from 'lucide-react';
import { useCartStore } from '../../../stores/useCartStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { AppToast as toast } from '../../../utils/toast.util';
import {
    useStationsByDrawDate,
    useStationsToday,
    useStationsTomorrow,
} from '../../../admin/features/station/hooks/useStation';
import { apiApp } from '../../../api';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import {
    DEFAULT_SOUTHERN_DRAW_TIME,
    isTodayDrawPassed,
    resolveSellableDrawDateParam,
    todayIsoVn,
    tomorrowIsoVn,
} from '../../utils/sellableDrawDate.util';
import { normalizeTicketSearchDigits } from '../../utils/ticketSearchQuery.util';
import { getPublicSchedule } from '../schedule/services/scheduleService';
import { resolveNextStationDrawDateIso } from '../../utils/stationDrawDate.util';
import {
    AppliedTicketFilters,
    EMPTY_APPLIED_FILTERS,
    NumberTypeValue,
    PRESET_TAIL_RANGES,
    countActiveTicketFilters,
    hasActiveTicketFilters,
    loadFavoriteNumbers,
    saveFavoriteNumbers,
    toApiTailRange,
    toUiTailRangeLabel,
} from '../../utils/buyTicketFilter.util';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isIsoDrawDate = (value: string) => ISO_DATE_RE.test(value);

const resolveDrawDateToken = (token: string): string => {
    if (token === 'today') {
        return todayIsoVn();
    }
    if (token === 'tomorrow') {
        return tomorrowIsoVn();
    }
    return token;
};

/** Token ngày mặc định: sau giờ xổ → ngày mai. */
const defaultSellableDateToken = (drawTime: string = DEFAULT_SOUTHERN_DRAW_TIME): 'today' | 'tomorrow' =>
    isTodayDrawPassed(drawTime) ? 'tomorrow' : 'today';

const toSellableDateTokens = (
    raw: string | null | undefined,
    drawTime: string = DEFAULT_SOUTHERN_DRAW_TIME
): string[] => {
    const resolved = resolveSellableDrawDateParam(raw, new Date(), drawTime);
    if (resolved === todayIsoVn()) return ['today'];
    if (resolved === tomorrowIsoVn()) return ['tomorrow'];
    return [resolved];
};

const formatViWeekdayLabel = (isoDate: string) =>
    dayjs(isoDate)
        .locale('vi')
        .format('DD/MM/YYYY (dddd)')
        .replace(/t/g, 'T')
        .replace('Thứ', 'Thứ')
        .replace('chủ', 'Chủ');

const sameProvinceId = (left: string | number, right: string | number) =>
    String(left) === String(right);

// Preload critical images to prevent flickering on first load
if (typeof window !== 'undefined') {
    const imagesToPreload = [
        "https://i.ibb.co/TBf95cjX/6b561e49-2b8d-4dc5-b4c7-cff26a273abc.png",
        "https://i.ibb.co/LXLSg1qx/07bf0bdd-3932-4bbd-8df4-c08e72c52800.png",
        "https://i.ibb.co/tpJtrscQ/d0ea187b-cfe0-4a28-9366-c10db2e6a96c.png",
        "https://i.ibb.co/BVFGYpL1/86f05f70-fcf8-445f-978e-a0539eb2f0de.png"
    ];
    imagesToPreload.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
    });
}

const BannerSection = React.memo(() => (
    <div className="hidden xl:flex w-[260px] shrink-0 flex-col gap-4">
        {/* Banner 1 */}
        <a href="#" className="relative block transition-transform hover:-translate-y-1 rounded-2xl overflow-hidden shadow-sm group">
            <img src="https://i.ibb.co/TBf95cjX/6b561e49-2b8d-4dc5-b4c7-cff26a273abc.png" alt="Vé số Đại Phát" className="w-full h-auto object-cover" />
            <div className="absolute inset-0 flex flex-col items-center pt-8 px-4 text-center">
                <h3 className="text-[#FFDF70] font-black text-[36px] leading-[1.1] mb-2 drop-shadow-md" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>VÉ SỐ<br />ĐẠI PHÁT</h3>
                <p className="text-white text-[14px] font-medium mb-3 drop-shadow-md">Nền tảng mua vé số<br />uy tín hàng đầu</p>
                <button className="bg-gradient-to-r from-[#FFE58F] to-[#FFD666] text-[#D82A2A] font-bold px-5 py-1.5 rounded-full shadow-md group-hover:scale-105 transition-transform text-[14px]">
                    Mua vé ngay
                </button>
            </div>
        </a>

        {/* Banner 2 */}
        <a href="#" className="relative block transition-transform hover:-translate-y-1 rounded-2xl overflow-hidden shadow-sm group">
            <img src="https://i.ibb.co/LXLSg1qx/07bf0bdd-3932-4bbd-8df4-c08e72c52800.png" alt="Tìm số may mắn" className="w-full h-auto object-cover" />
            <div className="absolute inset-0 flex flex-col justify-center items-start p-4 pb-10 w-[65%]">
                <h3 className="text-[#FFDF70] font-bold text-[14px] mb-2 drop-shadow-md">TÌM SỐ MAY MẮN</h3>
                <p className="text-white text-[14px] font-medium mb-3 drop-shadow-md leading-snug">Chọn dãy số yêu thích<br />nhận ngay lộc lớn!</p>
                <button className="bg-gradient-to-r from-[#FFE58F] to-[#FFD666] text-[#D82A2A] font-bold px-4 py-1.5 rounded-full shadow-md group-hover:scale-105 transition-transform text-[14px]">
                    Chọn số ngay
                </button>
            </div>
        </a>

        {/* Banner 3 */}
        <a href="#" className="relative block transition-transform hover:-translate-y-1 rounded-2xl overflow-hidden shadow-sm group">
            <img src="https://i.ibb.co/tpJtrscQ/d0ea187b-cfe0-4a28-9366-c10db2e6a96c.png" alt="Dịch vụ vé số" className="w-full h-auto object-cover" />
            <div className="absolute inset-0 flex flex-col justify-center items-start p-4 w-[70%]">
                <h3 className="text-white font-bold text-[14px] mb-1.5 drop-shadow-md">DỊCH VỤ VÉ SỐ</h3>
                <div className="text-white font-bold text-[14px] mb-0.5">Nhận ảnh vé thật <span className="text-[14px]">100%</span></div>
                <p className="text-white text-[12px] mb-3 opacity-90">Bảo mật & An toàn tuyệt đối</p>
                <button className="bg-white text-[#ee1314] font-bold px-4 py-1.5 rounded-full shadow-md group-hover:scale-105 transition-transform text-[14px]">
                    Tìm hiểu thêm
                </button>
            </div>
        </a>
    </div>
));

export const BuyTicketPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlStationId = searchParams.get('stationId');
    const urlStationIds = searchParams.get('stationIds');
    const urlRegion = searchParams.get('region');
    const urlDrawDate = searchParams.get('drawDate');
    const urlTicketId = searchParams.get('ticketId');
    const { token, openLoginModal } = useAuthStore();

    // State
    const [selectedDates, setSelectedDates] = useState<string[]>(() => [defaultSellableDateToken()]);
    const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
    const [selectedTab, setSelectedTab] = useState<'quick' | 'manual' | 'birthday'>('quick');
    const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
    const [ticketQuantity, setTicketQuantity] = useState(1);
    const [isDateOpen, setIsDateOpen] = useState(false);
    const [isProvinceOpen, setIsProvinceOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterActiveTab, setFilterActiveTab] = useState<'all' | 'favorites' | 'range'>('favorites');
    const [ticketSearchInput, setTicketSearchInput] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [favoriteNumbers, setFavoriteNumbers] = useState<string[]>(() => loadFavoriteNumbers());
    const [favoriteDraftInput, setFavoriteDraftInput] = useState('');
    const [draftSelectedFavorites, setDraftSelectedFavorites] = useState<string[]>([]);
    const [draftRanges, setDraftRanges] = useState<string[]>([]);
    const [draftNumberTypes, setDraftNumberTypes] = useState<NumberTypeValue[]>([]);
    const [customRangeFrom, setCustomRangeFrom] = useState('00');
    const [customRangeTo, setCustomRangeTo] = useState('99');
    const [appliedFilters, setAppliedFilters] = useState<AppliedTicketFilters>(EMPTY_APPLIED_FILTERS);
    /** Tick để re-check giờ xổ khi user giữ trang mở qua giờ quay. */
    const [clockTick, setClockTick] = useState(0);
    const selectorsRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const ticketListRef = useRef<HTMLDivElement>(null);
    const appliedDeepLinkRef = useRef(false);
    const appliedTicketIdRef = useRef<string | null>(null);
    const autoSwitchedToTomorrowRef = useRef(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectorsRef.current && !selectorsRef.current.contains(event.target as Node)) {
                setIsDateOpen(false);
                setIsProvinceOpen(false);
            }
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const timer = window.setInterval(() => setClockTick((t) => t + 1), 30_000);
        return () => window.clearInterval(timer);
    }, []);

    // Debounce search bar → appliedSearch (min 2 digits)
    useEffect(() => {
        const handle = window.setTimeout(() => {
            const digits = normalizeTicketSearchDigits(ticketSearchInput, 6);
            setAppliedSearch(digits.length >= 2 ? digits : '');
        }, 300);
        return () => window.clearTimeout(handle);
    }, [ticketSearchInput]);

    useEffect(() => {
        saveFavoriteNumbers(favoriteNumbers);
    }, [favoriteNumbers]);

    // API Hooks
    const { data: stationsTodayData, isLoading: isLoadingToday } = useStationsToday();
    const { data: stationsTomorrowData, isLoading: isLoadingTomorrow } = useStationsTomorrow();

    const customDrawDates = useMemo(
        () => selectedDates.filter(isIsoDrawDate),
        [selectedDates]
    );
    const { data: stationsCustomData, isLoading: isLoadingCustomStations } =
        useStationsByDrawDate(customDrawDates.length > 0 ? customDrawDates : undefined);

    const isLoadingProviders = isLoadingToday || isLoadingTomorrow || isLoadingCustomStations;

    const mapStationToProvince = (p: any) => ({
        id: String(p.id || p._id),
        name: p.name,
        time: p.drawTime,
        day: p.drawSchedule,
        icon: p.image || p.thumbnailUrl,
        schedule: p.drawSchedule,
        region: p.region,
    });

    const dynamicProvinces = useMemo(() => {
        let combined: any[] = [];
        if (selectedDates.includes('today') && stationsTodayData) {
            combined = [...combined, ...stationsTodayData];
        }
        if (selectedDates.includes('tomorrow') && stationsTomorrowData) {
            combined = [...combined, ...stationsTomorrowData];
        }
        if (customDrawDates.length > 0 && stationsCustomData) {
            combined = [...combined, ...stationsCustomData];
        }

        const unique = Array.from(new Map(combined.map(item => [String(item.id || item._id), item])).values());
        return unique.map(mapStationToProvince);
    }, [selectedDates, stationsTodayData, stationsTomorrowData, customDrawDates, stationsCustomData]);

    const allProvinceIds = useMemo(
        () => dynamicProvinces.map((province) => String(province.id)),
        [dynamicProvinces]
    );
    const activeProvinces = useMemo(
        () =>
            dynamicProvinces.filter((province) =>
                selectedProvinces.some((id) => sameProvinceId(id, province.id))
            ),
        [dynamicProvinces, selectedProvinces]
    );
    const isAllProvincesSelected =
        allProvinceIds.length > 0 && activeProvinces.length === allProvinceIds.length;
    const selectedDatesKey = selectedDates.join(',');
    const lastSyncedDatesKeyRef = useRef<string | null>(null);

    /** Giờ xổ dùng để quyết định còn bán vé hôm nay hay không. */
    const effectiveDrawTime = useMemo(() => {
        if (selectedProvinces.length === 1) {
            const station = dynamicProvinces.find((p) => sameProvinceId(p.id, selectedProvinces[0]));
            if (station?.time) return station.time;
        }
        return DEFAULT_SOUTHERN_DRAW_TIME;
    }, [selectedProvinces, dynamicProvinces]);

    // clockTick buộc re-evaluate khi giữ trang mở qua giờ xổ
    const todaySellClosed = useMemo(
        () => isTodayDrawPassed(effectiveDrawTime),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [effectiveDrawTime, clockTick]
    );

    /** Sau giờ xổ: tự bỏ "hôm nay", chuyển sang ngày mai để còn vé bán. */
    useEffect(() => {
        if (!todaySellClosed) {
            autoSwitchedToTomorrowRef.current = false;
            return;
        }

        const todayIso = todayIsoVn();
        const hasTodayToken =
            selectedDates.includes('today') || selectedDates.includes(todayIso);
        if (!hasTodayToken) {
            return;
        }

        const next = selectedDates.filter((d) => d !== 'today' && d !== todayIso);
        setSelectedDates(
            next.length === 0
                ? ['tomorrow']
                : next.includes('tomorrow')
                  ? next
                  : [...next, 'tomorrow']
        );
        setSelectedNumbers([]);

        if (!autoSwitchedToTomorrowRef.current) {
            autoSwitchedToTomorrowRef.current = true;
            toast.info('Đã qua giờ xổ hôm nay. Hệ thống chuyển sang bán vé ngày mai.');
        }
    }, [todaySellClosed, selectedDates]);

    // Re-apply deep link when chatbot query params change
    useEffect(() => {
        appliedDeepLinkRef.current = false;
        appliedTicketIdRef.current = null;
        if (urlTicketId || urlStationId || urlStationIds || urlDrawDate || urlRegion) {
            setSelectedNumbers([]);
            setTicketQuantity(1);
        }
    }, [urlStationId, urlStationIds, urlRegion, urlDrawDate, urlTicketId]);

    useEffect(() => {
        if (!urlDrawDate) {
            return;
        }
        setSelectedDates(toSellableDateTokens(urlDrawDate, effectiveDrawTime));
    }, [urlDrawDate, effectiveDrawTime]);

    // Deep link chỉ có stationId: chọn đúng ngày quay sắp tới của đài (vd. Cần Thơ – Thứ 4).
    useEffect(() => {
        if (!urlStationId || urlDrawDate) {
            return;
        }

        let cancelled = false;
        const stationId = Number(urlStationId);
        if (Number.isNaN(stationId)) {
            return;
        }

        void (async () => {
            try {
                const stations = await getPublicSchedule({ stationId });
                const station = stations[0];
                if (!station || cancelled) {
                    return;
                }
                const nextDrawDate = resolveNextStationDrawDateIso(station.drawDays, station.drawTime);
                if (nextDrawDate) {
                    setSelectedDates([nextDrawDate]);
                }
            } catch {
                // Giữ ngày mặc định nếu không tải được lịch đài.
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [urlStationId, urlDrawDate]);

    // Pre-select đài từ deep link (chatbot CTA) hoặc đồng bộ khi đổi ngày quay
    useEffect(() => {
        if (appliedDeepLinkRef.current) {
            return;
        }

        let targetIds: string[] = [];
        if (urlStationId) {
            targetIds = [urlStationId];
        } else if (urlStationIds) {
            targetIds = urlStationIds
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean);
        } else if (urlRegion && dynamicProvinces.length > 0) {
            targetIds = dynamicProvinces
                .filter((province: { region?: string }) =>
                    province.region?.toUpperCase() === urlRegion.toUpperCase()
                )
                .map((province: { id: string }) => province.id);
        }

        if (targetIds.length > 0) {
            // Prefer stations present in the loaded list; if list not ready yet, still apply URL ids
            // so ticket fetch can start (API accepts stationIds + drawDate directly).
            const matchedIds = dynamicProvinces.length
                ? targetIds.filter((id) =>
                      dynamicProvinces.some((province) => sameProvinceId(province.id, id))
                  )
                : targetIds;

            if (matchedIds.length > 0) {
                setSelectedProvinces(matchedIds.map(String));
                appliedDeepLinkRef.current = true;
                lastSyncedDatesKeyRef.current = selectedDatesKey;
                return;
            }

            if (dynamicProvinces.length === 0 && (urlStationId || urlStationIds)) {
                setSelectedProvinces(targetIds.map(String));
                return;
            }
        }

        if (urlStationId || urlStationIds || urlRegion) {
            return;
        }

        if (dynamicProvinces.length === 0) {
            return;
        }

        const nextAllIds = dynamicProvinces.map((province) => String(province.id));
        const datesChanged = lastSyncedDatesKeyRef.current !== selectedDatesKey;

        setSelectedProvinces((prev) => {
            const validSelected = prev.filter((id) =>
                dynamicProvinces.some((province) => sameProvinceId(province.id, id))
            );

            // Đổi ngày quay / chưa chọn / ID cũ không còn khớp → chọn tất cả đài của ngày hiện tại
            if (datesChanged || prev.length === 0 || validSelected.length === 0) {
                return nextAllIds;
            }

            // Cùng ngày nhưng danh sách đài đổi → bỏ ID đài không còn hợp lệ
            if (validSelected.length !== prev.length) {
                return validSelected;
            }

            return prev;
        });

        lastSyncedDatesKeyRef.current = selectedDatesKey;
    }, [dynamicProvinces, selectedDatesKey, urlRegion, urlStationId, urlStationIds]);

    // Fetch tickets — resolve today/tomorrow/ISO tokens correctly
    const selectedStationIdsForQuery = useMemo(
        () => activeProvinces.map((province) => String(province.id)),
        [activeProvinces]
    );
    const drawDateFilter = selectedDates.map(resolveDrawDateToken).join(',');
    const activeFilterCount = countActiveTicketFilters(appliedFilters);
    const { data: ticketsRes, isLoading: isLoadingTickets } = useQuery({
        queryKey: [
            'public-buy-ticket-list',
            selectedStationIdsForQuery,
            drawDateFilter,
            appliedSearch,
            appliedFilters,
        ],
        enabled: selectedStationIdsForQuery.length > 0 && Boolean(drawDateFilter),
        queryFn: async () => {
            const response = await apiApp.get('/lottery-tickets/public', {
                params: {
                    page: 1,
                    size: 100,
                    stationIds: selectedStationIdsForQuery,
                    drawDate: drawDateFilter,
                    search: appliedSearch || undefined,
                    searchMode: appliedSearch ? 'CONTAINS' : undefined,
                    searches: appliedFilters.searches.length > 0 ? appliedFilters.searches : undefined,
                    tailRanges: appliedFilters.tailRanges.length > 0 ? appliedFilters.tailRanges : undefined,
                    numberTypes: appliedFilters.numberTypes.length > 0 ? appliedFilters.numberTypes : undefined,
                    sortBy: undefined,
                    direction: undefined,
                },
                paramsSerializer: {
                    indexes: null,
                },
            });

            const result = response.data?.data;
            const recordList = (result?.recordList || []).map((item: any) => ({
                ...item,
                _id: item.id,
                avatar: item.ticketImg,
                status: item.status ? item.status.toLowerCase() : 'draft',
            }));

            return {
                ...response.data,
                data: {
                    ...result,
                    recordList,
                },
            };
        },
    });
    const availableTickets = ticketsRes?.data?.recordList || [];

    const openFilterPanel = () => {
        const nextOpen = !isFilterOpen;
        if (nextOpen) {
            setDraftSelectedFavorites([...appliedFilters.searches]);
            setDraftRanges(appliedFilters.tailRanges.map(toUiTailRangeLabel));
            setDraftNumberTypes([...appliedFilters.numberTypes]);
        }
        setIsFilterOpen(nextOpen);
    };

    const applyTicketFilters = () => {
        setAppliedFilters({
            searches: [...draftSelectedFavorites],
            tailRanges: draftRanges.map(toApiTailRange),
            numberTypes: [...draftNumberTypes],
        });
        setIsFilterOpen(false);
    };

    const clearTicketFilters = () => {
        setDraftSelectedFavorites([]);
        setDraftRanges([]);
        setDraftNumberTypes([]);
        setAppliedFilters(EMPTY_APPLIED_FILTERS);
        setTicketSearchInput('');
        setAppliedSearch('');
        setIsFilterOpen(false);
    };

    const addFavoriteNumber = (raw: string) => {
        const digits = normalizeTicketSearchDigits(raw, 6);
        if (digits.length < 2) {
            toast.info('Nhập ít nhất 2 chữ số để thêm dãy yêu thích');
            return;
        }
        setFavoriteNumbers((prev) => (prev.includes(digits) ? prev : [...prev, digits]));
        setDraftSelectedFavorites((prev) => (prev.includes(digits) ? prev : [...prev, digits]));
        setFavoriteDraftInput('');
    };

    const removeFavoriteNumber = (num: string) => {
        setFavoriteNumbers((prev) => prev.filter((item) => item !== num));
        setDraftSelectedFavorites((prev) => prev.filter((item) => item !== num));
    };

    const toggleDraftFavorite = (num: string) => {
        setDraftSelectedFavorites((prev) =>
            prev.includes(num) ? prev.filter((item) => item !== num) : [...prev, num]
        );
    };

    const toggleDraftRange = (label: string) => {
        setDraftRanges((prev) =>
            prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
        );
    };

    const toggleDraftNumberType = (type: NumberTypeValue) => {
        setDraftNumberTypes((prev) =>
            prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]
        );
    };

    const addCustomRange = () => {
        const from = normalizeTicketSearchDigits(customRangeFrom, 2).padStart(2, '0').slice(-2);
        const to = normalizeTicketSearchDigits(customRangeTo, 2).padStart(2, '0').slice(-2);
        const fromNum = Number(from);
        const toNum = Number(to);
        if (Number.isNaN(fromNum) || Number.isNaN(toNum) || fromNum > toNum || fromNum < 0 || toNum > 99) {
            toast.info('Khoảng số không hợp lệ (00–99, từ ≤ đến)');
            return;
        }
        const label = `${from} - ${to}`;
        setDraftRanges((prev) => (prev.includes(label) ? prev : [...prev, label]));
    };

    // Preselect / highlight ticket from chatbot deep-link (?ticketId=)
    useEffect(() => {
        if (!urlTicketId || availableTickets.length === 0) {
            return;
        }
        if (appliedTicketIdRef.current === urlTicketId) {
            return;
        }

        const matched = availableTickets.find(
            (ticket: any) => String(ticket.id ?? ticket._id) === String(urlTicketId)
        );
        if (!matched?.numbers) {
            return;
        }

        appliedTicketIdRef.current = urlTicketId;
        setSelectedNumbers([matched.numbers]);
        setTicketQuantity(1);

        // Ensure đài matches the ticket when list finally loaded
        const ticketStationId = matched.stationId ?? matched.providerId;
        if (ticketStationId != null) {
            setSelectedProvinces((prev) =>
                prev.some((id) => sameProvinceId(id, ticketStationId))
                    ? prev
                    : [String(ticketStationId)]
            );
        }

        requestAnimationFrame(() => {
            const node = ticketListRef.current?.querySelector(`[data-ticket-id="${urlTicketId}"]`);
            node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }, [urlTicketId, availableTickets]);

    const toggleNumber = (num: string) => {
        setTicketQuantity(1); // Reset quantity when changing number
        if (selectedNumbers.includes(num)) {
            setSelectedNumbers(selectedNumbers.filter(n => n !== num));
        } else {
            setSelectedNumbers([num]);
        }
    };

    const maxAvailable = useMemo(() => {
        if (selectedNumbers.length === 0) return 1;
        const num = selectedNumbers[0];
        const ticketData = availableTickets.find((t: any) => t.numbers === num);
        return ticketData?.quantity || 1;
    }, [selectedNumbers, availableTickets]);

    const selectedTicketProvinces = useMemo(() => {
        if (selectedNumbers.length === 0) return activeProvinces;
        
        const provs = new Map();
        selectedNumbers.forEach(num => {
            const ticketData = availableTickets.find((t: any) => t.numbers === num);
            if (ticketData) {
                const prov = dynamicProvinces.find(
                    (p: any) =>
                        sameProvinceId(p.id, ticketData.providerId ?? '') ||
                        sameProvinceId(p.id, ticketData.stationId ?? '')
                );
                if (prov && !provs.has(prov.id)) {
                    provs.set(prov.id, prov);
                }
            }
        });
        
        const arr = Array.from(provs.values());
        return arr.length > 0 ? arr : activeProvinces;
    }, [selectedNumbers, availableTickets, dynamicProvinces, activeProvinces]);
    const totalQuantity = selectedNumbers.length * ticketQuantity;
    const pricePerTicket = 10000;
    const totalAmount = totalQuantity * pricePerTicket;

    const addToCart = () => {
        if (selectedProvinces.length === 0 || selectedNumbers.length === 0) {
            toast.warning('Vui lòng chọn đài và ít nhất 1 vé số!');
            return false;
        }

        let hasError = false;
        selectedNumbers.forEach(num => {
            const ticketData = availableTickets.find((t: any) => t.numbers === num);
            if (!ticketData || (!ticketData.id && !ticketData._id)) {
                hasError = true;
                toast.error(`Lỗi: Không tìm thấy ID cho vé số ${num}`);
                return;
            }

            const maxAvailableQty = ticketData?.quantity || 1;
            const currentCartItem = useCartStore.getState().items.find(i =>
                i.id === String(ticketData.id || ticketData._id)
            );
            const currentCartQty = currentCartItem ? currentCartItem.quantity : 0;

            if (currentCartQty + ticketQuantity > maxAvailableQty) {
                hasError = true;
                toast.error(`Vé số ${num} chỉ còn ${maxAvailableQty} vé (bạn đã có ${currentCartQty} vé trong giỏ)`);
                return;
            }

            const activeProv = dynamicProvinces.find(
                (p: any) =>
                    sameProvinceId(p.id, ticketData.providerId ?? '') ||
                    sameProvinceId(p.id, ticketData.stationId ?? '')
            ) || activeProvinces[0];
            const ticketDateStr = ticketData.drawDate ? dayjs(ticketData.drawDate).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY');
            useCartStore.getState().addItem({
                id: String(ticketData.id || ticketData._id),
                province: activeProv?.name || 'Nhà đài',
                provinceIcon: activeProv?.icon,
                date: ticketDateStr,
                time: activeProv?.time || '--:--',
                kyHieu: ticketData.batchCode || "2K2",
                numbers: num,
                price: pricePerTicket,
                quantity: ticketQuantity,
                color: "#f59e0b",
                ticketImg: ticketData.ticketImg,
                maxStock: maxAvailableQty
            });
        });

        if (hasError) return false;
        toast.success(`Đã thêm ${totalQuantity} vé vào giỏ hàng`);
        return true;
    };

    const handleCheckout = () => {
        if (selectedProvinces.length === 0 || selectedNumbers.length === 0) {
            toast.warning('Vui lòng chọn đài và ít nhất 1 vé số!');
            return;
        }
        useCartStore.getState().clearCart();
        if (addToCart()) {
            navigate('/checkout');
        }
    };

    return (
        <div
            className="min-h-screen font-client-main flex flex-col bg-fixed bg-cover bg-center"
            style={{ backgroundImage: 'url("https://i.ibb.co/BVFGYpL1/86f05f70-fcf8-445f-978e-a0539eb2f0de.png")' }}
        >
            <Header />

            <main className="flex-1 w-full mt-[70px] lg:mt-[80px] max-w-[1440px] mx-auto px-4 lg:px-8 py-6 flex flex-col">
                <div className="flex flex-col xl:flex-row gap-5 flex-1 items-stretch">

                    {/* Left Banners Sidebar - New addition based on design */}
                    <BannerSection />

                    {/* Main Content - Center Column */}
                    <div className="flex-1 w-full flex flex-col min-w-0">

                        {/* Top Selectors Card (Ngày & Đài) */}
                        <div ref={selectorsRef} className="bg-white rounded-[20px] shadow-sm border border-[#E5E8EB] grid grid-cols-1 md:grid-cols-2 mb-5 shrink-0">

                            {/* Ngày Quay */}
                            <div className="relative p-4 lg:p-5 cursor-pointer hover:bg-gray-50 transition-colors rounded-l-[20px] border-r border-[#E5E8EB]" onClick={() => { setIsDateOpen(!isDateOpen); setIsProvinceOpen(false); }}>
                                <div className="flex gap-4 items-center">
                                    <div className="text-[#ee1314] shrink-0">
                                        <CalendarIcon size={28} strokeWidth={2} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[12px] text-[#637381] font-bold uppercase tracking-wider mb-1">Ngày quay</div>
                                        <div className="flex items-center justify-between">
                                            <div className="font-bold text-[14px] text-[#212B36]">
                                                {selectedDates.length === 0
                                                    ? 'Vui lòng chọn'
                                                    : selectedDates.length > 1
                                                      ? selectedDates.every((d) => d === 'today' || d === 'tomorrow')
                                                          ? 'Hôm nay, Ngày mai'
                                                          : `${selectedDates.length} ngày`
                                                      : selectedDates[0] === 'today'
                                                        ? 'Hôm nay'
                                                        : selectedDates[0] === 'tomorrow'
                                                          ? 'Ngày mai'
                                                          : dayjs(resolveDrawDateToken(selectedDates[0])).format('DD/MM/YYYY')}
                                            </div>
                                            {isDateOpen ? <ChevronUp size={20} className="text-[#212B36]" /> : <ChevronDown size={20} className="text-[#212B36]" />}
                                        </div>
                                        <div className="text-[13px] text-[#637381] mt-0.5">
                                            {selectedDates.length === 0
                                                ? '---'
                                                : selectedDates
                                                      .map((token) => formatViWeekdayLabel(resolveDrawDateToken(token)))
                                                      .join(', ')}
                                        </div>
                                    </div>
                                </div>

                                {/* Dropdown menu */}
                                {isDateOpen && (
                                    <div className="absolute top-[105%] left-0 right-0 bg-white border border-[#E5E8EB] shadow-lg rounded-xl z-20 overflow-hidden p-2">
                                        <div
                                            className={`p-3 rounded-lg flex justify-between items-center ${
                                                todaySellClosed
                                                    ? 'opacity-50 cursor-not-allowed'
                                                    : selectedDates.includes('today')
                                                      ? 'bg-[#FFF4F4] cursor-pointer'
                                                      : 'hover:bg-gray-50 cursor-pointer'
                                            }`}
                                            onClick={(e) => { 
                                                e.stopPropagation();
                                                if (todaySellClosed) {
                                                    toast.info(`Đã qua giờ xổ (${effectiveDrawTime}). Chỉ còn bán vé ngày mai.`);
                                                    return;
                                                }
                                                if (selectedDates.includes('today') && selectedDates.length === 1) {
                                                    return;
                                                }
                                                if (selectedDates.includes('today')) {
                                                    setSelectedDates(selectedDates.filter(d => d !== 'today'));
                                                } else {
                                                    // Leaving a chat deep-link custom date when picking tonight's draw
                                                    setSelectedDates([
                                                        ...selectedDates.filter((d) => d === 'tomorrow'),
                                                        'today',
                                                    ]);
                                                }
                                            }}
                                        >
                                            <div>
                                                <div className={`font-bold ${selectedDates.includes('today') ? 'text-[#ee1314]' : 'text-[#212B36]'}`}>Hôm nay</div>
                                                <div className="text-[14px] text-[#637381]">{dayjs().locale('vi').format('DD/MM/YYYY (dddd)').replace(/t/g, 'T').replace('Thứ', 'Thứ').replace('chủ', 'Chủ')}</div>
                                                {todaySellClosed && (
                                                    <div className="text-[12px] text-[#ee1314] mt-0.5">Đã hết giờ bán (sau {effectiveDrawTime})</div>
                                                )}
                                            </div>
                                            <div className="mt-0.5">
                                                {selectedDates.includes('today') ? (
                                                    <div className="w-4 h-4 rounded-[4px] bg-[#ee1314] text-white flex items-center justify-center">
                                                        <i className="fa-solid fa-check text-[12px]"></i>
                                                    </div>
                                                ) : (
                                                    <div className="w-4 h-4 rounded-[4px] border border-[#C4CDD5] bg-white"></div>
                                                )}
                                            </div>
                                        </div>
                                        {/* Date separator */}
                                        <div className="h-[1px] bg-[#E5E8EB] my-1 mx-3"></div>
                                        <div
                                            className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${selectedDates.includes('tomorrow') ? 'bg-[#FFF4F4]' : 'hover:bg-gray-50'}`}
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                if (selectedDates.includes('tomorrow') && selectedDates.length === 1) {
                                                    return;
                                                }
                                                if (selectedDates.includes('tomorrow')) {
                                                    setSelectedDates(selectedDates.filter(d => d !== 'tomorrow'));
                                                } else {
                                                    setSelectedDates([
                                                        ...(todaySellClosed
                                                            ? []
                                                            : selectedDates.filter((d) => d === 'today')),
                                                        'tomorrow',
                                                    ]);
                                                }
                                            }}
                                        >
                                            <div>
                                                <div className={`font-bold ${selectedDates.includes('tomorrow') ? 'text-[#ee1314]' : 'text-[#212B36]'}`}>Ngày mai</div>
                                                <div className="text-[14px] text-[#637381]">{dayjs().add(1, 'day').locale('vi').format('DD/MM/YYYY (dddd)').replace(/t/g, 'T').replace('Thứ', 'Thứ').replace('chủ', 'Chủ')}</div>
                                            </div>
                                            <div className="mt-0.5">
                                                {selectedDates.includes('tomorrow') ? (
                                                    <div className="w-4 h-4 rounded-[4px] bg-[#ee1314] text-white flex items-center justify-center">
                                                        <i className="fa-solid fa-check text-[12px]"></i>
                                                    </div>
                                                ) : (
                                                    <div className="w-4 h-4 rounded-[4px] border border-[#C4CDD5] bg-white"></div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Chọn Đài */}
                            <div className="relative p-4 lg:p-5 cursor-pointer hover:bg-gray-50 transition-colors rounded-r-[20px]" onClick={() => { setIsProvinceOpen(!isProvinceOpen); setIsDateOpen(false); }}>
                                <div className="flex gap-4 items-center">
                                    <div className="shrink-0">
                                        {activeProvinces.length > 0 ? (
                                            <div className="w-[40px] h-[40px] rounded-full border border-[#E5E8EB] overflow-hidden flex items-center justify-center p-[2px] bg-white">
                                                <img src={activeProvinces[0]?.icon} alt="" className="w-full h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="w-[40px] h-[40px] rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                                <i className="fa-solid fa-building text-[14px]"></i>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[12px] text-[#637381] font-bold uppercase tracking-wider mb-1">Chọn đài</div>
                                        <div className="flex items-center justify-between">
                                            <div className="font-bold text-[14px] text-[#212B36] truncate max-w-[150px] sm:max-w-[200px]">
                                                {isAllProvincesSelected
                                                    ? 'Tất cả đài miền Nam'
                                                    : activeProvinces.length > 1
                                                      ? `Đã chọn ${activeProvinces.length} đài`
                                                      : activeProvinces.length === 1
                                                        ? (activeProvinces[0].name || 'Đang tải đài...')
                                                        : 'Vui lòng chọn đài'}
                                            </div>
                                            <div className={`${isProvinceOpen ? 'border border-[#ee1314] rounded text-[#ee1314] w-6 h-6 flex items-center justify-center' : 'text-[#212B36]'}`}>
                                                {isProvinceOpen ? <ChevronDown size={16} /> : <ChevronDown size={20} />}
                                            </div>
                                        </div>
                                        <div className="text-[13px] text-[#212B36] font-medium mt-0.5">
                                            {activeProvinces.length === 1
                                                ? (activeProvinces[0].time || '---')
                                                : activeProvinces.length > 1
                                                  ? 'Các đài miền Nam'
                                                  : '---'}
                                        </div>
                                    </div>
                                </div>

                                {/* Dropdown menu */}
                                {isProvinceOpen && (
                                    <div className="absolute top-[105%] left-0 right-0 bg-white border border-[#E5E8EB] shadow-lg rounded-xl z-20 max-h-[350px] overflow-y-auto p-2">
                                        {isLoadingProviders ? (
                                            <div className="p-4 text-center text-[#637381]">Đang tải...</div>
                                        ) : (
                                        <>
                                        <div
                                            className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${isAllProvincesSelected ? 'bg-[#FFF4F4]' : 'hover:bg-gray-50'}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedProvinces(allProvinceIds);
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-[36px] h-[36px] rounded-full border border-[#E5E8EB] bg-gray-50 flex items-center justify-center text-[#637381]">
                                                    <i className="fa-solid fa-building text-[14px]"></i>
                                                </div>
                                                <div>
                                                    <div className={`font-bold ${isAllProvincesSelected ? 'text-[#ee1314]' : 'text-[#212B36]'}`}>Tất cả các đài</div>
                                                    <div className={`text-[14px] ${isAllProvincesSelected ? 'text-[#ee1314]' : 'text-[#637381]'}`}>Hiện vé của mọi đài</div>
                                                </div>
                                            </div>
                                            <div>
                                                {isAllProvincesSelected ? (
                                                    <div className="w-4 h-4 rounded-[4px] bg-[#ee1314] text-white flex items-center justify-center">
                                                        <i className="fa-solid fa-check text-[12px]"></i>
                                                    </div>
                                                ) : (
                                                    <div className="w-4 h-4 rounded-[4px] border border-[#C4CDD5] bg-white"></div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="h-[1px] bg-[#E5E8EB] my-1 mx-3"></div>
                                        {dynamicProvinces.map((prov: any, index: number) => {
                                            const isProvSelected = selectedProvinces.some((id) =>
                                                sameProvinceId(id, prov.id)
                                            );
                                            return (
                                                <div key={prov.id}>
                                                    <div
                                                        className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${isProvSelected ? 'bg-[#FFF4F4]' : 'hover:bg-gray-50'}`}
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            // Default is "all stations"; first click narrows to that station only
                                                            if (isAllProvincesSelected) {
                                                                setSelectedProvinces([String(prov.id)]);
                                                                return;
                                                            }
                                                            if (isProvSelected) {
                                                                const next = selectedProvinces.filter(
                                                                    (p) => !sameProvinceId(p, prov.id)
                                                                );
                                                                // Empty selection is not allowed - go back to all stations
                                                                setSelectedProvinces(next.length === 0 ? allProvinceIds : next);
                                                            } else {
                                                                setSelectedProvinces([
                                                                    ...selectedProvinces,
                                                                    String(prov.id),
                                                                ]);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-[36px] h-[36px] rounded-full border border-[#E5E8EB] overflow-hidden flex items-center justify-center p-[2px] bg-white">
                                                                <img src={prov.icon} alt="" className="w-full h-full object-contain" />
                                                            </div>
                                                            <div>
                                                                <div className={`font-bold ${isProvSelected ? 'text-[#ee1314]' : 'text-[#212B36]'}`}>{prov.name}</div>
                                                                <div className={`text-[14px] ${isProvSelected ? 'text-[#ee1314]' : 'text-[#637381]'}`}>{prov.time}</div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            {isProvSelected ? (
                                                                <div className="w-4 h-4 rounded-[4px] bg-[#ee1314] text-white flex items-center justify-center">
                                                                    <i className="fa-solid fa-check text-[12px]"></i>
                                                                </div>
                                                            ) : (
                                                                <div className="w-4 h-4 rounded-[4px] border border-[#C4CDD5] bg-white"></div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {index < dynamicProvinces.length - 1 && <div className="h-[1px] bg-[#E5E8EB] my-1 mx-3"></div>}
                                                </div>
                                            );
                                        })}
                                        </>
                                        )}
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Bottom Main Content Card (Tickets List) */}
                        <div className="bg-white rounded-[20px] shadow-sm border border-[#E5E8EB] flex flex-col flex-1 min-h-0 overflow-hidden">
                            {/* Search and Filter */}
                            <div className={`relative p-4 lg:p-5 border-b border-[#E5E8EB] shrink-0 ${isFilterOpen ? 'z-40' : 'z-10'}`} ref={filterRef}>
                                <div className="flex flex-col md:flex-row gap-4 items-center">
                                    <div className="flex-1 w-full flex items-center bg-white rounded-xl border border-[#E5E8EB] px-4 py-2.5">
                                        <i className="fa-solid fa-magnifying-glass text-[#637381] mr-3"></i>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={ticketSearchInput}
                                            onChange={(e) => setTicketSearchInput(normalizeTicketSearchDigits(e.target.value, 6))}
                                            placeholder="Tìm số (VD: 12345, 68686...)"
                                            className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#212B36] placeholder:text-[#919EAB]"
                                        />
                                        {ticketSearchInput && (
                                            <button
                                                type="button"
                                                onClick={() => { setTicketSearchInput(''); setAppliedSearch(''); }}
                                                className="text-[#919EAB] hover:text-[#ee1314] ml-2"
                                                aria-label="Xóa tìm kiếm"
                                            >
                                                <i className="fa-solid fa-xmark"></i>
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={openFilterPanel}
                                        className={`flex items-center gap-2 border rounded-xl px-5 py-2.5 bg-white font-medium hover:bg-gray-50 transition-colors w-full md:w-auto justify-center text-[14px] shrink-0 ${isFilterOpen || activeFilterCount > 0 ? 'border-[#ee1314] text-[#ee1314]' : 'border-[#E5E8EB] text-[#212B36]'}`}
                                    >
                                        <Filter size={18} className={isFilterOpen || activeFilterCount > 0 ? 'text-[#ee1314]' : 'text-[#637381]'} />
                                        Lọc dãy số
                                        {activeFilterCount > 0 && (
                                            <span className="ml-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[#ee1314] text-white text-[11px] font-bold flex items-center justify-center">
                                                {activeFilterCount}
                                            </span>
                                        )}
                                        <ChevronDown size={16} className={`ml-1 ${isFilterOpen ? 'text-[#ee1314]' : 'text-[#637381]'}`} />
                                    </button>
                                </div>

                                {isFilterOpen && (
                                    <div className="absolute left-4 right-4 lg:left-5 lg:right-5 top-full mt-2 max-h-[min(70vh,520px)] bg-white rounded-2xl shadow-[0_16px_48px_rgba(33,43,54,0.16)] border border-[#E5E8EB] z-50 flex flex-col overflow-hidden">
                                            <div className="flex flex-1 min-h-0 overflow-hidden">
                                                {/* Left Sidebar */}
                                                <div className="w-[220px] min-w-[220px] border-r border-[#E2E8F0] flex flex-col p-3.5 bg-[#F8FAFC] gap-1.5 select-none">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFilterActiveTab('all')}
                                                        className={`flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-200 text-left w-full ${
                                                            filterActiveTab === 'all'
                                                                ? 'bg-white text-[#ee1314] font-extrabold shadow-xs border border-[#ee1314]/20'
                                                                : 'text-[#64748B] hover:bg-white/70 hover:text-[#0F172A] font-semibold'
                                                        }`}
                                                    >
                                                        <LayoutGrid size={18} className={filterActiveTab === 'all' ? 'text-[#ee1314]' : 'text-[#64748B]'} />
                                                        <span className="text-[13.5px]">Tất cả dãy số</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFilterActiveTab('favorites')}
                                                        className={`flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-200 text-left w-full ${
                                                            filterActiveTab === 'favorites'
                                                                ? 'bg-white text-[#ee1314] font-extrabold shadow-xs border border-[#ee1314]/20'
                                                                : 'text-[#64748B] hover:bg-white/70 hover:text-[#0F172A] font-semibold'
                                                        }`}
                                                    >
                                                        <Heart size={18} className={filterActiveTab === 'favorites' ? 'text-[#ee1314]' : 'text-[#64748B]'} />
                                                        <span className="text-[13.5px]">Dãy số yêu thích</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFilterActiveTab('range')}
                                                        className={`flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-200 text-left w-full ${
                                                            filterActiveTab === 'range'
                                                                ? 'bg-white text-[#ee1314] font-extrabold shadow-xs border border-[#ee1314]/20'
                                                                : 'text-[#64748B] hover:bg-white/70 hover:text-[#0F172A] font-semibold'
                                                        }`}
                                                    >
                                                        <SlidersHorizontal size={18} className={filterActiveTab === 'range' ? 'text-[#ee1314]' : 'text-[#64748B]'} />
                                                        <span className="text-[13.5px]">Lọc theo khoảng số</span>
                                                    </button>
                                                </div>

                                                {/* Right Content */}
                                                <div className="flex-1 p-6 flex flex-col bg-white min-w-0 max-h-[420px] overflow-y-auto">
                                                    {filterActiveTab === 'favorites' && (
                                                        <div className="animate-in fade-in slide-in-from-right-4 duration-200 space-y-6">
                                                            <div>
                                                                <h4 className="font-extrabold text-[15px] text-[#0F172A] tracking-tight mb-1">DÃY SỐ YÊU THÍCH</h4>
                                                                <p className="text-[13px] text-[#64748B]">Chọn nhanh các dãy số bạn đã lưu để lọc vé phù hợp.</p>
                                                            </div>

                                                            {/* Add favorite number input */}
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-1 flex items-center bg-white rounded-xl border border-[#E2E8F0] focus-within:border-[#ee1314] focus-within:ring-2 focus-within:ring-[#ee1314]/10 px-3.5 h-11 shadow-xs transition-all">
                                                                    <Search size={17} className="text-[#94A3B8] mr-2 shrink-0" />
                                                                    <input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        value={favoriteDraftInput}
                                                                        onChange={(e) => setFavoriteDraftInput(normalizeTicketSearchDigits(e.target.value, 6))}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                e.preventDefault();
                                                                                addFavoriteNumber(favoriteDraftInput);
                                                                            }
                                                                        }}
                                                                        placeholder="Nhập dãy số yêu thích (VD: 68, 888...)"
                                                                        className="flex-1 bg-transparent border-none outline-none text-[14px] text-[#0F172A] font-bold placeholder:font-normal placeholder:text-[#94A3B8]"
                                                                    />
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addFavoriteNumber(favoriteDraftInput)}
                                                                    className="h-11 px-4 rounded-xl border border-[#ee1314] text-[#ee1314] hover:bg-[#ee1314] hover:text-white text-[13.5px] font-bold bg-white flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
                                                                >
                                                                    <i className="fa-solid fa-plus text-[12px]"></i> Thêm dãy số
                                                                </button>
                                                            </div>

                                                            {/* Saved Favorite Numbers */}
                                                            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4">
                                                                <div className="text-[12.5px] font-extrabold text-[#475569] uppercase tracking-wider mb-3 flex items-center gap-2">
                                                                    <span className="w-2 h-2 rounded-full bg-[#ee1314]"></span>
                                                                    Dãy số đã lưu ({favoriteNumbers.length})
                                                                </div>
                                                                <div className="flex flex-wrap gap-2.5 items-center">
                                                                    {favoriteNumbers.length === 0 ? (
                                                                        <p className="text-[13px] text-[#94A3B8] italic">Chưa có dãy yêu thích. Thêm hoặc chọn từ gợi ý bên dưới.</p>
                                                                    ) : (
                                                                        favoriteNumbers.map((num) => {
                                                                            const selected = draftSelectedFavorites.includes(num);
                                                                            return (
                                                                                <div
                                                                                    key={num}
                                                                                    onClick={() => toggleDraftFavorite(num)}
                                                                                    className={`h-9 px-3.5 rounded-full border text-[13.5px] font-extrabold flex items-center justify-between gap-2.5 cursor-pointer transition-all duration-150 select-none shadow-xs ${
                                                                                        selected
                                                                                            ? 'border-[#ee1314] bg-[#ee1314] text-white shadow-sm shadow-[#ee1314]/25 scale-[1.02]'
                                                                                            : 'border-[#E2E8F0] text-[#1E293B] bg-white hover:border-[#ee1314]/50'
                                                                                    }`}
                                                                                >
                                                                                    <span>{num}</span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            removeFavoriteNumber(num);
                                                                                        }}
                                                                                        className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                                                                                            selected ? 'hover:bg-white/20 text-white' : 'hover:bg-[#E2E8F0] text-[#94A3B8] hover:text-[#ee1314]'
                                                                                        }`}
                                                                                    >
                                                                                        <i className="fa-solid fa-xmark text-[11px]"></i>
                                                                                    </button>
                                                                                </div>
                                                                            );
                                                                        })
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Number Suggestions */}
                                                            <div>
                                                                <div className="text-[12.5px] font-extrabold text-[#475569] uppercase tracking-wider mb-3 flex items-center gap-2">
                                                                    <span className="w-2 h-2 rounded-full bg-[#ee1314]"></span>
                                                                    Gợi ý dãy số hot
                                                                </div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '111', '222', '333', '444', '555', '666', '777', '000'].map((num) => (
                                                                        <button
                                                                            type="button"
                                                                            key={`s-${num}`}
                                                                            onClick={() => addFavoriteNumber(num)}
                                                                            className="h-9 px-3.5 rounded-xl border border-[#E2E8F0] text-[#334155] hover:text-[#ee1314] hover:border-[#ee1314]/40 hover:bg-[#FFF4F4] text-[13.5px] font-bold bg-[#F8FAFC] flex items-center justify-center cursor-pointer transition-all shadow-xs active:scale-95"
                                                                        >
                                                                            {num}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {filterActiveTab === 'range' && (
                                                        <div className="animate-in fade-in slide-in-from-right-4 duration-200 space-y-6">
                                                            <div>
                                                                <h4 className="font-extrabold text-[15px] text-[#0F172A] tracking-tight mb-1">LỌC THEO KHOẢNG SỐ</h4>
                                                                <p className="text-[13px] text-[#64748B]">Chọn nhanh các khoảng số đuôi để lọc vé phù hợp.</p>
                                                            </div>

                                                            {/* Preset Tail Ranges - Modern Chip Selector */}
                                                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                                                {PRESET_TAIL_RANGES.map((apiRange) => {
                                                                    const label = toUiTailRangeLabel(apiRange);
                                                                    const isChecked = draftRanges.includes(label);
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            key={apiRange}
                                                                            onClick={() => toggleDraftRange(label)}
                                                                            className={`relative h-11 px-2 rounded-xl font-bold text-[13px] flex items-center justify-center cursor-pointer transition-all duration-200 select-none whitespace-nowrap ${
                                                                                isChecked
                                                                                    ? 'bg-[#ee1314] text-white shadow-md shadow-[#ee1314]/25 border border-[#ee1314] scale-[1.02]'
                                                                                    : 'bg-white text-[#334155] border border-[#E2E8F0] hover:border-[#ee1314]/50 hover:bg-[#FFF4F4]/50 hover:text-[#ee1314]'
                                                                            }`}
                                                                        >
                                                                            {isChecked && (
                                                                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-[#ee1314] border border-[#ee1314]/20 flex items-center justify-center shadow-xs">
                                                                                    <i className="fa-solid fa-check text-[9px] font-black"></i>
                                                                                </span>
                                                                            )}
                                                                            <span className="whitespace-nowrap tracking-tight">{label}</span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Special Number Types */}
                                                            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4">
                                                                <div className="text-[12.5px] font-extrabold text-[#475569] uppercase tracking-wider mb-3 flex items-center gap-2">
                                                                    <span className="w-2 h-2 rounded-full bg-[#ee1314]"></span>
                                                                    Tùy chọn đặc biệt
                                                                </div>
                                                                <div className="flex flex-wrap gap-2.5">
                                                                    {([
                                                                        { label: 'Số kép (00, 11...)', value: 'DOUBLE' as NumberTypeValue, icon: 'fa-clone' },
                                                                        { label: 'Số tiến (12, 34...)', value: 'SEQUENTIAL' as NumberTypeValue, icon: 'fa-arrow-trend-up' },
                                                                        { label: 'Số lặp (1212...)', value: 'REPEATING' as NumberTypeValue, icon: 'fa-rotate' },
                                                                    ]).map((opt) => {
                                                                        const checked = draftNumberTypes.includes(opt.value);
                                                                        return (
                                                                            <button
                                                                                type="button"
                                                                                key={opt.value}
                                                                                onClick={() => toggleDraftNumberType(opt.value)}
                                                                                className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                                                                                    checked
                                                                                        ? 'bg-[#ee1314] text-white shadow-sm border border-[#ee1314]'
                                                                                        : 'bg-white text-[#334155] border border-[#E2E8F0] hover:border-[#ee1314]/40 hover:text-[#ee1314]'
                                                                                }`}
                                                                            >
                                                                                <i className={`fa-solid ${opt.icon} text-[12px] ${checked ? 'text-white' : 'text-[#ee1314]'}`}></i>
                                                                                <span>{opt.label}</span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>

                                                            {/* Custom Range Input */}
                                                            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4">
                                                                <div className="text-[12.5px] font-extrabold text-[#475569] uppercase tracking-wider mb-3 flex items-center gap-2">
                                                                    <span className="w-2 h-2 rounded-full bg-[#ee1314]"></span>
                                                                    Thêm khoảng số tùy chỉnh
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-3">
                                                                    <div className="flex items-center bg-white border border-[#E2E8F0] focus-within:border-[#ee1314] focus-within:ring-2 focus-within:ring-[#ee1314]/10 rounded-xl h-10 px-3.5 shadow-xs transition-all flex-1 min-w-[130px]">
                                                                        <span className="text-[#64748B] text-[13px] font-medium mr-2 shrink-0">Từ số</span>
                                                                        <input
                                                                            type="text"
                                                                            inputMode="numeric"
                                                                            value={customRangeFrom}
                                                                            onChange={(e) => setCustomRangeFrom(normalizeTicketSearchDigits(e.target.value, 2))}
                                                                            placeholder="00"
                                                                            className="w-full bg-transparent border-none outline-none text-[14px] text-[#0F172A] font-bold text-center"
                                                                        />
                                                                    </div>
                                                                    <span className="text-[#94A3B8] font-bold">-</span>
                                                                    <div className="flex items-center bg-white border border-[#E2E8F0] focus-within:border-[#ee1314] focus-within:ring-2 focus-within:ring-[#ee1314]/10 rounded-xl h-10 px-3.5 shadow-xs transition-all flex-1 min-w-[130px]">
                                                                        <span className="text-[#64748B] text-[13px] font-medium mr-2 shrink-0">Đến số</span>
                                                                        <input
                                                                            type="text"
                                                                            inputMode="numeric"
                                                                            value={customRangeTo}
                                                                            onChange={(e) => setCustomRangeTo(normalizeTicketSearchDigits(e.target.value, 2))}
                                                                            placeholder="99"
                                                                            className="w-full bg-transparent border-none outline-none text-[14px] text-[#0F172A] font-bold text-center"
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={addCustomRange}
                                                                        className="h-10 px-4 rounded-xl bg-white border border-[#ee1314] text-[#ee1314] hover:bg-[#ee1314] hover:text-white text-[13.5px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
                                                                    >
                                                                        <i className="fa-solid fa-plus text-[12px]"></i>
                                                                        Thêm khoảng
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Selected Ranges Chips */}
                                                            <div>
                                                                <div className="text-[12.5px] font-extrabold text-[#475569] uppercase tracking-wider mb-2.5 flex items-center justify-between">
                                                                    <span>Khoảng đã chọn</span>
                                                                    <span className="px-2.5 py-0.5 rounded-full bg-[#FFF4F4] text-[#ee1314] text-[12px] font-bold">{draftRanges.length}</span>
                                                                </div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {draftRanges.length === 0 ? (
                                                                        <p className="text-[13px] text-[#94A3B8] italic">Chưa chọn khoảng nào</p>
                                                                    ) : (
                                                                        draftRanges.map((range) => (
                                                                            <div key={range} className="h-8 px-3 rounded-full border border-[#FECDD3] bg-[#FFF4F4] text-[#ee1314] text-[13px] font-bold flex items-center gap-2 shadow-xs">
                                                                                <span>{range}</span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => toggleDraftRange(range)}
                                                                                    className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-[#ee1314] hover:text-white transition-colors"
                                                                                >
                                                                                    <i className="fa-solid fa-xmark text-[11px]"></i>
                                                                                </button>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {filterActiveTab === 'all' && (
                                                        <div className="animate-in fade-in slide-in-from-right-4 duration-200 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <h4 className="font-extrabold text-[15px] text-[#0F172A] tracking-tight mb-1">TẤT CẢ DÃY SỐ</h4>
                                                                    <p className="text-[13px] text-[#64748B]">
                                                                        {hasActiveTicketFilters(appliedFilters) || appliedSearch
                                                                            ? 'Đang lọc. Bấm “Xóa bộ lọc” để hiện lại toàn bộ vé đang bán.'
                                                                            : 'Hiển thị toàn bộ các dãy số có sẵn của đài đang chọn.'}
                                                                    </p>
                                                                </div>
                                                                <span className="px-3 py-1 rounded-full bg-[#FFF4F4] text-[#ee1314] border border-[#FECDD3] text-[12px] font-extrabold shrink-0">
                                                                    {availableTickets.length} dãy số
                                                                </span>
                                                            </div>

                                                            {availableTickets.length === 0 ? (
                                                                <div className="text-center py-12 text-[#94A3B8] border border-dashed border-[#CBD5E1] rounded-2xl bg-[#F8FAFC]">
                                                                    <i className="fa-solid fa-ticket-simple text-[24px] text-[#CBD5E1] mb-2 block"></i>
                                                                    <p className="font-semibold text-[13.5px]">Chưa có vé số cho bộ lọc / đài hiện tại</p>
                                                                </div>
                                                            ) : (
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                                                                    {availableTickets.map((ticket: any) => {
                                                                        const isSelected = appliedSearch && String(ticket.numbers) === appliedSearch;
                                                                        return (
                                                                            <button
                                                                                type="button"
                                                                                key={ticket.id ?? ticket._id ?? ticket.numbers}
                                                                                onClick={() => {
                                                                                    setTicketSearchInput(String(ticket.numbers || ''));
                                                                                    setAppliedSearch(normalizeTicketSearchDigits(String(ticket.numbers || ''), 6));
                                                                                    setIsFilterOpen(false);
                                                                                }}
                                                                                className={`h-11 px-3 rounded-xl border text-[14px] font-black tracking-wider flex items-center justify-center transition-all duration-200 shadow-xs cursor-pointer active:scale-95 ${
                                                                                    isSelected
                                                                                        ? 'bg-[#ee1314] text-white border-[#ee1314] shadow-md shadow-[#ee1314]/25 scale-[1.02]'
                                                                                        : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:bg-[#ee1314] hover:text-white hover:border-[#ee1314] hover:shadow-md hover:shadow-[#ee1314]/20'
                                                                                }`}
                                                                            >
                                                                                {ticket.numbers}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="px-6 py-4 border-t border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
                                                <button
                                                    type="button"
                                                    onClick={clearTicketFilters}
                                                    className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] hover:text-[#ee1314] hover:border-[#ee1314]/30 hover:bg-[#FFF4F4] text-[13.5px] font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
                                                >
                                                    <Trash2 size={16} /> Xóa bộ lọc
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={applyTicketFilters}
                                                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ee1314] to-[#d11112] hover:from-[#d11112] hover:to-[#b80e0f] text-white text-[14px] font-bold shadow-md shadow-[#ee1314]/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                                                >
                                                    <Filter size={16} /> Áp dụng
                                                </button>
                                            </div>
                                    </div>
                                )}
                            </div>

                            {/* Ticket List Section */}
                            <div className="p-4 lg:p-5 flex-1 flex flex-col min-h-0 overflow-hidden rounded-b-[20px] relative z-0">
                                {/* Title */}
                                <h2 className="font-bold text-[14px] text-[#212B36] uppercase mb-5 shrink-0">
                                    DANH SÁCH VÉ SỐ - {activeProvinces.length > 1 ? 'CÁC ĐÀI MIỀN NAM' : (activeProvinces.length === 1 ? activeProvinces[0].name?.toUpperCase() : 'CHƯA CHỌN ĐÀI')} - {activeProvinces.length > 0 ? (activeProvinces.length === 1 ? activeProvinces[0].time : '16:15') : '--:--'} - {selectedDates.length > 1 ? 'NHIỀU NGÀY' : (selectedDates[0] === 'today' ? 'HÔM NAY' : (selectedDates[0] === 'tomorrow' ? 'NGÀY MAI' : (selectedDates[0] ? dayjs(resolveDrawDateToken(selectedDates[0])).format('DD/MM/YYYY') : 'CHƯA CHỌN NGÀY')))}
                                </h2>

                                {/* Tickets Grid (4 columns) — scrollable */}
                                <div
                                    ref={ticketListRef}
                                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5 content-start flex-1 min-h-0 max-h-[560px] overflow-y-auto overscroll-contain pt-1 pb-2 pr-1 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#C4CDD5] hover:[&::-webkit-scrollbar-thumb]:bg-[#919EAB]"
                                >
                                    {activeProvinces.length === 0 ? (
                                        <div className="col-span-full py-10 flex justify-center text-[#637381] font-medium">
                                            Vui lòng chọn đài mở thưởng để xem vé
                                        </div>
                                    ) : isLoadingTickets ? (
                                        <div className="col-span-full py-10 flex justify-center text-[#637381] font-medium">
                                            <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải vé số...
                                        </div>
                                    ) : availableTickets.length > 0 ? (
                                        availableTickets.map((ticket: any, i: number) => {
                                            const num = ticket.numbers;
                                            const ticketKey = String(ticket.id ?? ticket._id ?? i);
                                            const isSelected = selectedNumbers.includes(num);
                                            const isDeepLinked =
                                                !!urlTicketId && String(ticket.id ?? ticket._id) === String(urlTicketId);
                                            const ticketImage = ticket.ticketImg;

                                            return (
                                                <div
                                                    key={ticketKey}
                                                    data-ticket-id={ticket.id ?? ticket._id}
                                                    onClick={() => toggleNumber(num)}
                                                    className={`relative border rounded-[20px] p-3 flex flex-col items-center cursor-pointer transition-shadow duration-200 hover:shadow-md
                                                        ${isSelected || isDeepLinked ? 'border-[#ee1314] bg-[#FFF4F4]/30' : 'border-[#E5E8EB] bg-white'}
                                                        ${isDeepLinked ? 'ring-2 ring-[#ee1314]/40' : ''}
                                                    `}
                                                >
                                                    {/* Image */}
                                                    <div className="w-full h-[75px] mb-3 flex justify-center items-center bg-[#FAFAFA] rounded-lg overflow-hidden">
                                                        {ticketImage ? (
                                                            <img
                                                                src={ticketImage}
                                                                alt={`Vé số ${num}`}
                                                                className="w-full max-h-full object-contain"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                                                                    if (fallback) fallback.classList.remove('hidden');
                                                                }}
                                                            />
                                                        ) : null}
                                                        <div className={`text-[#919EAB] text-[12px] font-medium ${ticketImage ? 'hidden' : ''}`}>
                                                            Vé số
                                                        </div>
                                                    </div>

                                                    {/* Number */}
                                                    <div className="font-black text-[20px] text-[#212B36] tracking-tight mb-1.5 leading-none">{num}</div>

                                                    {/* Price */}
                                                    <div className="font-bold text-[#ee1314] text-[14px]">{(ticket.price || 10000).toLocaleString('vi-VN')}đ</div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full py-10 flex flex-col items-center justify-center text-[#637381] gap-2">
                                            <i className="fa-solid fa-box-open text-3xl opacity-50"></i>
                                            <span>
                                                {appliedSearch || hasActiveTicketFilters(appliedFilters)
                                                    ? `Không tìm thấy vé khớp${appliedSearch ? ` “${appliedSearch}”` : ''} với bộ lọc hiện tại.`
                                                    : 'Không có vé số nào cho đài này.'}
                                            </span>
                                            {(appliedSearch || hasActiveTicketFilters(appliedFilters)) && (
                                                <button
                                                    type="button"
                                                    onClick={clearTicketFilters}
                                                    className="mt-2 text-[#ee1314] font-medium text-[14px] hover:underline"
                                                >
                                                    Xóa bộ lọc
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Sidebar - Checkout Summary */}
                    <div className="w-full xl:w-[360px] shrink-0 flex flex-col gap-4">
                        {/* Main Checkout Card */}
                        <div className="bg-white rounded-[20px] shadow-sm border border-[#E5E8EB] flex flex-col overflow-hidden mx-1">
                            {/* Red Header */}
                            <div className="bg-[#cc0000] text-white px-5 py-4 flex items-center">
                                <h3 className="font-bold text-[14px] uppercase">Chi tiết vé</h3>
                            </div>

                            <div className="p-5">
                                {/* Province Info */}
                                {selectedTicketProvinces.length > 0 && (
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-[50px] h-[50px] rounded-full bg-white flex items-center justify-center shadow-sm p-1.5 shrink-0 border border-[#E5E8EB]">
                                            {selectedTicketProvinces.length === 1 ? (
                                                <img src={selectedTicketProvinces[0].icon} alt={selectedTicketProvinces[0].name} className="w-full h-full object-contain" />
                                            ) : (
                                                <i className="fa-solid fa-building text-[#637381] text-2xl"></i>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-[14px] text-[#212B36] mb-1">Vé số {selectedTicketProvinces.length === 1 ? selectedTicketProvinces[0].name : 'Các đài miền Nam'}</div>
                                            <div className="text-[14px] text-[#637381]">Mở thưởng: {selectedTicketProvinces.length > 0 ? (selectedTicketProvinces.length === 1 ? selectedTicketProvinces[0].time : '16:15') : '--:--'} - {selectedDates.length > 1 ? 'Nhiều ngày' : (selectedDates[0] === 'today' ? 'Hôm nay' : (selectedDates[0] === 'tomorrow' ? 'Ngày mai' : (selectedDates[0] ? dayjs(resolveDrawDateToken(selectedDates[0])).format('DD/MM/YYYY') : '')))}</div>
                                            <div className="text-[14px] text-[#637381] mt-0.5">Ngày: {selectedDates.length > 1 ? 'Nhiều ngày' : (selectedDates[0] ? dayjs(resolveDrawDateToken(selectedDates[0])).format('DD/MM/YYYY') : '--/--/----')}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="border-t border-[#E5E8EB] -mx-5 mb-5"></div>

                                {/* Selected Numbers */}
                                <div className="flex justify-between items-start mb-5">
                                    <span className="text-[14px] font-bold text-[#212B36] uppercase mt-1.5 shrink-0">Dãy số đã chọn</span>
                                    {selectedNumbers.length > 0 ? (
                                        <div className="flex flex-wrap gap-2 justify-end pl-4">
                                            {selectedNumbers.map(num => (
                                                <div key={num} className="bg-[#FFF4F4] text-[#ee1314] px-2.5 py-1 rounded-lg text-[14px] font-bold tracking-[1px] border border-[#FFEBEE] shadow-sm">
                                                    {num}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-[14px] text-[#919EAB] italic mt-1.5">Trống</span>
                                    )}
                                </div>

                                {/* Quantity Selector */}
                                <div className="flex items-center justify-between mb-4 mt-2">
                                    <span className="text-[14px] text-[#637381]">Số lượng vé</span>
                                    <div className="flex items-center gap-2 bg-white rounded-lg border border-[#E5E8EB] p-1 h-9 w-[100px]">
                                        <button
                                            onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                                            disabled={ticketQuantity <= 1}
                                            className="flex-1 h-full flex items-center justify-center text-[#212B36] hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                        >
                                            <i className="fa-solid fa-minus text-[14px]"></i>
                                        </button>
                                        <span className="w-8 text-center text-[14px] font-bold text-[#212B36] border-x border-[#E5E8EB] h-full flex items-center justify-center">{ticketQuantity}</span>
                                        <button
                                            onClick={() => setTicketQuantity(Math.min(maxAvailable, ticketQuantity + 1))}
                                            disabled={ticketQuantity >= maxAvailable}
                                            className="flex-1 h-full flex items-center justify-center text-[#212B36] hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                        >
                                            <i className="fa-solid fa-plus text-[14px]"></i>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-[14px] text-[#637381]">Thành tiền</span>
                                    <span className="text-[#ee1314] font-bold text-[14px]">{(ticketQuantity * pricePerTicket).toLocaleString('vi-VN')}đ</span>
                                </div>

                                <div className="border-t border-dashed border-[#E5E8EB] -mx-5 mb-5"></div>

                                {/* Total & Action Bottom */}
                                <div className="flex justify-between items-center mb-6 pt-2">
                                    <span className="text-[14px] font-bold text-[#212B36] uppercase">Tổng thanh toán</span>
                                    <span className="text-[24px] font-black text-[#ee1314] leading-none">{totalAmount.toLocaleString('vi-VN')}đ</span>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={addToCart}
                                        disabled={totalQuantity === 0}
                                        className="w-full py-3.5 bg-[#ee1314] text-white font-bold rounded-xl text-[14px] hover:bg-[#d00f10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-[#ee1314]/20"
                                    >
                                        <i className="fa-solid fa-cart-shopping"></i> Thêm vào giỏ hàng
                                    </button>
                                    <button
                                        onClick={handleCheckout}
                                        disabled={totalQuantity === 0}
                                        className="w-full py-3.5 bg-white text-[#ee1314] font-bold rounded-xl border border-[#ee1314] text-[14px] hover:bg-[#FFF4F4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <i className="fa-solid fa-bolt"></i> Mua ngay
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Guide Section */}
                        <div className="bg-[#fafafa] rounded-[20px] p-5 mt-2 mx-1">
                            <div className="flex justify-between items-center mb-5">
                                <h4 className="font-bold text-[14px] uppercase text-[#212B36]">Hướng dẫn mua vé</h4>
                                <a href="#" className="text-[#637381] text-[14px] flex items-center gap-1 hover:text-[#ee1314]">Xem chi tiết <ChevronRight size={14} /></a>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center font-bold text-[14px] shrink-0">1</div>
                                    <div>
                                        <div className="font-bold text-[14px] text-[#212B36] mb-0.5">Chọn ngày quay</div>
                                        <div className="text-[13px] text-[#637381] leading-snug">Chọn ngày mở thưởng</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center font-bold text-[14px] shrink-0">2</div>
                                    <div>
                                        <div className="font-bold text-[14px] text-[#212B36] mb-0.5">Chọn đài</div>
                                        <div className="text-[13px] text-[#637381] leading-snug">Chọn tỉnh thành đài mở thưởng</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center font-bold text-[14px] shrink-0">3</div>
                                    <div>
                                        <div className="font-bold text-[14px] text-[#212B36] mb-0.5">Chọn số</div>
                                        <div className="text-[13px] text-[#637381] leading-snug">Chọn hoặc tạo dãy số bạn yêu thích</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center font-bold text-[14px] shrink-0">4</div>
                                    <div>
                                        <div className="font-bold text-[14px] text-[#212B36] mb-0.5">Thêm vào giỏ hàng</div>
                                        <div className="text-[13px] text-[#637381] leading-snug">Kiểm tra lại và tiến hành thanh toán</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </main>
        </div>
    );
};

