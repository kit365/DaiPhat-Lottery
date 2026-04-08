import { FooterSub } from "../../components/layouts/FooterSub";
import EditLocationAltIcon from "@mui/icons-material/EditLocationAlt";
import PhoneEnabledOutlinedIcon from '@mui/icons-material/PhoneEnabledOutlined';
import MailOutlineOutlinedIcon from '@mui/icons-material/MailOutlineOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { useAuthStore } from "../../../stores/useAuthStore";
import { useServices } from "../../hooks/useService";
import { getAvailableTimeSlots } from "../../api/booking.api";
import { getMyPets } from "../../api/pet.api";
import { useNavigate } from "react-router-dom";
import { PetCreateModal } from "./sections/PetCreateModal";
import { Tooltip } from "@mui/material";
import { useBookingStore } from "../../../stores/useBookingStore";
import {
    Scissors, Bath, Sparkles, User, Plus, Clock,
    Calendar, ArrowRight, ArrowLeft, Info
} from "lucide-react";

const getServiceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("tắm")) return <Bath className="w-8 h-8" />;
    if (n.includes("tỉa") || n.includes("grooming")) return <Scissors className="w-8 h-8" />;
    return <Sparkles className="w-8 h-8" />;
};

const STEPS = [
    { title: "Chọn dịch vụ", icon: <Sparkles className="w-5 h-5" /> },
    { title: "Chọn bé cưng", icon: <User className="w-5 h-5" /> },
    { title: "Chọn thời gian", icon: <Calendar className="w-5 h-5" /> },
    { title: "Xác nhận", icon: <CheckCircleIcon style={{ fontSize: "18px" }} /> }
];

