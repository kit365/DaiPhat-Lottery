import { useParams, Link, useNavigate } from "react-router-dom";
import { useServiceDetail } from "../../hooks/useService";
import { ProductBanner } from "../product/sections/ProductBanner";
import { ProductGallery } from "../product/sections/ProductGallery";
import { ServiceDesc } from "./sections/ServiceDesc";
import { ServiceComment } from "./sections/ServiceComment";
import { ServiceRelated } from "./sections/ServiceRelated";
import { FooterSub } from "../../components/layouts/FooterSub";
import { Skeleton, Typography, Box, Tooltip } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock,
    X, Plus, Calendar
} from "lucide-react";
import StarIcon from "@mui/icons-material/Star";
import { useState, useMemo, useEffect } from "react";
import dayjs from "dayjs";
import { Icon } from "@iconify/react";
import { getAvailableTimeSlots } from "../../api/booking.api";
import { getMyPets } from "../../api/pet.api";
import { useAuthStore } from "../../../stores/useAuthStore";
import { toast } from "react-toastify";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { QuickAddPetModal } from "./sections/QuickAddPetModal";
import { useBookingStore } from "../../../stores/useBookingStore";

export const ServiceDetailPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { data: service, isLoading, error } = useServiceDetail(slug || "");
    const { setBookingData, selectedPets: selectedStorePets } = useBookingStore();

    // Trạng thái đặt lịch
    const [selectedDate, setSelectedDate] = useState<string>(dayjs().format("YYYY-MM-DD"));
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<any>(null);
    const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
    const [pets, setPets] = useState<any[]>([]);
    const [availableShifts, setAvailableShifts] = useState<any[]>([]);
    const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
    const [activeHour, setActiveHour] = useState<string | null>(null);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
    const [bookingPreview, setBookingPreview] = useState<any>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isQuickAddPetOpen, setIsQuickAddPetOpen] = useState(false);

    // Lấy danh sách thú cưng
    useEffect(() => {
        if (user) {
            getMyPets().then(res => setPets(res.data || []));
        }
    }, [user]);

    // Đồng bộ thú cưng đã chọn từ store khi component được gắn vào (mount)
    useEffect(() => {
        if (selectedStorePets.length > 0) {
            setSelectedPetIds(selectedStorePets.map(p => p._id));
        }
    }, [selectedStorePets]);

    // Lấy danh sách các khung giờ còn trống
    useEffect(() => {
        if (service && selectedDate) {
            setIsLoadingSlots(true);
            const petCount = selectedPetIds.length > 0 ? selectedPetIds.length : 1;
            getAvailableTimeSlots(selectedDate, service._id, petCount, selectedPetIds)
                .then(res => {
                    const shifts = res.data?.shifts || [];
                    setAvailableShifts(shifts);

                    // Reset selected slot if not found in any shift
                    if (selectedTimeSlot) {
                        const exists = shifts.some((shift: any) =>
                            shift.slots.some((s: any) => s.time === selectedTimeSlot.time)
                        );
                        if (!exists) {
                            setSelectedTimeSlot(null);
                            setBookingPreview(null);
                        }
                    }
                })
                .finally(() => setIsLoadingSlots(false));
        } else {
            setAvailableShifts([]);
        }
    }, [service, selectedDate, selectedPetIds]);

    const handlePetToggle = (petId: string) => {
        setSelectedPetIds(prev =>
            prev.includes(petId) ? prev.filter(id => id !== petId) : [...prev, petId]
        );
        setBookingPreview(null);
    };

    const filteredShifts = useMemo(() => {
        if (selectedDate !== dayjs().format("YYYY-MM-DD")) return availableShifts;
        return availableShifts.filter(shift => {
            const shiftEnd = dayjs(`${selectedDate} ${shift.endTime}`, "YYYY-MM-DD HH:mm");
            return shiftEnd.isAfter(dayjs());
        });
    }, [availableShifts, selectedDate]);

    const activeShift = useMemo(() => {
        if (activeShiftId) return availableShifts.find(s => s._id === activeShiftId);
        return filteredShifts[0] || null;
    }, [availableShifts, activeShiftId, filteredShifts]);

    const groupedSlots = useMemo(() => {
        const groups: Record<string, any[]> = {};
        if (!activeShift) return groups;

        activeShift.slots.forEach((slot: any) => {
            const hour = slot.time.split(":")[0];
            if (!groups[hour]) groups[hour] = [];
            groups[hour].push(slot);
        });
        return groups;
    }, [activeShift]);

    // Tự động chọn ca và giờ rảnh đầu tiên
    useEffect(() => {
        if (filteredShifts.length > 0) {
            if (!activeShiftId || !filteredShifts.find(s => s._id === activeShiftId)) {
                setActiveShiftId(filteredShifts[0]._id);
            }
        } else {
            setActiveShiftId(null);
        }
    }, [filteredShifts]);

    const filteredHours = useMemo(() => {
        const hours = Object.keys(groupedSlots).sort((a, b) => parseInt(a) - parseInt(b));
        if (selectedDate !== dayjs().format("YYYY-MM-DD")) return hours;

        return hours.filter(hour => {
            const hInt = parseInt(hour);
            const currentHour = dayjs().hour();
            if (hInt > currentHour) return true;
            if (hInt < currentHour) return false;
            // Nếu cùng giờ, kiểm tra xem còn phút nào trong tương lai không
            return groupedSlots[hour].some(slot => {
                const m = slot.time.split(":")[1];
                return dayjs(`${selectedDate} ${hour}:${m}`, "YYYY-MM-DD H:mm").isAfter(dayjs());
            });
        });
    }, [groupedSlots, selectedDate]);

    useEffect(() => {
        if (filteredHours.length > 0 && (!activeHour || !filteredHours.includes(activeHour))) {
            setActiveHour(filteredHours[0]);
        } else if (filteredHours.length === 0) {
            setActiveHour(null);
        }
    }, [filteredHours]);

    const pricing = useMemo(() => {
        if (!service) return { total: 0, breakdown: [] };
        const petCount = selectedPetIds.length;
        if (petCount === 0) return { total: 0, breakdown: [] };

        if (service.pricingType === 'fixed') {
            return {
                total: service.basePrice * petCount,
                breakdown: selectedPetIds.map(id => ({
                    name: pets.find(p => p._id === id)?.name || "Thú cưng",
                    price: service.basePrice
                }))
            };
        } else {
            const sortedList = [...(service.priceList || [])].sort((a, b) => parseFloat(a.label) - parseFloat(b.label));

            const breakdown = selectedPetIds.map(id => {
                const pet = pets.find(p => p._id === id);
                if (!pet) return { name: "N/A", price: 0, weight: 0 };
                const weight = pet.weight || 0;
                let matchedPrice = service.basePrice || 0;
                let priceLabel = "Mặc định";

                if (sortedList.length > 0) {
                    for (let i = 0; i < sortedList.length; i++) {
                        const threshold = parseFloat(sortedList[i].label);
                        if (weight <= threshold) {
                            matchedPrice = sortedList[i].value;
                            priceLabel = i === 0 ? `< ${threshold} kg` : `${sortedList[i - 1].label} -> ${threshold} kg`;
                            break;
                        }
                        // Nếu cân nặng vượt quá mốc cuối cùng, có thể cần giá mặc định hoặc dùng mốc cuối:
                        // Thông thường phía Backend sẽ xử lý việc này, nhưng để hiển thị trên UI:
                        if (i === sortedList.length - 1) {
                            matchedPrice = sortedList[i].value;
                            priceLabel = `> ${sortedList[i - 1]?.label || 0} kg`;
                        }
                    }
                }
                return { name: pet.name, weight: weight, price: matchedPrice, priceLabel };
            });
            const total = breakdown.reduce((acc, curr) => acc + curr.price, 0);
            return { total, breakdown };
        }
    }, [service, selectedPetIds, pets]);

    const handleVerifySchedule = () => {
        if (!selectedTimeSlot || selectedPetIds.length === 0) return;

        setIsVerifying(true);
        // Giả lập một khoảng trễ nhỏ
        setTimeout(() => {
            const duration = service?.duration || 30;
            const freeStaff = selectedTimeSlot.freeStaff || 1;
            const petCount = selectedPetIds.length;

            const timeline: any[] = [];
            let currentStartTime = dayjs(`${selectedDate} ${selectedTimeSlot.time}`, "YYYY-MM-DD HH:mm");

            const petNames = selectedPetIds.map(id => pets.find(p => p._id === id)?.name || "Thú cưng");

            let petIndex = 0;
            while (petIndex < petCount) {
                const batchSize = Math.min(freeStaff, petCount - petIndex);
                const batchEndTime = currentStartTime.add(duration, 'minute');

                timeline.push({
                    startTime: currentStartTime.format("HH:mm"),
                    endTime: batchEndTime.format("HH:mm"),
                    pets: petNames.slice(petIndex, petIndex + batchSize)
                });

                petIndex += batchSize;
                currentStartTime = batchEndTime;
            }

            setBookingPreview({
                totalDuration: duration * Math.ceil(petCount / freeStaff),
                endTime: currentStartTime.format("HH:mm"),
                timeline
            });
            setIsVerifying(false);
        }, 600);
    };

    const handleSubmit = async () => {
        if (!user) { toast.info("Vui lòng đăng nhập để đặt lịch ạ!"); navigate("/auth/login"); return; }
        if (!service) return;
        if (selectedPetIds.length === 0) { toast.warning("Bé cưng nào sẽ đi Spa vậy ạ? Vui lòng chọn bé nha!"); return; }

        // Kiểm tra độ tuổi tối thiểu
        const underagePets = pets.filter(p => selectedPetIds.includes(p._id) && (p.age || 0) < (service.minAgeMonths || 0));
        if (underagePets.length > 0) {
            const names = underagePets.map(p => p.name).join(", ");
            toast.error(`Rất tiếc, bé ${names} chưa đủ tuổi (${service.minAgeMonths} tháng) để tham gia dịch vụ này ạ!`);
            return;
        }

        if (!selectedTimeSlot) { toast.warning("Bạn chưa chọn giờ hẹn kìa!"); return; }

        if (!bookingPreview) {
            toast.warning("Bạn vui lòng nhấn 'Kiểm tra lộ trình' trước khi tiếp tục nha!");
            setIsTimeModalOpen(true);
            return;
        }

        // Kiểm tra an toàn cuối cùng: nếu bản xem trước không khớp với lựa chọn hiện tại
        // (Đề phòng trường hợp hiếm gặp, mặc dù handlePetToggle đã xử lý việc này)
        const petCountInPreview = bookingPreview.timeline.reduce((sum: number, batch: any) => sum + batch.pets.length, 0);
        if (petCountInPreview !== selectedPetIds.length) {
            toast.warning("Có sự thay đổi về số lượng bé cưng, vui lòng kiểm tra lại lộ trình nha!");
            setBookingPreview(null);
            setIsTimeModalOpen(true);
            return;
        }

        const startTimeDate = dayjs(`${selectedDate} ${selectedTimeSlot.time}`, "YYYY-MM-DD HH:mm");
        if (startTimeDate.isBefore(dayjs())) {
            toast.warning("Giờ hẹn này đã trôi qua rồi, bạn chọn giờ khác nhé!");
            return;
        }

        const selectedPetsData = pets.filter(p => selectedPetIds.includes(p._id));

        // Tính toán bản xem trước/thời lượng nếu chưa có hoặc để kiểm tra lần cuối
        const duration = service.duration || 30;
        const freeStaff = selectedTimeSlot.freeStaff || 1;
        const petCount = selectedPetIds.length;
        const totalDuration = duration * Math.ceil(petCount / freeStaff);
        const endTime = startTimeDate.add(totalDuration, 'minute');

        // Lưu vào store
        setBookingData({
            service,
            selectedPets: selectedPetsData,
            startTime: startTimeDate.toISOString(),
            endTime: endTime.toISOString(),
            totalDuration: totalDuration,
            bookingPreview: bookingPreview || {
                totalDuration,
                endTime: endTime.format("HH:mm"),
                timeline: [] // Lộ trình tối thiểu nếu chưa có
            },
            selectedDate,
            selectedTimeSlot
        });

        navigate(`/services/checkout/new`);
    };

    if (isLoading) return (
        <div className="app-container py-[100px]">
            <Skeleton variant="rectangular" width="100%" height={500} sx={{ borderRadius: '40px' }} />
        </div>
    );

    if (error || !service) return (
        <div className="flex flex-col items-center justify-center py-[200px] gap-6">
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center">
                <X className="w-12 h-12 text-red-400" />
            </div>
            <Typography variant="h4" className="font-secondary">Dịch vụ không tồn tại</Typography>
            <Link to="/services" className="px-8 py-3 bg-client-primary text-white rounded-full font-bold">Quay lại danh sách</Link>
        </div>
    );

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Dịch vụ", to: "/services" },
        { label: service.name, to: `/services/${service.slug}` },
    ];

    return (
        <div className="bg-white">
            <ProductBanner
                pageTitle="Chi tiết dịch vụ"
                breadcrumbs={breadcrumbs}
                url="https://wordpress.themehour.net/babet/wp-content/uploads/2025/07/breadcumb-bg.jpg"
                className="bg-top"
            />

            <section className="relative px-[30px] bg-white pt-[80px] pb-[120px]">
                <div className="app-container grid grid-cols-2 gap-[60px] 2xl:gap-[40px] relative border-b border-[#eee] pb-[80px] items-stretch">
                    {/* Cột trái: Thư viện ảnh sản phẩm/dịch vụ */}
                    <ProductGallery images={service.images || []} />

                    {/* Cột phải: Thông tin chi tiết dịch vụ */}
                    <div>
                        <div className="flex flex-col h-full">
                            <span className="text-client-primary font-bold uppercase tracking-[3px] text-[13px] inline-block">
                                {service.categoryId?.name || "SPA & CHĂM SÓC"}
                            </span>
                            <h2 className="text-[36px] mt-[20px] font-secondary text-client-secondary leading-tight">{service.name}</h2>

                            <div className="flex items-center my-[10px]">
                                <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                        <StarIcon
                                            key={i}
                                            sx={{
                                                fontSize: "20px !important",
                                                color: "#ffbb00 !important",
                                            }}
                                        />
                                    ))}
                                </div>
                                <p className="text-[16px] text-[#505050]">(2 đánh giá từ khách hàng)</p>
                            </div>

                            {service.minAgeMonths > 0 && (
                                <div className="flex items-center gap-2 mb-[15px] bg-blue-50/50 w-fit px-4 py-2 rounded-full border border-blue-100">
                                    <Icon icon="solar:calendar-bold-duotone" width={20} className="text-blue-500" />
                                    <span className="text-[14px] font-bold text-blue-600">
                                        Yêu cầu độ tuổi: Từ {service.minAgeMonths} tháng tuổi
                                    </span>
                                </div>
                            )}

                            {service.duration > 0 && (
                                <div className="flex items-center gap-2 mb-[15px] bg-green-50/50 w-fit px-4 py-2 rounded-full border border-green-100">
                                    <Clock size={18} className="text-green-500" />
                                    <span className="text-[14px] font-bold text-green-600">
                                        Thời gian dự tính: ~{service.duration} phút / bé
                                    </span>
                                </div>
                            )}


                            {service.pricingType === 'by-weight' && service.priceList && service.priceList.length > 0 && (
                                <div className="mt-[15px]">
                                    <div className="text-[14px] font-bold text-client-secondary mb-3 uppercase tracking-wider opacity-60">Bảng giá tham khảo:</div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {service.priceList.map((tier: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-xl border border-gray-100">
                                                <span className="text-[13px] font-bold text-gray-500">
                                                    {idx === 0 ? `< ${tier.label}kg` : `${service.priceList[idx - 1].label} -> ${tier.label}kg`}
                                                </span>
                                                <span className="text-[14px] font-bold text-client-primary">{tier.value.toLocaleString()}đ</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Các tùy chọn đặt lịch */}
                            <div className="space-y-5 mt-[40px]">
                                {/* Chọn thú cưng */}
                                <div>
                                    <div className="flex items-center justify-between mb-[20px]">
                                        <h3 className="text-client-secondary font-secondary text-[20px] flex items-center gap-2">
                                            Chọn bé cưng của bạn
                                            {selectedPetIds.length > 0 && <span className="text-client-primary text-[14px] font-bold bg-client-primary/5 px-2 py-0.5 rounded-full">Đã chọn {selectedPetIds.length} bé</span>}
                                        </h3>
                                        <button
                                            onClick={() => {
                                                if (!user) {
                                                    toast.info("Vui lòng đăng nhập để thêm bé cưng nha!");
                                                    navigate("/auth/login");
                                                    return;
                                                }
                                                setIsQuickAddPetOpen(true);
                                            }}
                                            className="text-[13px] font-bold text-client-primary flex items-center gap-1.5 hover:brightness-110 transition-all"
                                        >
                                            <Plus size={16} /> Thêm bé mới
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {pets.map((pet) => {
                                            const isSelected = selectedPetIds.includes(pet._id);
                                            const isUnderage = (pet.age || 0) < (service.minAgeMonths || 0);

                                            return (
                                                <button
                                                    key={pet._id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isUnderage) {
                                                            toast.warning(`Bé ${pet.name} (${pet.age || 0} tháng) chưa đủ ${service.minAgeMonths} tháng tuổi để tham gia dịch vụ này!`);
                                                            return;
                                                        }
                                                        handlePetToggle(pet._id);
                                                    }}
                                                    className={`p-1.5 pr-4 rounded-[20px] border transition-all flex items-center gap-2 shrink-0 group relative
                                                        ${isUnderage
                                                            ? 'opacity-60 grayscale bg-gray-50 border-gray-200 cursor-not-allowed hover:border-gray-200'
                                                            : isSelected
                                                                ? 'border-client-primary bg-client-primary/[0.03]'
                                                                : 'border-gray-100 bg-white hover:border-gray-300'}`}
                                                >

                                                    <div className="w-[48px] h-[48px] rounded-[12px] overflow-hidden border border-gray-50 bg-gray-50 shrink-0">
                                                        {pet.avatar ? (
                                                            <img src={pet.avatar} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f9f9f9' }}>
                                                                <Icon icon="solar:PawPrint-bold" width={22} className="text-gray-300" />
                                                            </Box>
                                                        )}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className={`text-[14px] font-bold leading-none mb-1.5 ${isSelected && !isUnderage ? 'text-client-primary' : 'text-client-secondary'} ${isUnderage ? 'text-gray-500' : ''}`}>
                                                            {pet.name}
                                                        </p>
                                                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-tight">
                                                            {pet.weight}kg • {pet.age || 0} tháng
                                                        </p>
                                                        {isUnderage && (
                                                            <span className="absolute -top-2 -right-1 bg-red-500 text-white text-[10px] uppercase tracking-tighter whitespace-nowrap font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm">
                                                                Chưa đủ tuổi
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {pets.length === 0 && (
                                            <p className="text-gray-400 text-[14px] font-medium py-2">Bạn chưa có thú cưng nào, vui lòng thêm mới nhé!</p>
                                        )}
                                    </div>
                                </div>

                                {/* Chọn Ngày & Giờ */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="custom-datepicker">
                                        <div className="mb-[10px] text-client-secondary font-secondary text-[18px]">Ngày hẹn:</div>
                                        <Box sx={{
                                            '& .MuiOutlinedInput-root': {
                                                height: '55px',
                                                borderRadius: '40px',
                                                bgcolor: '#f8f8f8',
                                                transition: 'all 0.3s',
                                                border: '1px solid transparent',
                                                '& fieldset': { border: 'none' },
                                                '&:hover fieldset': { border: 'none' },
                                                '&.Mui-focused': {
                                                    bgcolor: '#fff',
                                                    borderColor: '#000 !important',
                                                },
                                            },
                                            '& .MuiInputBase-input': {
                                                px: '24px !important',
                                                fontWeight: '800',
                                                color: '#102937',
                                                fontFamily: 'inherit',
                                                fontSize: '16px'
                                            }
                                        }}>
                                            <DatePicker
                                                value={dayjs(selectedDate)}
                                                onChange={(newValue) => setSelectedDate(newValue ? newValue.format("YYYY-MM-DD") : "")}
                                                minDate={dayjs()}
                                                format="DD / MM / YYYY"
                                                slots={{ openPickerIcon: () => <Calendar size={20} className="text-gray-400" /> }}
                                                slotProps={{
                                                    textField: {
                                                        fullWidth: true,
                                                    },
                                                    desktopPaper: {
                                                        sx: {
                                                            bgcolor: '#121528',
                                                            borderRadius: '5px',
                                                            marginTop: '3px',
                                                            width: "272px",
                                                            color: "white",
                                                            padding: "8px 8px 0px",
                                                            overflow: 'hidden',
                                                            '& .MuiDateCalendar-root': {
                                                                width: '256px !important',
                                                                minWidth: '256px !important',
                                                                height: 'auto',
                                                            },
                                                            '& .MuiDayCalendar-slideTransition': {
                                                                minHeight: '185px !important',
                                                            },
                                                            '& .MuiPickersCalendarHeader-root': {
                                                                background: 'linear-gradient(90deg, #f86ca7 0%, #ff7f18 100%)',
                                                                padding: '3.2px 8px',
                                                                color: '#fff',
                                                                position: "relative",
                                                                borderRadius: "5px",
                                                                m: "0",
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                minHeight: '36px',
                                                                '& .MuiPickersCalendarHeader-labelContainer': {
                                                                    margin: 0,
                                                                    zIndex: 1,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                },
                                                                '& .MuiPickersCalendarHeader-switchViewButton': {
                                                                    display: 'none',
                                                                },
                                                                '& .MuiPickersCalendarHeader-label': {
                                                                    fontWeight: '700',
                                                                    fontSize: '15px',
                                                                    textAlign: "center",
                                                                },
                                                                '& .MuiPickersArrowSwitcher-root': {
                                                                    position: 'absolute',
                                                                    width: '100%',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    left: 0,
                                                                    padding: '0 4px',
                                                                    zIndex: 2,
                                                                },
                                                                '& .MuiIconButton-root': {
                                                                    color: '#fff',
                                                                    padding: '4px',
                                                                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                                                                },
                                                                '& .MuiPickersArrowSwitcher-spacer': { display: 'none' }
                                                            },
                                                            '& .MuiDayCalendar-weekDayLabel': {
                                                                padding: '0.7em 0.3em',
                                                                textAlign: 'center',
                                                                fontWeight: 700,
                                                                border: 0,
                                                                color: '#fff',
                                                                fontSize: '13px',
                                                                width: '36px',
                                                                margin: '0'
                                                            },
                                                            '& .MuiDayCalendar-monthContainer': {
                                                                width: '256px !important',
                                                                padding: '0 !important'
                                                            },
                                                            '& .MuiDayCalendar-weekContainer': {
                                                                justifyContent: 'space-around',
                                                                margin: '0 !important'
                                                            },
                                                            '& .MuiPickersDay-root': {
                                                                border: '1px solid rgba(238, 238, 238, 0.5)',
                                                                background: '#fff',
                                                                fontWeight: 'normal',
                                                                padding: '4px',
                                                                transition: 'all 0.45s ease',
                                                                color: '#001d23',
                                                                textAlign: 'center',
                                                                fontSize: '0.85rem',
                                                                borderRadius: '5px',
                                                                width: '32px',
                                                                height: '32px',
                                                                margin: '2px',
                                                                '&:hover': {
                                                                    bgcolor: '#f5f5f5',
                                                                    borderColor: '#F472B6',
                                                                    color: '#F472B6'
                                                                },
                                                                '&.Mui-selected': {
                                                                    background: 'linear-gradient(135deg, #F472B6 0%, #FB923C 100%) !important',
                                                                    color: '#fff !important',
                                                                    borderColor: 'transparent',
                                                                    boxShadow: '0 4px 12px rgba(244, 114, 182, 0.4)',
                                                                    '&:hover': {
                                                                        filter: 'brightness(1.1)',
                                                                    },
                                                                },
                                                                '&.MuiPickersDay-today': {
                                                                    borderColor: '#F472B6',
                                                                    borderWidth: '1px',
                                                                    color: '#F472B6'
                                                                },
                                                                '&.Mui-disabled': {
                                                                    color: 'rgba(0, 0, 0, 0.1) !important',
                                                                    background: '#fafafa',
                                                                    border: '1px solid #eee'
                                                                }
                                                            }
                                                        }
                                                    }
                                                }}
                                            />
                                        </Box>
                                    </div>
                                    <div>
                                        <div className="mb-[10px] text-client-secondary font-secondary text-[18px]">Giờ hẹn:</div>
                                        <div
                                            onClick={() => setIsTimeModalOpen(true)}
                                            className={`w-full h-[55px] px-6 rounded-[40px] flex items-center justify-between border cursor-pointer transition-all ${selectedTimeSlot ? 'border-client-primary bg-white ring-2 ring-client-primary/10' : 'border-transparent bg-[#f8f8f8]'}`}
                                        >
                                            <div className="flex flex-col items-start leading-none">
                                                <span className={`font-bold ${selectedTimeSlot ? 'text-client-primary' : 'text-gray-400'}`}>
                                                    {selectedTimeSlot?.time || "Chọn giờ"}
                                                </span>
                                            </div>
                                            <Clock className="w-5 h-5 text-gray-400" />
                                        </div>
                                    </div>
                                </div>


                                {/* Pricing Breakdown */}
                                {selectedPetIds.length > 0 && (
                                    <div className="bg-orange-50/50 px-[20px] py-[15px] rounded-[30px] border border-orange-100/50">
                                        <div className="flex justify-between items-center text-[20px] font-secondary text-client-secondary">
                                            <span>Tạm tính ({selectedPetIds.length} bé):</span>
                                            <span className="text-client-primary font-bold">{pricing.total.toLocaleString()}đ</span>
                                        </div>
                                    </div>
                                )}

                                {/* Main Action */}
                                <div className="mt-[40px]">
                                    <button
                                        onClick={handleSubmit}
                                        className="w-full h-[60px] rounded-[40px] text-white text-[20px] font-secondary bg-client-primary hover:bg-client-secondary transition-all shadow-xl active:scale-[0.98] flex items-center justify-center uppercase font-bold tracking-wider"
                                    >
                                        ĐẶT LỊCH NGAY
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bottom Sections mirroring ProductDetailPage */}
            <ServiceDesc serviceName={service.name} description={service.description} procedure={service.procedure} />
            <ServiceComment />
            <ServiceRelated categoryId={service.categoryId?._id || service.categoryId} currentServiceId={service._id} />

            <QuickAddPetModal
                isOpen={isQuickAddPetOpen}
                onClose={() => setIsQuickAddPetOpen(false)}
                onSuccess={(newPet) => {
                    setPets(prev => [...prev, newPet]);
                    setSelectedPetIds(prev => [...prev, newPet._id]);
                }}
            />

            <FooterSub />

            {/* Time Selection Modal */}
            <AnimatePresence>
                {isTimeModalOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsTimeModalOpen(false)}
                            className="absolute inset-0 bg-client-secondary/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="relative w-full max-w-[620px] bg-white rounded-[30px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <div className="p-6 pb-2 border-b border-gray-50/50">
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-client-primary/10 flex items-center justify-center text-client-primary">
                                            <Clock size={18} />
                                        </div>
                                        <h3 className="text-[18px] font-bold text-client-secondary">Chọn giờ đặt lịch</h3>
                                    </div>
                                    <button onClick={() => setIsTimeModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-all text-gray-400">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body - Scrollable */}
                            <div className="flex-1 overflow-y-auto p-6 pt-4 custom-scrollbar">

                                <div className="flex bg-gray-50 p-1 rounded-[15px] mb-4 overflow-x-auto no-scrollbar gap-1">
                                    {filteredShifts.map((shift) => (
                                        <button
                                            key={shift._id}
                                            onClick={() => setActiveShiftId(shift._id)}
                                            className={`flex-1 min-w-[120px] py-2 rounded-[12px] text-[12px] font-bold transition-all whitespace-nowrap px-3
                                                ${activeShiftId === shift._id ? "bg-white text-client-primary shadow-sm border border-client-primary/10" : "text-gray-400 hover:text-gray-600"}`}
                                        >
                                            <div className="flex flex-col items-center">
                                                <span>{shift.name}</span>
                                                <span className="text-[10px] opacity-60 font-medium">{shift.startTime} - {shift.endTime}</span>
                                            </div>
                                        </button>
                                    ))}
                                    {filteredShifts.length === 0 && !isLoadingSlots && (
                                        <div className="py-2 px-4 text-gray-400 text-[13px] text-center w-full">
                                            Không có ca trực nào trong ngày này
                                        </div>
                                    )}
                                </div>

                                {isLoadingSlots ? (
                                    <div className="flex flex-col items-center py-6">
                                        <Icon icon="line-md:loading-loop" width={30} className="text-client-primary mb-2" />
                                        <p className="text-gray-400 text-[12px]">Đang tải...</p>
                                    </div>
                                ) : filteredHours.length > 0 ? (
                                    <div className="flex flex-col gap-6">
                                        <div className="flex gap-5 items-start">
                                            {/* Hours Selection */}
                                            <div className="w-[85px] flex flex-col gap-2">
                                                <span className="text-[10px] font-bold text-gray-300 px-1 uppercase tracking-widest">Giờ</span>
                                                <div className="flex flex-col max-h-[220px] overflow-y-auto pr-1 custom-scrollbar gap-1.5">
                                                    {filteredHours.map((hour) => (
                                                        <button
                                                            key={hour}
                                                            onClick={() => setActiveHour(hour)}
                                                            className={`py-1.5 rounded-[10px] text-[14px] text-center transition-all border-2
                                                                ${activeHour === hour
                                                                    ? "bg-client-secondary text-white border-client-secondary font-bold"
                                                                    : "bg-white text-gray-400 border-gray-50 hover:border-gray-200"}`}
                                                        >
                                                            {hour}h
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Minutes Fixed Grid */}
                                            <div className="flex-1 flex flex-col gap-1.5">
                                                <span className="text-[10px] font-bold text-gray-300 px-1 uppercase tracking-widest">Phút (Mỗi 5p)</span>
                                                <div className="bg-gray-50/50 rounded-[15px] p-2.5 border border-gray-100">
                                                    <div className="grid grid-cols-4 gap-1.5">
                                                        {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => {
                                                            const fullTime = `${activeHour}:${m}`;
                                                            const slot = groupedSlots[activeHour || ""]?.find(s => s.time === fullTime);

                                                            // Check if time is in the past for today's date
                                                            const isPastTime = selectedDate === dayjs().format("YYYY-MM-DD") &&
                                                                dayjs(`${selectedDate} ${fullTime}`, "YYYY-MM-DD H:mm").isBefore(dayjs());

                                                            const isAvailable = (slot ? (slot.status === "available") : false) && !isPastTime;
                                                            const isSelected = selectedTimeSlot?.time === fullTime;

                                                            return (
                                                                <Tooltip
                                                                    key={m}
                                                                    title={!isAvailable && !isPastTime ? "Tất cả nhân viên đã bận hoặc không đủ nhân sự vào khung giờ này rồi ạ!" : ""}
                                                                    arrow
                                                                    placement="top"
                                                                >
                                                                    <span className={!isAvailable ? "cursor-not-allowed" : ""}>
                                                                        <button
                                                                            disabled={!isAvailable}
                                                                            onClick={() => {
                                                                                if (slot) setSelectedTimeSlot(slot);
                                                                                else setSelectedTimeSlot({ time: fullTime, status: "available" });
                                                                                setBookingPreview(null); // Reset preview when time changes
                                                                            }}
                                                                            className={`w-full py-2 rounded-[8px] font-bold text-[13px] transition-all border-2
                                                                            ${isSelected
                                                                                    ? 'bg-client-primary border-client-primary text-white scale-105 shadow-md'
                                                                                    : isAvailable
                                                                                        ? 'bg-white border-gray-100 text-client-secondary hover:border-client-primary/40 hover:shadow-sm'
                                                                                        : 'bg-gray-50 border-transparent text-gray-300 pointer-events-none'}`}
                                                                        >
                                                                            {m}
                                                                        </button>
                                                                    </span>
                                                                </Tooltip>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Verification & Preview Section */}
                                        {/* Lộ trình thực hiện - Đã bỏ chữ Dự kiến */}
                                        {selectedTimeSlot && (
                                            <div className={`transition-all duration-500 overflow-hidden ${bookingPreview ? "max-h-[460px]" : "max-h-[80px]"}`}>
                                                {!bookingPreview ? (
                                                    <button
                                                        onClick={handleVerifySchedule}
                                                        disabled={isVerifying}
                                                        className="w-full py-4 bg-gray-50 text-client-secondary rounded-[15px] font-bold text-[14px] hover:bg-client-primary/5 hover:text-client-primary transition-all border-2 border-dashed border-gray-200 flex items-center justify-center gap-2 group mb-4"
                                                    >
                                                        {isVerifying ? (
                                                            <Icon icon="line-md:loading-loop" width={20} />
                                                        ) : (
                                                            <Icon icon="solar:shield-check-bold-duotone" width={20} className="text-client-primary group-hover:scale-110 transition-transform" />
                                                        )}
                                                        <span>Kiểm tra lộ trình phục vụ ({selectedPetIds.length} bé)</span>
                                                    </button>
                                                ) : (
                                                    <div className="bg-orange-50/30 rounded-[20px] p-4 border border-orange-100/50 mb-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-6 bg-client-primary rounded-full"></div>
                                                                <h4 className="font-bold text-client-secondary text-[16px]">Lộ trình thực hiện (Dự kiến)</h4>
                                                            </div>
                                                            <button
                                                                onClick={() => setBookingPreview(null)}
                                                                className="flex items-center gap-1 text-[11px] font-bold text-client-primary hover:bg-client-primary/5 px-2.5 py-1 rounded-full transition-all"
                                                            >
                                                                <Icon icon="solar:restart-bold" width={12} />
                                                                Đổi giờ khác
                                                            </button>
                                                        </div>

                                                        <div className="space-y-3">
                                                            {bookingPreview.timeline.map((item: any, idx: number) => (
                                                                <div key={idx} className="flex gap-3">
                                                                    <div className="flex flex-col items-center pt-1">
                                                                        <div className="w-2 h-2 rounded-full bg-client-primary animate-pulse"></div>
                                                                        {idx !== bookingPreview.timeline.length - 1 && <div className="w-[1px] h-full bg-gray-200 my-1"></div>}
                                                                    </div>
                                                                    <div className="flex-1 pb-2">
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <span className="text-[13px] font-bold text-client-secondary bg-white px-2 py-0.5 rounded-lg border border-gray-100">Thời gian: {item.startTime} - {item.endTime}</span>
                                                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-client-primary/10 text-client-primary rounded-md uppercase tracking-wider">Đợt {idx + 1}</span>
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {item.pets.map((pName: string, pIdx: number) => (
                                                                                <span key={pIdx} className="text-[12px] text-gray-600 bg-white/80 px-2 rounded-md border border-orange-50 capitalize">{pName}</span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="mt-4 pt-4 border-t border-orange-100/30 flex items-center justify-between">
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Dự kiến hoàn tất:</span>
                                                                <span className="text-[16px] font-bold text-client-primary">{bookingPreview.endTime}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Tổng thời gian dự kiến:</span>
                                                                <p className="text-[16px] font-bold text-client-secondary">{bookingPreview.totalDuration} phút</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-12 text-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                            <Icon icon="solar:calendar-minimalistic-broken" width={32} className="text-gray-200" />
                                        </div>
                                        <p className="text-gray-400 text-[14px] font-medium">Lịch hôm nay đã được đặt hết rồi ạ.</p>
                                    </div>
                                )}

                                {/* Modal Footer - Fixed if preview exists */}
                                {/* Chốt giờ hẹn khi đã có lộ trình */}
                                {bookingPreview && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <button
                                            onClick={() => {
                                                setIsTimeModalOpen(false);
                                            }}
                                            className="w-full py-4 bg-client-primary text-white rounded-[20px] font-bold text-[16px] shadow-lg shadow-client-primary/10 hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2 group"
                                        >
                                            <Icon icon="solar:check-circle-bold" width={24} className="group-hover:rotate-12 transition-transform" />
                                            <span>Chốt lịch vào {selectedTimeSlot.time}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
