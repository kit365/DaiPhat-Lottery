import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '../../components/layout/header';
import { useStationsToday, useStationsTomorrow } from '../../../admin/features/station/hooks/useStation';
import { useLotteryTicketSearch } from '../../hooks/useLotteryTicketSearch';
import { usePurchasedTicketLookup } from '../../hooks/usePurchasedTicketLookup';
import { useAuthStore } from '../../../stores/useAuthStore';
import {
    AvailableTicketSearchForm,
    AvailableSearchFilters,
} from '../../components/ticket-search/AvailableTicketSearchForm';
import { AvailableTicketList } from '../../components/ticket-search/AvailableTicketList';
import {
    PurchasedTicketLookupForm,
    PurchasedSearchFilters,
} from '../../components/ticket-search/PurchasedTicketLookupForm';
import { PurchasedTicketList } from '../../components/ticket-search/PurchasedTicketList';
import { PublicLotteryTicket, PurchasedTicket, TicketSearchMode } from '../../../types/lottery-ticket.type';

type TabKey = 'available' | 'purchased';

export const TicketSearchPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { token, openLoginModal } = useAuthStore();

    const activeTab = (searchParams.get('tab') as TabKey) || 'available';
    const [availablePage, setAvailablePage] = useState(Number(searchParams.get('page') || 1));
    const [purchasedPage, setPurchasedPage] = useState(1);

    const [availableFilters, setAvailableFilters] = useState<AvailableSearchFilters>({
        search: searchParams.get('search') || '',
        searchMode: (searchParams.get('searchMode') as TicketSearchMode) || 'SUFFIX',
        drawDate: (searchParams.get('drawDate') as 'today' | 'tomorrow') || 'today',
        stationId: searchParams.get('stationId') || '',
        minPrice: searchParams.get('minPrice') || '',
        maxPrice: searchParams.get('maxPrice') || '',
    });

    const [purchasedFilters, setPurchasedFilters] = useState<PurchasedSearchFilters>({
        status: (searchParams.get('status') as PurchasedSearchFilters['status']) || '',
        fromDate: searchParams.get('fromDate') || '',
        toDate: searchParams.get('toDate') || '',
        ticketNumber: searchParams.get('ticketNumber') || '',
    });

    const { data: stationsToday } = useStationsToday();
    const { data: stationsTomorrow } = useStationsTomorrow();
    const stations = useMemo(() => {
        const source = availableFilters.drawDate === 'today' ? stationsToday : stationsTomorrow;
        return (source || []).map((s: any) => ({ id: s.id || s._id, name: s.name }));
    }, [availableFilters.drawDate, stationsToday, stationsTomorrow]);

    useEffect(() => {
        if (activeTab !== 'available') return;
        const params = new URLSearchParams();
        params.set('tab', 'available');
        if (availableFilters.search) params.set('search', availableFilters.search);
        if (availableFilters.searchMode) params.set('searchMode', availableFilters.searchMode);
        if (availableFilters.drawDate) params.set('drawDate', availableFilters.drawDate);
        if (availableFilters.stationId) params.set('stationId', availableFilters.stationId);
        if (availablePage > 1) params.set('page', String(availablePage));
        setSearchParams(params, { replace: true });
    }, [activeTab, availableFilters, availablePage, setSearchParams]);

    const { data: availableData, isLoading: loadingAvailable } = useLotteryTicketSearch(
        {
            page: availablePage,
            size: 20,
            stationId: availableFilters.stationId || undefined,
            drawDate: availableFilters.drawDate,
            search: availableFilters.search.trim() || undefined,
            searchMode: availableFilters.searchMode,
            minPrice: availableFilters.minPrice ? Number(availableFilters.minPrice) : undefined,
            maxPrice: availableFilters.maxPrice ? Number(availableFilters.maxPrice) : undefined,
        },
        {
            enabled: activeTab === 'available' && (availableFilters.search.trim().length >= 2 || !!availableFilters.stationId),
        }
    );

    const { data: purchasedData, isLoading: loadingPurchased } = usePurchasedTicketLookup(
        {
            page: purchasedPage,
            size: 20,
            status: purchasedFilters.status || undefined,
            fromDate: purchasedFilters.fromDate || undefined,
            toDate: purchasedFilters.toDate || undefined,
            ticketNumber: purchasedFilters.ticketNumber.trim() || undefined,
        },
        { enabled: activeTab === 'purchased' && !!token }
    );

    const availableTickets = (availableData?.data?.recordList ?? []) as PublicLotteryTicket[];
    const availablePagination = availableData?.data?.pagination;
    const purchasedTickets = (purchasedData?.data?.recordList ?? []) as PurchasedTicket[];
    const purchasedPagination = purchasedData?.data?.pagination;

    const switchTab = (tab: TabKey) => {
        if (tab === 'purchased' && !token) {
            openLoginModal();
            return;
        }
        const params = new URLSearchParams(searchParams);
        params.set('tab', tab);
        setSearchParams(params);
    };

    return (
        <div className="min-h-screen font-client-main bg-[#F4F6F8]">
            <Header />
            <main className="max-w-[1200px] mx-auto px-4 lg:px-6 py-24 lg:py-28">
                <div className="mb-6">
                    <Link to="/" className="text-[13px] text-[#637381] hover:text-[#ee1314]">← Trang chủ</Link>
                    <h1 className="text-[24px] font-black text-[#212B36] mt-2">Tra cứu & tìm kiếm vé</h1>
                </div>

                <div className="flex gap-2 mb-6">
                    <button
                        type="button"
                        onClick={() => switchTab('available')}
                        className={`px-5 py-2.5 rounded-xl text-[14px] font-bold ${activeTab === 'available' ? 'bg-[#ee1314] text-white' : 'bg-white text-[#637381] border border-[#E5E8EB]'}`}
                    >
                        Tìm vé đang bán
                    </button>
                    <button
                        type="button"
                        onClick={() => switchTab('purchased')}
                        className={`px-5 py-2.5 rounded-xl text-[14px] font-bold ${activeTab === 'purchased' ? 'bg-[#ee1314] text-white' : 'bg-white text-[#637381] border border-[#E5E8EB]'}`}
                    >
                        Vé đã mua
                    </button>
                </div>

                <div className="bg-white border border-[#E5E8EB] rounded-2xl shadow-sm p-5 lg:p-6 space-y-6">
                    {activeTab === 'available' ? (
                        <>
                            <AvailableTicketSearchForm
                                filters={availableFilters}
                                stations={stations}
                                onChange={(patch) => {
                                    setAvailablePage(1);
                                    setAvailableFilters((prev) => ({ ...prev, ...patch }));
                                }}
                            />
                            <AvailableTicketList
                                tickets={availableTickets}
                                isLoading={loadingAvailable}
                                drawDate={availableFilters.drawDate}
                                page={availablePage}
                                totalPages={availablePagination?.totalPages ?? 1}
                                onPageChange={setAvailablePage}
                            />
                        </>
                    ) : !token ? (
                        <div className="py-12 text-center">
                            <p className="text-[#637381] mb-4">Đăng nhập để tra cứu vé đã mua</p>
                            <button
                                type="button"
                                onClick={() => openLoginModal()}
                                className="px-6 py-2.5 bg-[#ee1314] text-white font-bold rounded-xl"
                            >
                                Đăng nhập
                            </button>
                        </div>
                    ) : (
                        <>
                            <PurchasedTicketLookupForm
                                filters={purchasedFilters}
                                onChange={(patch) => {
                                    setPurchasedPage(1);
                                    setPurchasedFilters((prev) => ({ ...prev, ...patch }));
                                }}
                            />
                            <PurchasedTicketList
                                tickets={purchasedTickets}
                                isLoading={loadingPurchased}
                                page={purchasedPage}
                                totalPages={purchasedPagination?.totalPages ?? 1}
                                onPageChange={setPurchasedPage}
                            />
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};