export const BookingPage = () => {
    const navigate = useNavigate();
    const { user, isHydrated } = useAuthStore();
    const { data: allServices = [] } = useServices();
    const { setBookingData, resetBooking } = useBookingStore();

    // Reset store when starting wizard
    useEffect(() => {
        resetBooking();
    }, []);

    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);

    // Data states
    const [pets, setPets] = useState<any[]>([]);
    const [loadingPets, setLoadingPets] = useState(false);
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    // Form selection states
    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
    const [isPetModalOpen, setIsPetModalOpen] = useState(false);
    const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(dayjs().format("YYYY-MM-DD"));
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<any>(null);

    // UI Local state for tab switching
    const [activeTimeSession, setActiveTimeSession] = useState(() => {
        const hour = dayjs().hour();
        if (hour < 13) return "Sáng";
        if (hour < 18) return "Chiều";
        return "Tối";
    });

    const [note, setNote] = useState("");

    // Fetch Pets
    useEffect(() => {
        const fetchPets = async () => {
            if (!user) return;
            setLoadingPets(true);
            try {
                const res = await getMyPets();
                if (res.code === 200) setPets(res.data);
            } catch (error) {
                console.error("Error fetching pets:", error);
            } finally {
                setLoadingPets(false);
            }
        };
        fetchPets();
    }, [user]);

    const filteredSlotsBySession = useMemo(() => {
        return availableSlots.filter(slot => {
            const hour = parseInt(slot.time.split(":")[0]);
            if (activeTimeSession === "Sáng") return hour < 13;
            if (activeTimeSession === "Chiều") return hour >= 13 && hour < 18;
            if (activeTimeSession === "Tối") return hour >= 18;
            return true;
        });
    }, [availableSlots, activeTimeSession]);

    // Check availability of each session
    const sessionAvailability = useMemo(() => {
        const sessions: Record<string, boolean> = { "Sáng": false, "Chiều": false, "Tối": false };
        availableSlots.forEach(slot => {
            const hour = parseInt(slot.time.split(":")[0]);
            if (slot.totalStaff > 0) {
                if (hour < 13) sessions["Sáng"] = true;
                else if (hour < 18) sessions["Chiều"] = true;
                else sessions["Tối"] = true;
            }
        });
        return sessions;
    }, [availableSlots]);

    // Auto-switch session if current has no staff
    useEffect(() => {
        if (availableSlots.length > 0) {
            if (!sessionAvailability[activeTimeSession]) {
                const firstAvailable = Object.keys(sessionAvailability)
                    .find(key => sessionAvailability[key]);
                if (firstAvailable) setActiveTimeSession(firstAvailable);
            }
        }
    }, [sessionAvailability, availableSlots, activeTimeSession]);

    // Smart default session when date changes
    useEffect(() => {
        if (selectedDate === dayjs().format("YYYY-MM-DD")) {
            const hour = dayjs().hour();
            if (hour < 13) setActiveTimeSession("Sáng");
            else if (hour < 18) setActiveTimeSession("Chiều");
            else setActiveTimeSession("Tối");
        } else {
            setActiveTimeSession("Sáng"); // Mặc định sáng cho các ngày tương lai
        }
    }, [selectedDate]);

    // Services Filter
    const filteredServices = useMemo(() => {
        return allServices;
    }, [allServices]);

    const selectedService = useMemo(() => {
        return filteredServices.find((s: any) => s._id === selectedServiceId);
    }, [filteredServices, selectedServiceId]);

    // Fetch available slots
    useEffect(() => {
        const fetchSlots = async () => {
            if (!selectedDate || !selectedServiceId) return;
            setIsLoadingSlots(true);
            try {
                const res = await getAvailableTimeSlots(
                    selectedDate,
                    selectedServiceId,
                    selectedPetIds.length || 1,
                    selectedPetIds
                );
                if (res.code === 200 && res.data) {
                    setAvailableSlots(res.data);
                }
            } catch (error) {
                console.error("Error fetching slots:", error);
            } finally {
                setIsLoadingSlots(false);
            }
        };
        fetchSlots();
    }, [selectedDate, selectedServiceId, selectedPetIds.length, selectedPetIds]);

    // Pricing Logic
    const pricing = useMemo(() => {
        if (!selectedService || selectedPetIds.length === 0) return { total: 0, breakdown: [] };
        let total = 0;
        const breakdown: any[] = [];

        selectedPetIds.forEach(petId => {
            const pet = pets.find(p => p._id === petId);
            if (!pet) return;
            let price = 0;
            let priceLabel = "";

            if (selectedService.pricingType === 'fixed') {
                price = selectedService.basePrice || 0;
                priceLabel = "Giá cố định";
            } else if (selectedService.pricingType === 'by-weight') {
                const petWeight = pet.weight || 0;
                const priceItem = selectedService.priceList?.find((item: any) => {
                    const label = item.label;
                    if (!label) return false;

                    if (label.includes('<')) {
                        const maxWeight = parseFloat(label.replace(/[^\d.]/g, ''));
                        return petWeight < maxWeight;
                    }
                    if (label.includes('>')) {
                        const minWeight = parseFloat(label.replace(/[^\d.]/g, ''));
                        return petWeight > minWeight;
                    }
                    if (label.includes('-')) {
                        const numbers = label.match(/\d+\.?\d*/g);
                        if (numbers && numbers.length >= 2) {
                            const [min, max] = numbers.map(v => parseFloat(v));
                            return petWeight >= min && petWeight <= max;
                        }
                    }
                    const singleNum = parseFloat(label.replace(/[^\d.]/g, ''));
                    if (!isNaN(singleNum)) {
                        return petWeight <= singleNum;
                    }
                    return false;
                });
                price = priceItem ? priceItem.value : (selectedService.basePrice || 0);
                priceLabel = priceItem ? priceItem.label : "Giá mặc định";
            }

            total += price;
            breakdown.push({
                name: pet.name,
                price,
                weight: pet.weight,
                priceLabel
            });
        });
        return { total, breakdown };
    }, [selectedService, selectedPetIds, pets]);

    const handlePetToggle = (petId: string) => {
        setSelectedPetIds(prev =>
            prev.includes(petId)
                ? prev.filter(id => id !== petId)
                : [...prev, petId]
        );
    };

    const nextStep = () => {
        if (currentStep === 1 && !selectedServiceId) return toast.warn("Vui lòng chọn một dịch vụ!");
        if (currentStep === 2 && selectedPetIds.length === 0) return toast.warn("Vui lòng chọn ít nhất một bé cưng!");
        if (currentStep === 3 && !selectedTimeSlot) return toast.warn("Vui lòng chọn khung giờ!");
        setCurrentStep(prev => prev + 1);
    };

    const prevStep = () => {
        setCurrentStep(prev => prev - 1);
    };

    const handleSubmit = async () => {
        if (!user) {
            toast.warn("Vui lòng đăng nhập để đặt lịch!");
            navigate("/auth/login");
            return;
        }

        const timeString = selectedTimeSlot?.time;
        if (!timeString) return toast.error("Vui lòng chọn khung giờ!");
        const startDateTime = dayjs(`${selectedDate} ${timeString}`, "YYYY-MM-DD HH:mm");

        if (startDateTime.isBefore(dayjs())) {
            toast.warning("Giờ hẹn này đã trôi qua rồi, bạn chọn giờ khác nhé!");
            return;
        }

        const service = allServices.find(s => s._id === selectedServiceId);
        const selectedPetsData = pets.filter(p => selectedPetIds.includes(p._id));

        if (!service) return toast.error("Không tìm thấy thông tin dịch vụ!");

        const totalDurationCalculated = (service.duration || 60) * selectedPetsData.length;

        setBookingData({
            service,
            selectedPets: selectedPetsData,
            startTime: startDateTime.toISOString(),
            endTime: startDateTime.add(totalDurationCalculated, 'minute').toISOString(),
            totalDuration: totalDurationCalculated,
            selectedDate,
            selectedTimeSlot,
            note,
            bookingPreview: null // Booking wizard doesn't have complex timeline yet
        });

        navigate(`/services/checkout/new`);
    };

    const handlePetCreateSuccess = async () => {
        setLoadingPets(true);
        try {
            const res = await getMyPets();
            if (res.code === 200) setPets(res.data);
        } catch (error) {
            console.error("Error refreshing pets:", error);
        } finally {
            setLoadingPets(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {filteredServices.map((s) => (
                            <div
                                key={s._id}
                                onClick={() => setSelectedServiceId(s._id)}
                                className={`p-6 rounded-[32px] border-2 cursor-pointer transition-all duration-300 flex items-center gap-6 ${selectedServiceId === s._id
                                    ? "border-client-primary bg-client-primary/5 shadow-md scale-[1.02]"
                                    : "border-gray-50 hover:border-client-primary/30 hover:bg-white hover:shadow-sm"
                                    }`}
                            >
                                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 ${selectedServiceId === s._id ? "bg-client-primary text-white shadow-lg" : "bg-gray-50 text-client-secondary"}`}>
                                    {getServiceIcon(s.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[20px] font-bold text-[#181818] mb-1 truncate">
                                        {s.name}
                                    </h3>
                                    <div className="flex items-center justify-between">
                                        <span className="text-client-primary font-bold text-[18px]">
                                            {s.pricingType === 'fixed' ? `${s.basePrice?.toLocaleString()}đ` : `${s.priceList?.[0]?.value?.toLocaleString() || "100k"}đ+`}
                                        </span>
                                        {selectedServiceId === s._id && <CheckCircleIcon style={{ fontSize: "24px", color: "#E67E22" }} />}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-8"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loadingPets ? (
                                <div className="col-span-full py-20 text-center text-gray-400">Đang chuẩn bị hồ sơ các bé...</div>
                            ) : pets.length === 0 ? (
                                <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-[40px] border-2 border-dashed border-gray-100 italic">
                                    Quý khách chưa thêm bé cưng nào ạ!
                                </div>
                            ) : (
                                pets.map((pet) => (
                                    <div
                                        key={pet._id}
                                        onClick={() => handlePetToggle(pet._id)}
                                        className={`p-6 rounded-[32px] border-2 cursor-pointer transition-all duration-300 flex items-center gap-6 ${selectedPetIds.includes(pet._id)
                                            ? "border-client-primary bg-client-primary/5 shadow-md scale-[1.02]"
                                            : "border-gray-50 hover:border-client-primary/30 hover:bg-white hover:shadow-sm"
                                            }`}
                                    >
                                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 shrink-0 border-2 border-white shadow-sm">
                                            <img
                                                src={pet.image || "https://img.freepik.com/free-vector/cute-dog-sitting-cartoon-vector-icon-illustration-animal-nature-icon-concept-isolated-premium-vector-flat-cartoon-style_138676-4180.jpg"}
                                                alt={pet.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[18px] font-bold text-[#181818] mb-0.5 truncate">{pet.name}</h4>
                                            <p className="text-[14px] text-gray-500 font-medium">{pet.breedId?.name} • {pet.weight}kg</p>
                                        </div>
                                        {selectedPetIds.includes(pet._id) && (
                                            <div className="w-8 h-8 rounded-full bg-client-primary flex items-center justify-center text-white shadow-sm">
                                                <CheckCircleIcon style={{ fontSize: "18px" }} />
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                            <button
                                onClick={() => setIsPetModalOpen(true)}
                                className="p-6 border-2 border-dashed border-gray-200 rounded-[32px] text-gray-400 font-bold hover:border-client-primary hover:text-client-primary transition-all flex items-center justify-center gap-3 group bg-white/50"
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-client-primary/10 transition-colors">
                                    <Plus className="w-6 h-6" />
                                </div>
                                Thêm bé cưng mới
                            </button>
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-12"
                    >
                        <div className="space-y-6">
                            <h4 className="text-[18px] font-bold text-[#181818] flex items-center gap-2">
                                <Calendar className="w-6 h-6 text-client-primary" />
                                Chọn ngày hẹn
                            </h4>
                            <div className="bg-white p-6 rounded-[32px] border border-[#eee] shadow-sm">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    min={dayjs().format("YYYY-MM-DD")}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full text-[18px] p-4 border-2 border-[#181818] rounded-full focus:border-client-primary outline-none bg-white transition-all font-bold"
                                />
                                <p className="mt-4 text-[14px] text-gray-400 italic text-center">Chúng tôi mở cửa tất cả các ngày trong tuần</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-[18px] font-bold text-[#181818] flex items-center gap-2">
                                <Clock className="w-6 h-6 text-client-primary" />
                                Chọn khung giờ
                            </h4>
                            <div className="bg-white p-6 rounded-[32px] border border-[#eee] shadow-sm">
                                {isLoadingSlots ? (
                                    <div className="text-center py-10 text-gray-400">Đang tìm khung giờ trống...</div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex bg-gray-100 p-1 rounded-2xl">
                                            {["Sáng", "Chiều", "Tối"].map((session) => {
                                                const isSessionClosed = !sessionAvailability[session];
                                                return (
                                                    <Tooltip
                                                        key={session}
                                                        title={isSessionClosed ? "Buổi này hiện không có nhân viên trực" : ""}
                                                        arrow
                                                    >
                                                        <button
                                                            disabled={isSessionClosed}
                                                            onClick={() => setActiveTimeSession(session)}
                                                            className={`flex-1 py-2.5 rounded-xl text-[14px] font-bold transition-all flex flex-col items-center leading-tight ${activeTimeSession === session
                                                                ? "bg-white text-client-primary shadow-sm"
                                                                : isSessionClosed
                                                                    ? "text-gray-300 cursor-not-allowed"
                                                                    : "text-gray-400 hover:text-gray-600"
                                                                }`}
                                                        >
                                                            {session}
                                                            {isSessionClosed && <span className="text-[8px] opacity-70">Đóng cửa</span>}
                                                        </button>
                                                    </Tooltip>
                                                );
                                            })}
                                        </div>

                                        {filteredSlotsBySession.length > 0 ? (
                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                {filteredSlotsBySession.map((slot, idx) => {
                                                    const isPastTime = selectedDate === dayjs().format("YYYY-MM-DD") &&
                                                        dayjs(`${selectedDate} ${slot.time}`, "YYYY-MM-DD HH:mm").isBefore(dayjs());
                                                    const isAvailable = slot.status === "available" && !isPastTime;
                                                    const isFull = slot.status === "full";
                                                    const isClosed = slot.status === "closed";
                                                    const isSelected = selectedTimeSlot?.time === slot.time;

                                                    return (
                                                        <Tooltip
                                                            key={idx}
                                                            title={
                                                                isPastTime ? "Giờ này đã trôi qua" :
                                                                    (slot.status === "pet_busy" ? "Một trong các thú cưng bạn chọn đã có lịch trong khung giờ này" :
                                                                        (isFull ? "Tất cả nhân viên đã bận" :
                                                                            isClosed ? "Spa không có nhân viên trực" : ""))
                                                            }
                                                            arrow
                                                        >
                                                            <button
                                                                disabled={!isAvailable}
                                                                type="button"
                                                                onClick={() => setSelectedTimeSlot(slot)}
                                                                className={`relative py-3 rounded-xl text-[14px] font-bold transition-all border-2 flex flex-col items-center justify-center overflow-hidden ${isSelected
                                                                    ? "bg-client-primary border-client-primary text-white shadow-md scale-105 z-10"
                                                                    : isAvailable
                                                                        ? "border-gray-100 hover:border-client-primary text-gray-700 hover:bg-client-primary/5"
                                                                        : "border-transparent bg-gray-50 text-gray-300 cursor-not-allowed opacity-60"
                                                                    }`}
                                                            >
                                                                {slot.time}
                                                                {!isAvailable && (
                                                                    <span className="text-[8px] font-medium uppercase mt-0.5 opacity-80 text-center px-1">
                                                                        {isPastTime ? "Đã qua" : (slot.status === "pet_busy" ? "Thú cưng bận" : (isFull ? "Hết chỗ" : "Đóng cửa"))}
                                                                    </span>
                                                                )}
                                                                {isAvailable && slot.freeStaff <= 2 && (
                                                                    <span className="text-[8px] font-medium uppercase mt-0.5 text-orange-400">
                                                                        Sắp hết
                                                                    </span>
                                                                )}
                                                            </button>
                                                        </Tooltip>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-10 text-gray-400 italic">Không có khung giờ nào khả dụng trong buổi này ạ!</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                );
            case 4:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-12"
                    >
                        <div className="space-y-8">
                            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-6">
                                <div className="w-20 h-20 rounded-full bg-client-primary/10 flex items-center justify-center text-client-primary">
                                    <User className="w-10 h-10" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[20px] font-bold text-[#181818] mb-1">{user?.fullName}</h4>
                                    <p className="text-gray-500 font-medium">{user?.phone} • {user?.email}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[18px] font-bold text-[#181818] ml-4">Ghi chú cho Spa</h4>
                                <textarea
                                    placeholder="Có điều gì đặc biệt chúng tôi cần lưu ý về bé không? (VD: bé sợ nước, bé bị dị ứng...)"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full h-40 py-6 px-8 border-2 border-[#181818] rounded-[32px] text-[16px] outline-none focus:border-client-primary transition-all bg-white resize-none"
                                ></textarea>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-[#FAF8F6] p-10 rounded-[40px] border-2 border-dashed border-[#dcd1c3] shadow-inner">
                                <h4 className="text-[24px] font-third text-client-secondary mb-6">Tóm tắt dịch vụ</h4>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-start text-[16px]">
                                        <span className="text-gray-500">Dịch vụ:</span>
                                        <span className="font-bold text-[#181818]">{selectedService?.name}</span>
                                    </div>

                                    {selectedService?.pricingType === 'by-weight' && (
                                        <div className="space-y-3">
                                            <div className="text-[15px] font-semibold text-gray-600 border-b border-gray-200 pb-2">
                                                Chi tiết giá theo cân nặng:
                                            </div>
                                            {pricing.breakdown.map((item: any, index: number) => (
                                                <div key={index} className="flex justify-between items-center text-[15px] bg-white/60 rounded-2xl p-4 border border-gray-100">
                                                    <div className="flex-1">
                                                        <div className="font-bold text-[#181818]">{item.name}</div>
                                                        <div className="text-[13px] text-gray-500 mt-1">
                                                            Cân nặng: <span className="font-semibold text-client-primary">{item.weight}kg</span>
                                                            {item.priceLabel && (
                                                                <> • Khung giá: <span className="font-semibold">{item.priceLabel}</span></>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="font-bold text-[16px] text-client-primary ml-4">
                                                        {item.price.toLocaleString()}đ
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {selectedService?.pricingType === 'fixed' && (
                                        <div className="flex justify-between items-center text-[16px]">
                                            <span className="text-gray-500">Bé cưng ({selectedPetIds.length}):</span>
                                            <div className="text-right">
                                                {selectedPetIds.map(id => {
                                                    const pet = pets.find(p => p._id === id);
                                                    return pet ? (
                                                        <div key={id} className="font-bold text-[#181818]">
                                                            {pet.name} ({pet.weight}kg)
                                                        </div>
                                                    ) : null;
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center text-[16px]">
                                        <span className="text-gray-500">Thời gian:</span>
                                        <span className="font-bold text-[#181818]">{dayjs(selectedDate).format("DD/MM/YYYY")} | {selectedTimeSlot?.time}</span>
                                    </div>
                                    <div className="pt-6 border-t border-dashed border-[#ccc] flex justify-between items-center text-[24px] font-bold">
                                        <span className="text-[#181818]">Tổng tiền:</span>
                                        <span className="text-client-primary">{pricing.total.toLocaleString()}đ</span>
                                    </div>
                                </div>

                                <div className="mt-8 p-8 bg-orange-50 rounded-[32px] border border-orange-100 flex gap-4 items-start">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-orange-400 shadow-sm shrink-0 mt-1">
                                        <Info className="w-6 h-6" />
                                    </div>
                                    <p className="text-[14px] text-orange-800 leading-relaxed italic">
                                        Quý khách vui lòng đến đúng giờ để DaiPhat có thể phục vụ bé tốt nhất. Nếu có thay đổi, vui lòng liên hệ hotline trước 2 giờ.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            default:
                return null;
        }
    };

    if (!isHydrated) return null;

    return (
        <div className="overflow-x-hidden min-h-screen bg-[#FBFBFA]">
            <div className="bg-white relative overflow-visible min-h-[600px]">
                <div className="app-container py-20 relative px-6 lg:px-0">
                    <div className="w-full lg:w-1/2 z-20 relative pt-10">
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="uppercase text-client-primary text-[1rem] font-bold mb-4 tracking-widest"
                        >
                            Dịch vụ cao cấp
                        </motion.p>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-[2rem] lg:text-[2.5rem] text-[#181818] leading-[1.1] font-third mb-8"
                        >
                            Hãy để chúng tôi <br /> chăm sóc bé cưng
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-[#505050] font-medium text-[1.125rem] leading-relaxed max-w-[550px]"
                        >
                            Đội ngũ chuyên viên tận tâm, không gian Spa hiện đại – mang lại trải nghiệm thư giãn hoàn hảo nhất cho mọi thú cưng.
                        </motion.p>
                    </div>

                    <div className="hidden lg:block absolute right-[-5%] top-[-80px] w-[58%] h-[calc(100%+100px)] pointer-events-none z-10">
                        <img
                            src="https://pawsitive.bold-themes.com/coco/wp-content/uploads/sites/3/2019/08/hero_image_13-1.png"
                            alt="Mascot"
                            className="w-full h-full object-contain object-right-bottom"
                        />
                    </div>
                </div>

                <div className="absolute top-[10%] right-[35%] w-[400px] h-[400px] bg-client-primary/5 rounded-full blur-[100px] -z-0"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-green-50/50 rounded-full blur-[100px] -z-0"></div>
            </div>

            <div className="app-container py-20 px-6 lg:px-0">
                <div className="max-w-[1200px] mx-auto">
                    <div className="bg-white rounded-[60px] shadow-[0px_40px_100px_rgba(0,0,0,0.06)] border border-gray-50 overflow-hidden">
                        <div className="bg-[#102937] p-10 lg:p-14 text-white">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                                <div>
                                    <span className="text-gray-400 text-[0.875rem] uppercase font-bold tracking-widest mb-2 block">Đặt lịch hẹn</span>
                                    <h2 className="text-[1.5rem] font-third">Bước {currentStep}/4: {STEPS[currentStep - 1].title}</h2>
                                </div>
                                <div className="flex gap-4">
                                    {STEPS.map((s, idx) => (
                                        <div key={idx} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${currentStep > idx + 1 ? "bg-green-400" : currentStep === idx + 1 ? "bg-client-primary shadow-lg scale-110" : "bg-white/10"}`}>
                                            {currentStep > idx + 1 ? <CheckCircleIcon style={{ fontSize: "20px" }} /> : s.icon}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(currentStep / 4) * 100}%` }}
                                    className="h-full bg-client-primary"
                                />
                            </div>
                        </div>

                        <div className="p-10 lg:p-14 min-h-[400px]">
                            {renderStepContent()}
                        </div>

                        <div className="p-10 lg:p-14 bg-gray-50 flex items-center justify-between border-t border-gray-100">
                            <button
                                onClick={prevStep}
                                disabled={currentStep === 1}
                                className={`flex items-center gap-2 text-[18px] font-bold transition-all ${currentStep === 1 ? "opacity-0 pointer-events-none" : "text-[#102937] hover:text-client-primary"}`}
                            >
                                <ArrowLeft className="w-6 h-6" />
                                Quay lại
                            </button>

                            {currentStep < 4 ? (
                                <button
                                    onClick={nextStep}
                                    className="bg-client-primary text-white py-5 px-12 rounded-full text-[18px] font-bold shadow-xl shadow-client-primary/30 flex items-center gap-3 hover:bg-client-secondary hover:scale-105 transition-all"
                                >
                                    Tiếp theo
                                    <ArrowRight className="w-6 h-6" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    className="bg-green-500 text-white py-5 px-16 rounded-full text-[18px] font-bold shadow-xl shadow-green-500/30 flex items-center gap-3 hover:bg-[#102937] hover:scale-105 transition-all"
                                >
                                    Xác nhận & Gửi yêu cầu
                                    <CheckCircleIcon style={{ fontSize: "40px" }} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="app-container py-20 px-6 lg:px-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-stretch">
                    <div className="space-y-12 shrink-0">
                        <h2 className="text-[47px] font-third text-[#181818]">Liên hệ</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-10">
                            <div className="flex gap-6 items-start group">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-blue-50 text-[#102937] group-hover:bg-[#102937] group-hover:text-white transition-all shadow-sm">
                                    <EditLocationAltIcon style={{ fontSize: "30px" }} />
                                </div>
                                <div className="pt-2">
                                    <h4 className="text-[20px] font-bold mb-2">Địa chỉ</h4>
                                    <p className="text-[16px] text-gray-500">64 Ung Văn Khiêm, Pleiku, Gia Lai</p>
                                </div>
                            </div>

                            <div className="flex gap-6 items-start group">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-green-50 text-[#102937] group-hover:bg-[#102937] group-hover:text-white transition-all shadow-sm">
                                    <PhoneEnabledOutlinedIcon style={{ fontSize: "30px" }} />
                                </div>
                                <div className="pt-2">
                                    <h4 className="text-[20px] font-bold mb-2">Số điện thoại</h4>
                                    <p className="text-[16px] text-gray-500">+8434 658 7796</p>
                                    <p className="text-[16px] text-gray-500">+8434 658 7796</p>
                                </div>
                            </div>

                            <div className="flex gap-6 items-start group">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-orange-50 text-[#102937] group-hover:bg-[#102937] group-hover:text-white transition-all shadow-sm">
                                    <MailOutlineOutlinedIcon style={{ fontSize: "30px" }} />
                                </div>
                                <div className="pt-2">
                                    <h4 className="text-[20px] font-bold mb-2">Email</h4>
                                    <p className="text-[16px] text-gray-500">daiphat@gmail.com</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 bg-[#102937] rounded-[50px] text-white relative overflow-hidden group">
                            <div className="relative z-10">
                                <h4 className="text-[24px] font-third mb-6">Theo dõi chúng tôi</h4>
                                <p className="text-[16px] text-white/70 mb-8 leading-relaxed">Luôn cập nhật những hình ảnh và video đáng yêu nhất về các bé thú cưng tại DaiPhat Spa.</p>
                                <div className="flex gap-4">
                                    {["Facebook", "Instagram", "Tiktok"].map(s => (
                                        <button key={s} className="px-6 py-3 rounded-full bg-white/10 hover:bg-client-primary transition-all text-[14px] font-bold">{s}</button>
                                    ))}
                                </div>
                            </div>
                            <img src="https://pawsitive.bold-themes.com/coco/wp-content/uploads/sites/3/2019/07/text_04.png" className="absolute right-[-10%] bottom-[-10%] opacity-20 w-[60%] group-hover:rotate-6 transition-all" alt="" />
                        </div>
                    </div>

                    <div className="rounded-[60px] overflow-hidden border-8 border-white shadow-2xl h-full min-h-[600px]">
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.610010397031!2d106.809883!3d10.841127599999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752731176b07b1%3A0xb752b24b379bae5e!2sFPT%20University%20HCMC!5e0!3m2!1sen!2s!4v1761230475278!5m2!1sen!2s"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                        />
                    </div>
                </div>
            </div>

            <FooterSub />

            <PetCreateModal
                isOpen={isPetModalOpen}
                onClose={() => setIsPetModalOpen(false)}
                onSuccess={handlePetCreateSuccess}
            />
        </div>
    );
};
