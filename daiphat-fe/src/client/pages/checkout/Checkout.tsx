import { useEffect, useState, useRef } from "react";
import { ProductBanner } from "../product/sections/ProductBanner"
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, User, Search, LogOut } from "iconoir-react";
import { useCartStore } from "../../../stores/useCartStore";
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { FooterSub } from "../../components/layouts/FooterSub";
import { getAddresses } from "../../api/dashboard.api";
import { getCartDetails } from "../../api/cart.api";
import { createOrder } from "../../api/order.api";
import { getClientCoupons, checkCoupon } from "../../api/coupon.api";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "../../../stores/useAuthStore";
import { useSettingGeneral } from "../../hooks/useSettings";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for leaflet default marker icon
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const breadcrumbs = [
    { label: "Trang chủ", to: "/" },
    { label: "Thanh toán", to: "/checkout" },
];

const schema = z.object({
    fullName: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function MapController({ center }: { center: L.LatLngExpression }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, 15);
    }, [center, map]);
    return null;
}

function LocationMarker({
    position,
    setPosition,
    onLocationSelect
}: {
    position: L.LatLng | null;
    setPosition: (pos: L.LatLng) => void;
    onLocationSelect: (lat: number, lon: number) => void;
}) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

export const CheckoutPage = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const [showOrderNotes, setShowOrderNotes] = useState(false);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
    const [loadingAddresses, setLoadingAddresses] = useState(true);

    // Coupon states
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [couponError, setCouponError] = useState("");
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [showCouponPopup, setShowCouponPopup] = useState(false);
    const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [loadingCoupons, setLoadingCoupons] = useState(false);

    // Point states
    const [usedPoint, setUsedPoint] = useState(0);
    const [pointDiscount, setPointDiscount] = useState(0);
    const [canUsePoint, setCanUsePoint] = useState(0);
    const [pointConfig, setPointConfig] = useState<any>(null);

    // Shipping & Payment States
    const [shippingOptions, setShippingOptions] = useState<any[]>([]);
    const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
    const [shippingFee, setShippingFee] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<string>("money");
    const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    // Map States for New Address
    const [newPos, setNewPos] = useState<L.LatLng | null>(new L.LatLng(10.7410688, 106.7164031));
    const [mapCenter, setMapCenter] = useState<L.LatLngExpression>([10.7410688, 106.7164031]);
    const [searchKeyword, setSearchKeyword] = useState<string>("");
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [tilesError, setTilesError] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const isManualChange = useRef(false);

    const { data: settings } = useSettingGeneral();
    const GOONG_API_KEY = settings?.goongApiKey?.trim() || "";
    const GOONG_MAP_KEY = settings?.goongMapKey?.trim() || "";

    const items = useCartStore((state) => state.items);
    const totalAmount = useCartStore((state) => state.totalAmount());
    const clearCart = useCartStore((state) => state.clearCart);

    const { register, handleSubmit, setValue, watch } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            latitude: 10.7410688,
            longitude: 106.7164031
        }
    });

    const watchAddress = watch("address");
    const watchLat = watch("latitude");
    const watchLon = watch("longitude");

    // Fetch initial addresses
    useEffect(() => {
        const fetchAddresses = async () => {
            if (!user) {
                setLoadingAddresses(false);
                return;
            }
            try {
                const response = await getAddresses();
                if (response.success) {
                    setAddresses(response.data);
                    const defaultAddr = response.data.find((addr: any) => addr.isDefault);
                    if (defaultAddr) {
                        setSelectedAddressId(defaultAddr._id);
                    } else if (response.data.length > 0) {
                        setSelectedAddressId(response.data[0]._id);
                    } else {
                        setSelectedAddressId("new");
                    }
                }
            } catch (error) {
                console.error("Lỗi lấy địa chỉ:", error);
            } finally {
                setLoadingAddresses(false);
            }
        };

        fetchAddresses();
    }, [user]);

    // Initial fetch for points and details
    useEffect(() => {
        const fetchInitialDetails = async () => {
            if (items.length === 0) return;
            try {
                const activeItems = items.filter(item => item.checked);
                if (activeItems.length > 0) {
                    const response = await getCartDetails(activeItems);
                    if (response.success && response.canUsePoint !== undefined) {
                        setCanUsePoint(response.canUsePoint);
                        setPointConfig({
                            POINT_TO_MONEY: response.POINT_TO_MONEY,
                            MONEY_PER_POINT: response.MONEY_PER_POINT
                        });

                        // Đồng bộ lại vào AuthStore để các trang khác (như header, profile) cũng cập nhật theo
                        if (user) {
                            useAuthStore.getState().set({
                                user: {
                                    ...user,
                                    totalPoint: response.totalPoint,
                                    usedPoint: response.usedPoint
                                }
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("Lỗi lấy thông tin điểm:", error);
            }
        };
        fetchInitialDetails();
    }, [items.length]);

    // Calculate shipping fee when address or cart changes
    useEffect(() => {
        const calculateShipping = async () => {
            let lat, lon;

            if (selectedAddressId === "new") {
                lat = watchLat;
                lon = watchLon;
            } else {
                const activeAddress = addresses.find(addr => addr._id === selectedAddressId);
                if (!activeAddress) return;
                lat = activeAddress.latitude;
                lon = activeAddress.longitude;
            }

            if (!lat || !lon) return;

            setIsCalculatingShipping(true);
            try {
                const activeItems = items.filter(item => item.checked);
                if (activeItems.length === 0) {
                    setShippingOptions([]);
                    setShippingFee(0);
                    setSelectedShippingId(null);
                    setIsCalculatingShipping(false);
                    return;
                }

                // Now using getCartDetails to fetch both cart info and shipping info together
                const response = await getCartDetails(activeItems, {
                    latitude: lat,
                    longitude: lon
                });

                if (response.success) {
                    // Update point info
                    if (response.canUsePoint !== undefined) {
                        setCanUsePoint(response.canUsePoint);
                        setPointConfig({
                            POINT_TO_MONEY: response.POINT_TO_MONEY,
                            MONEY_PER_POINT: response.MONEY_PER_POINT
                        });
                    }

                    // Update shipping options if available
                    if (response.shippingOptions) {
                        setShippingOptions(response.shippingOptions);
                        if (response.shippingOptions.length > 0) {
                            setSelectedShippingId(response.shippingOptions[0].id);
                            setShippingFee(response.shippingOptions[0].total_fee);
                        } else {
                            setShippingOptions([]);
                            setShippingFee(0);
                            setSelectedShippingId(null);
                        }
                    }

                    // You could also update cart details here if needed
                    // updateCartFromAPI(response.cart);
                }
            } catch (error) {
                console.error("Lỗi tính phí ship:", error);
            } finally {
                setIsCalculatingShipping(false);
            }
        };

        calculateShipping();
    }, [selectedAddressId, addresses, items, watchLat, watchLon]);

    // Map Logic handling
    const fetchAddressFromCoords = async (lat: number, lon: number) => {
        setValue("latitude", lat);
        setValue("longitude", lon);
        if (!GOONG_API_KEY) return;
        try {
            console.log("Goong Reverse Geocode input:", { lat, lon });
            const res = await fetch(`https://rsapi.goong.io/Geocode?latlng=${lat},${lon}&api_key=${GOONG_API_KEY}`);
            const data = await res.json();
            console.log("Goong Reverse result:", data);
            if (data && data.results && data.results.length > 0) {
                isManualChange.current = false;
                setValue("address", data.results[0].formatted_address);
            }
        } catch (error) {
            console.error("Lỗi reverse geocoding Goong:", error);
        }
    };

    const geocodeFromAddress = async (query: string, isFromSearch: boolean = false) => {
        if (!query.trim() || query.length < 3 || !GOONG_API_KEY) return;
        try {
            const res = await fetch(`https://rsapi.goong.io/Geocode?address=${encodeURIComponent(query)}&api_key=${GOONG_API_KEY}`);
            const data = await res.json();
            if (data && data.results && data.results.length > 0) {
                const loc = data.results[0].geometry.location;
                const lat = loc.lat;
                const lon = loc.lng;
                setNewPos(new L.LatLng(lat, lon));
                setValue("latitude", lat);
                setValue("longitude", lon);
                if (isFromSearch) {
                    setMapCenter([lat, lon]);
                    setValue("address", data.results[0].formatted_address);
                    setSearchKeyword("");
                    setShowSuggestions(false);
                }
            }
        } catch (error) {
            console.error("Lỗi Geocoding Goong:", error);
        }
    };

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchKeyword.length > 2) {
                console.log(`[MAP DEBUG] --- START SEARCH: "${searchKeyword}" ---`);

                setIsLoadingSuggestions(true);
                setShowSuggestions(true);
                try {
                    // Try to fetch from both concurrently
                    const [goongRes, osmRes] = await Promise.allSettled([
                        GOONG_API_KEY ? fetch(`https://restapi.goong.io/place/autocomplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(searchKeyword)}&more_compound=true&limit=10`).then(r => r.json()) : Promise.reject("No Goong Key"),
                        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchKeyword)}&format=json&addressdetails=1&countrycodes=vn&accept-language=vi&limit=10`).then(r => r.json())
                    ]);

                    let combinedResults: any[] = [];

                    // 1. Process Goong
                    if (goongRes.status === 'fulfilled' && goongRes.value.predictions) {
                        console.log(`[MAP DEBUG] Goong OK: Found ${goongRes.value.predictions.length}`);
                        combinedResults = [...goongRes.value.predictions];
                    } else {
                        const reason = goongRes.status === 'rejected' ? goongRes.reason : 'Empty result';
                        console.error(`[MAP DEBUG] Goong Failed:`, reason);
                    }

                    // 2. Process OSM
                    if (osmRes.status === 'fulfilled' && Array.isArray(osmRes.value)) {
                        console.log(`[MAP DEBUG] OSM OK: Found ${osmRes.value.length}`);
                        const osmMapped = osmRes.value.map((item: any) => ({
                            description: item.display_name,
                            place_id: `osm-${item.place_id}`,
                            is_osm: true,
                            lat: item.lat,
                            lon: item.lon
                        }));

                        osmMapped.forEach(osmItem => {
                            const itemName = osmItem.description.split(',')[0].toLowerCase();
                            const isDuplicate = combinedResults.some(gItem =>
                                gItem.description.toLowerCase().includes(itemName)
                            );
                            if (!isDuplicate) combinedResults.push(osmItem);
                        });
                    } else {
                        const reason = osmRes.status === 'rejected' ? osmRes.reason : 'Empty result';
                        console.error(`[MAP DEBUG] OSM Failed:`, reason);
                    }

                    setSuggestions(combinedResults);
                } catch (error) {
                    console.error("[MAP DEBUG] System Error:", error);
                } finally {
                    setIsLoadingSuggestions(false);
                }
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchKeyword, GOONG_API_KEY]);

    const handleSelectSuggestion = async (suggestion: any) => {
        if (suggestion.is_osm) {
            const lat = parseFloat(suggestion.lat);
            const lon = parseFloat(suggestion.lon);
            setNewPos(new L.LatLng(lat, lon));
            setMapCenter([lat, lon]);
            setValue("latitude", lat);
            setValue("longitude", lon);
            setValue("address", suggestion.description);
            setSearchKeyword("");
            setShowSuggestions(false);
            return;
        }

        if (!GOONG_API_KEY) return;
        try {
            const res = await fetch(`https://restapi.goong.io/place/detail?place_id=${suggestion.place_id}&api_key=${GOONG_API_KEY}`);
            const data = await res.json();

            if (data && data.result) {
                const loc = data.result.geometry.location;
                const lat = loc.lat;
                const lon = loc.lng;

                setNewPos(new L.LatLng(lat, lon));
                setMapCenter([lat, lon]);
                setValue("latitude", lat);
                setValue("longitude", lon);
                setValue("address", suggestion.description);
                setSearchKeyword("");
                setShowSuggestions(false);
            }
        } catch (error) {
            console.error("Lỗi lấy chi tiết địa điểm Goong:", error);
        }
    };

    const handleShippingChange = (option: any) => {
        setSelectedShippingId(option.id);
        setShippingFee(option.total_fee);
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null); setCouponDiscount(0); setCouponCode(""); setCouponError("");
    };

    const handlePointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = parseInt(e.target.value) || 0;
        if (val < 0) val = 0;
        if (val > canUsePoint) val = canUsePoint;
        setUsedPoint(val);
        const discount = val * (pointConfig?.POINT_TO_MONEY || 0);
        setPointDiscount(discount);
    };

    const handleRemovePoint = () => {
        setUsedPoint(0);
        setPointDiscount(0);
    };

    const handlePlaceOrder = async (data: FormData) => {
        if (!selectedShippingId) {
            alert("Vui lòng chọn phương thức vận chuyển!");
            return;
        }

        const activeItems = items.filter(item => item.checked).map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            variant: item.variant
        }));

        let orderData: any = {
            items: activeItems,
            paymentMethod: paymentMethod,
            shippingMethod: selectedShippingId,
            note: data.note,
            coupon: appliedCoupon?.code || sessionStorage.getItem("couponCode") || "",
            usedPoint: usedPoint // Thêm điểm sử dụng
        };

        if (selectedAddressId === "new") {
            orderData = {
                ...orderData,
                fullName: data.fullName,
                phone: data.phone,
                address: data.address,
                latitude: data.latitude,
                longitude: data.longitude
            };
        } else {
            const selectedAddr = addresses.find(addr => addr._id === selectedAddressId);
            if (selectedAddr) {
                orderData = {
                    ...orderData,
                    fullName: selectedAddr.fullName,
                    phone: selectedAddr.phone,
                    address: selectedAddr.address,
                    latitude: selectedAddr.latitude,
                    longitude: selectedAddr.longitude
                };
            }
        }

        setIsPlacingOrder(true);
        try {
            const response = await createOrder(orderData);
            if (response.code === "success") {
                clearCart();
                if (paymentMethod === "zalopay") {
                    window.location.href = `${import.meta.env.VITE_BACKEND_URL}/client/order/payment-zalopay?orderCode=${response.orderCode}&phone=${response.phone}`;
                } else if (paymentMethod === "vnpay") {
                    window.location.href = `${import.meta.env.VITE_BACKEND_URL}/client/order/payment-vnpay?orderCode=${response.orderCode}&phone=${response.phone}`;
                } else {
                    navigate(`/order/success?orderCode=${response.orderCode}&phone=${response.phone}`);
                }
            } else {
                setIsPlacingOrder(false);
                alert(response.message || "Đặt hàng thất bại!");
            }
        } catch (error: any) {
            setIsPlacingOrder(false);
            console.error("Lỗi đặt hàng:", error);
            alert(error.response?.data?.message || "Đã có lỗi xảy ra khi đặt hàng!");
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/auth/login");
    };

    const fetchAvailableCoupons = async () => {
        setLoadingCoupons(true);
        try {
            const res = await getClientCoupons();
            if (res.success) setAvailableCoupons(res.data || []);
        } catch { /* silent */ } finally { setLoadingCoupons(false); }
    };

    const handleOpenCouponPopup = () => { setShowCouponPopup(true); fetchAvailableCoupons(); };

    const handleApplyCoupon = async (code: string) => {
        if (!code.trim()) return;
        setIsApplyingCoupon(true);
        setCouponError("");
        try {
            const res = await checkCoupon({
                code: code.trim().toUpperCase(),
                orderValue: totalAmount
            });
            if (res.success) {
                setAppliedCoupon(res.data);
                setCouponDiscount(res.data.discountAmount || 0);
                sessionStorage.setItem("couponCode", code.trim().toUpperCase());
                setShowCouponPopup(false);
                setCouponCode("");
            } else {
                setCouponError(res.message || "Mã không hợp lệ");
            }
        } catch (err: any) {
            setCouponError(err.response?.data?.message || "Không thể kết nối máy chủ");
        } finally {
            setIsApplyingCoupon(false);
        }
    };


    return (
        <>
            <ProductBanner
                pageTitle="Thanh toán"
                breadcrumbs={breadcrumbs}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-listing.jpg"
                className="bg-top"
            />

            <style dangerouslySetInnerHTML={{
                __html: `
                input:-webkit-autofill,
                input:-webkit-autofill:hover, 
                input:-webkit-autofill:focus, 
                input:-webkit-autofill:active,
                textarea:-webkit-autofill,
                textarea:-webkit-autofill:hover,
                textarea:-webkit-autofill:focus,
                textarea:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 1000px white inset !important;
                    -webkit-text-fill-color: inherit !important;
                    transition: background-color 5000s ease-in-out 0s !important;
                    background-color: white !important;
                }
                
                input, textarea {
                    background-color: white !important;
                }
                
                input:focus, textarea:focus {
                    background-color: white !important;
                }
            `}} />
            {items.length > 0 ? (
                <div className="app-container flex pb-[150px] 2xl:pb-[100px] relative">
                    <div className="w-[60%] py-[50px]">
                        <form onSubmit={handleSubmit(handlePlaceOrder)}>
                            {/* Account Header */}
                            <div className="mb-[40px] p-[20px] bg-[#fcfcfc] border border-dashed border-gray-200 rounded-[15px] flex items-center justify-between">
                                <div className="flex items-center gap-[12px] text-[16px] text-client-secondary font-medium">
                                    <div className="w-[40px] h-[40px] rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm">
                                        <User className="w-[20px] h-[20px] text-client-primary" />
                                    </div>
                                    <span>Tài khoản: <span className="font-bold">{user?.fullName}</span></span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="px-[15px] py-[8px] rounded-[10px] bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 flex items-center gap-[8px] text-[13px] font-bold"
                                >
                                    <LogOut className="w-[16px] h-[16px]" />
                                    <span>Đăng xuất</span>
                                </button>
                            </div>

                            <h2 className="text-[40px] font-secondary mt-[8px] mb-[30px] font-bold">Thông tin nhận hàng</h2>

                            {/* Danh sách địa chỉ có sẵn */}
                            {user && !loadingAddresses && addresses.length > 0 && (
                                <div className="space-y-[15px] mb-[25px]">
                                    {addresses.map((addr) => (
                                        <div
                                            key={addr._id}
                                            onClick={() => setSelectedAddressId(addr._id)}
                                            className={`relative border rounded-[20px] px-[25px] py-[18px] cursor-pointer transition-all duration-300 flex items-center gap-[20px] ${selectedAddressId === addr._id
                                                ? 'border-client-primary bg-client-primary/[0.03] ring-1 ring-client-primary/10 shadow-sm'
                                                : 'border-[#eee] hover:border-gray-300 bg-white'
                                                }`}
                                        >
                                            <div className="shrink-0 flex items-center">
                                                <input
                                                    type="radio"
                                                    checked={selectedAddressId === addr._id}
                                                    onChange={() => setSelectedAddressId(addr._id)}
                                                    className="appearance-none w-[20px] h-[20px] border-[2px] border-[#ddd] rounded-full checked:border-client-primary checked:border-[6px] transition-all cursor-pointer bg-white"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-[12px] text-[15px] font-bold text-client-secondary">
                                                    <span className="line-clamp-1">{addr.fullName}</span>
                                                    {addr.isDefault && <span className="shrink-0 bg-client-primary/10 text-client-primary text-[11px] px-[10px] py-[3px] rounded-full font-bold uppercase tracking-tighter">Mặc định</span>}
                                                </div>
                                                <div className="flex items-center gap-[25px] mt-[6px]">
                                                    <div className="flex items-center gap-[8px] text-[14px] text-gray-500 font-medium">
                                                        <Phone className="w-[16px] h-[16px] text-gray-400" />
                                                        {addr.phone}
                                                    </div>
                                                    <div className="flex items-center gap-[8px] text-[14px] text-gray-500 truncate flex-1">
                                                        <MapPin className="w-[16px] h-[16px] text-gray-400 shrink-0" />
                                                        <span className="truncate">{addr.address}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Option Sử dụng địa chỉ khác - Styled more subtly */}
                            <div
                                onClick={() => setSelectedAddressId("new")}
                                className="flex items-center gap-[12px] mb-[30px] cursor-pointer group w-fit pr-[20px]"
                            >
                                <div className="shrink-0">
                                    <input
                                        type="radio"
                                        checked={selectedAddressId === "new"}
                                        onChange={() => setSelectedAddressId("new")}
                                        className="appearance-none w-[18px] h-[18px] border-[2px] border-[#ddd] rounded-full checked:border-client-primary checked:border-[5px] transition-all cursor-pointer bg-white"
                                    />
                                </div>
                                <span className={`text-[15px] font-bold tracking-wide transition-all ${selectedAddressId === "new" ? 'text-client-primary' : 'text-gray-400 group-hover:text-client-secondary'}`}>
                                    Sử dụng địa chỉ khác
                                    <div className={`h-[2px] bg-client-primary transition-all duration-300 ${selectedAddressId === "new" ? 'w-full opacity-10' : 'w-0 opacity-0'}`}></div>
                                </span>
                            </div>

                            {/* New Address Form & Map */}
                            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${selectedAddressId === "new" ? "max-h-[1500px] opacity-100 scale-100" : "max-h-0 opacity-0 scale-95 invisible"}`}>
                                <div className="pt-[20px] space-y-[25px] mb-[40px]">
                                    <div className="grid grid-cols-2 gap-[20px]">
                                        <input
                                            type="text"
                                            placeholder="Họ và tên người nhận *"
                                            {...register("fullName")}
                                            className="rounded-[40px] border border-[#eee] text-client-secondary py-[14px] px-[28px] w-full outline-none focus:border-client-primary transition-default bg-white hover:border-gray-300"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Số điện thoại *"
                                            {...register("phone")}
                                            className="rounded-[40px] border border-[#eee] text-client-secondary py-[14px] px-[28px] w-full outline-none focus:border-client-primary transition-default bg-white hover:border-gray-300"
                                        />
                                    </div>

                                    {/* Map Integration */}
                                    <div className="space-y-[15px]">
                                        <textarea
                                            placeholder="Địa chỉ chi tiết (Số nhà, tên đường...) *"
                                            {...register("address")}
                                            rows={2}
                                            className="rounded-[20px] border border-[#eee] text-client-secondary py-[14px] px-[28px] w-full outline-none focus:border-client-primary transition-default bg-white hover:border-gray-300 resize-none"
                                            onChange={(e) => {
                                                isManualChange.current = true;
                                                setValue("address", e.target.value);
                                            }}
                                            onBlur={() => {
                                                if (isManualChange.current && watchAddress) {
                                                    geocodeFromAddress(watchAddress);
                                                    isManualChange.current = false;
                                                }
                                            }}
                                        />

                                        {/* Reduced overflow constraint to ensure suggestions are visible */}
                                        <div className="relative h-[400px] rounded-[20px] border border-[#eee] shadow-inner">
                                            {/* Search box on map */}
                                            <div className="absolute top-[20px] left-[20px] right-[20px] z-[2000] flex gap-[10px]">
                                                <div className="flex-1 relative">
                                                    <div className="absolute left-[15px] top-1/2 -translate-y-1/2">
                                                        <Search className="w-[18px] h-[18px] text-gray-400" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        className="w-full h-full border-none bg-white rounded-[12px] pl-[45px] pr-[15px] py-[12px] text-[14px] focus:outline-none shadow-lg placeholder:text-gray-400"
                                                        placeholder="Tìm kiếm vị trí trên bản đồ..."
                                                        value={searchKeyword}
                                                        onChange={(e) => setSearchKeyword(e.target.value)}
                                                    />
                                                    {showSuggestions && (
                                                        <div className="absolute top-[calc(100%+10px)] left-0 w-full bg-white rounded-[12px] shadow-2xl overflow-hidden border border-[#eee] z-[1001]">
                                                            {isLoadingSuggestions ? (
                                                                <div className="px-[20px] py-[15px] text-gray-500 text-[14px] flex items-center gap-2">
                                                                    <div className="w-4 h-4 border-2 border-client-primary border-t-transparent rounded-full animate-spin"></div>
                                                                    Đang tìm kiếm...
                                                                </div>
                                                            ) : suggestions.length > 0 ? (
                                                                suggestions.map((item, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        onClick={() => handleSelectSuggestion(item)}
                                                                        className="px-[20px] py-[15px] hover:bg-gray-50 cursor-pointer border-b border-[#f5f5f5] last:border-none flex items-start gap-[12px]"
                                                                    >
                                                                        <MapPin className="w-[16px] h-[16px] text-client-primary shrink-0 mt-[2px]" />
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[14px] font-bold text-client-secondary line-clamp-1">{item.description.split(',')[0]}</span>
                                                                            <span className="text-[12px] text-gray-500 line-clamp-1">{item.description}</span>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="px-[20px] py-[15px] text-gray-500 text-[14px]">
                                                                    Không tìm thấy địa điểm này
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <MapContainer center={mapCenter} zoom={15} style={{ height: "100%", width: "100%" }}>
                                                <TileLayer
                                                    attribution={!tilesError && GOONG_MAP_KEY ? '&copy; <a href="https://goong.io">Goong Maps</a>' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}
                                                    url={(!tilesError && GOONG_MAP_KEY)
                                                        ? `https://tiles.goong.io/assets/goong_map_web/{z}/{x}/{y}.png?api_key=${GOONG_MAP_KEY}`
                                                        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
                                                    eventHandlers={{
                                                        tileerror: (error: any) => {
                                                            console.warn("Goong Tiles error - Falling back to OSM:", error);
                                                            setTilesError(true);
                                                        }
                                                    }}
                                                />
                                                <MapController center={mapCenter} />
                                                <LocationMarker
                                                    position={newPos}
                                                    setPosition={setNewPos}
                                                    onLocationSelect={fetchAddressFromCoords}
                                                />
                                            </MapContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-[30px] mb-[40px] cursor-pointer">
                                <input type="checkbox" id="orderNotesCheckbox" checked={showOrderNotes} onChange={() => setShowOrderNotes(!showOrderNotes)} className="hidden" />
                                <label htmlFor="orderNotesCheckbox" className="text-client-text pl-[0px] text-[16px] font-medium select-none flex items-center gap-[12px]">
                                    <div className={`w-[20px] h-[20px] border-2 rounded-[4px] flex items-center justify-center transition-all ${showOrderNotes ? 'bg-client-primary border-client-primary' : 'border-[#ddd]'}`}>
                                        {showOrderNotes && <div className="w-[10px] h-[6px] border-l-2 border-b-2 border-white -rotate-45 mb-[2px]"></div>}
                                    </div>
                                    Thêm ghi chú đơn hàng
                                </label>
                                {showOrderNotes && (
                                    <div className="mt-[20px] transition-all duration-300 ease-in-out animate-fade-in-down">
                                        <textarea
                                            placeholder="Ghi chú về đơn hàng, ví dụ: thời gian giao hàng mong muốn..."
                                            {...register("note")}
                                            rows={3}
                                            className="rounded-[20px] border border-[#eee] text-client-secondary py-[14px] px-[28px] w-full outline-none focus:border-client-primary transition-default resize-none bg-white hover:border-gray-300"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="pt-[40px] border-t border-[#eee] flex items-center justify-between">
                                <Link to="/cart" className="flex items-center text-client-secondary font-secondary hover:text-client-primary transition-default group">
                                    <ArrowLeft className="text-[18px] mr-[10px] transition-transform group-hover:-translate-x-1" />
                                    <span className="text-[16px] font-secondary font-medium">Trở lại giỏ hàng</span>
                                </Link>
                            </div>
                        </form>
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="w-[40%] ml-[50px] py-[50px]">
                        <div className="sticky top-[20px] bg-white rounded-[25px] border border-[#eee] overflow-hidden">
                            <h2 className="py-[20px] px-[30px] text-[20px] font-bold text-client-secondary border-b border-[#eee]">Tóm tắt đơn hàng</h2>

                            <div className="p-[35px]">
                                {/* Product List */}
                                <ul className="mb-[25px] max-h-[300px] overflow-visible pr-[10px]">
                                    {items.filter(item => item.checked).map((item, index) => (
                                        <li key={index} className="flex mb-[20px] pb-[20px] overflow-visible border-b border-[#f9f9f9] last:border-0 last:mb-0">
                                            <div className="relative shrink-0">
                                                <div className="w-[65px] h-[65px] rounded-[12px] overflow-hidden border border-[#eee] bg-gray-50">
                                                    <img src={item.detail.images[0]} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="absolute top-0 right-0 translate-y-[-35%] translate-x-[35%] shadow-md aspect-square bg-client-primary w-[22px] rounded-full flex items-center justify-center text-white text-[11px] font-bold border-2 border-white">
                                                    {item.quantity}
                                                </div>
                                            </div>
                                            <div className="pl-[15px] pr-[10px] flex-1">
                                                <div className="text-[14px] font-bold text-client-secondary mb-[2px] line-clamp-1">{item.detail.name}</div>
                                                <p className="text-client-primary font-bold text-[13px]">{item.detail.priceNew.toLocaleString()}đ</p>
                                                {item.variant && item.variant.length > 0 && (
                                                    <div className="text-[#999] text-[11px] mt-[2px] italic">
                                                        {item.variant.map(v => v.label).join(" / ")}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-client-secondary ml-auto font-bold text-[14px] self-center">
                                                {(item.detail.priceNew * item.quantity).toLocaleString()}đ
                                            </div>
                                        </li>
                                    ))}
                                </ul>

                                {/* Shipping Options */}
                                <div className="mb-[35px] pt-[25px] border-t border-[#eee]">
                                    <h3 className="text-[16px] font-bold text-client-secondary mb-[18px] tracking-tight">
                                        Phương thức vận chuyển
                                    </h3>

                                    {isCalculatingShipping ? (
                                        <div className="py-[10px] italic text-gray-400 text-[14px]">Đang tính phí ship...</div>
                                    ) : shippingOptions.length > 0 ? (
                                        <div className="space-y-[12px]">
                                            {shippingOptions.map((option, idx) => (
                                                <label key={idx} className="flex items-center justify-between cursor-pointer group">
                                                    <div className="flex items-center gap-[12px]">
                                                        <input
                                                            type="radio"
                                                            name="shipping"
                                                            checked={selectedShippingId === option.id}
                                                            onChange={() => handleShippingChange(option)}
                                                            className="appearance-none w-[16px] h-[16px] border-[2px] border-[#ddd] rounded-full checked:border-client-primary checked:border-[5px] bg-white transition-all cursor-pointer"
                                                        />
                                                        <span className={`text-[14px] font-medium transition-colors ${selectedShippingId === option.id ? 'text-client-secondary font-bold' : 'text-gray-600'}`}>
                                                            {option.carrier_name} <span className="text-[12px] opacity-60 font-normal">({option.service})</span>
                                                        </span>
                                                    </div>
                                                    <span className={`text-[14px] font-bold ${selectedShippingId === option.id ? 'text-client-primary' : 'text-gray-500'}`}>
                                                        (+) {option.total_fee.toLocaleString()}đ
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-[13px] text-gray-400 italic">
                                            {selectedAddressId === "new" ? "Vui lòng nhập địa chỉ để xem phí ship." : "Không có phương thức vận chuyển."}
                                        </div>
                                    )}
                                </div>

                                {/* Payment Methods */}
                                <div className="mb-[35px] pt-[25px] border-t border-[#eee]">
                                    <h3 className="text-[16px] font-bold text-client-secondary mb-[18px] tracking-tight">
                                        Phương thức thanh toán
                                    </h3>
                                    <div className="space-y-[12px]">
                                        {[
                                            { id: 'money', label: 'Thanh toán khi nhận hàng (COD)' },
                                            { id: 'vnpay', label: 'Cổng thanh toán VNPAY' }
                                        ].map((method) => (
                                            <label key={method.id} className="flex items-center gap-[12px] cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name="payment"
                                                    checked={paymentMethod === method.id}
                                                    onChange={() => setPaymentMethod(method.id)}
                                                    className="appearance-none w-[16px] h-[16px] border-[2px] border-[#ddd] rounded-full checked:border-client-primary checked:border-[5px] bg-white transition-all cursor-pointer"
                                                />
                                                <span className={`text-[14px] font-medium transition-colors ${paymentMethod === method.id ? 'text-client-secondary font-bold' : 'text-gray-600'}`}>
                                                    {method.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Point Usage Section */}
                                {user && (
                                    <div className="mb-[30px] pt-[25px] border-t border-[#eee]">
                                        <h3 className="text-[16px] font-bold text-client-secondary mb-[15px] tracking-tight flex items-center gap-[8px]">
                                            <span className="text-[18px]">💎</span>
                                            Dùng điểm thưởng
                                        </h3>
                                        <div className="flex flex-col gap-[10px]">
                                            <div className="flex items-center justify-between text-[13px] text-gray-500 mb-[5px]">
                                                <span>Bạn có <span className="font-bold text-client-primary">{(canUsePoint || 0).toLocaleString()}</span> điểm</span>
                                                {canUsePoint > 0 && <span className="italic">≈ {(canUsePoint * (pointConfig?.POINT_TO_MONEY || 0)).toLocaleString()}đ</span>}
                                            </div>
                                            <div className="flex gap-[10px]">
                                                <input
                                                    type="number"
                                                    placeholder={canUsePoint > 0 ? "Nhập số điểm cần dùng" : "Bạn chưa có điểm"}
                                                    value={usedPoint || ""}
                                                    onChange={handlePointChange}
                                                    disabled={!canUsePoint || canUsePoint <= 0}
                                                    className={`flex-1 rounded-[30px] border border-[#eee] text-client-secondary py-[10px] px-[18px] text-[14px] outline-none focus:border-client-primary transition-all hover:border-gray-300 bg-white font-medium ${(!canUsePoint || canUsePoint <= 0) ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''}`}
                                                />
                                                {usedPoint > 0 && (
                                                    <button type="button" onClick={handleRemovePoint}
                                                        className="px-[18px] py-[10px] rounded-[30px] bg-red-50 text-red-500 text-[14px] font-bold hover:bg-red-100 transition-all">
                                                        Bỏ dùng
                                                    </button>
                                                )}
                                            </div>
                                            {usedPoint > 0 && (
                                                <p className="text-[11px] text-gray-400 pl-[4px]">Hệ thống sẽ quy đổi {usedPoint.toLocaleString()} điểm thành <span className="font-bold text-green-600">-{pointDiscount.toLocaleString()}đ</span></p>
                                            )}
                                            {(!canUsePoint || canUsePoint <= 0) && (
                                                <p className="text-[11px] text-gray-400 pl-[4px]">Tích lũy điểm từ các đơn hàng để được giảm giá.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Coupon Section */}
                                <div className="mb-[30px] pt-[25px] border-t border-[#eee]">
                                    <h3 className="text-[16px] font-bold text-client-secondary mb-[15px] tracking-tight flex items-center gap-[8px]">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><line x1="7" y1="7" x2="7.01" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                        Mã giảm giá
                                    </h3>

                                    {appliedCoupon ? (
                                        <div className="flex items-center justify-between bg-client-primary/[0.06] border border-client-primary/30 border-dashed rounded-[14px] px-[16px] py-[12px]">
                                            <div className="flex items-center gap-[10px]">
                                                <div className="w-[28px] h-[28px] rounded-full bg-client-primary/20 flex items-center justify-center flex-shrink-0">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#00A651" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                </div>
                                                <div>
                                                    <div className="text-[13px] font-bold text-client-primary">{appliedCoupon.code}</div>
                                                    <div className="text-[11px] text-gray-500">Giảm {couponDiscount > 0 ? couponDiscount.toLocaleString() + 'đ' : (appliedCoupon.typeDiscount === 'percentage' ? appliedCoupon.value + '%' : appliedCoupon.value?.toLocaleString() + 'đ')}</div>
                                                </div>
                                            </div>
                                            <button type="button" onClick={handleRemoveCoupon} className="w-[26px] h-[26px] rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" /></svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-[10px]">
                                            <div className="flex gap-[10px]">
                                                <input
                                                    type="text" placeholder="Nhập mã giảm giá"
                                                    value={couponCode}
                                                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon(couponCode)}
                                                    className="flex-1 rounded-[30px] border border-[#eee] text-client-secondary py-[10px] px-[18px] text-[14px] outline-none focus:border-client-primary transition-all hover:border-gray-300 bg-white font-medium tracking-wide placeholder:font-normal placeholder:tracking-normal"
                                                />
                                                <button type="button" onClick={() => handleApplyCoupon(couponCode)} disabled={isApplyingCoupon || !couponCode.trim()}
                                                    className="px-[18px] py-[10px] rounded-[30px] bg-client-primary text-white text-[14px] font-bold hover:bg-client-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0">
                                                    {isApplyingCoupon ? '...' : 'Áp dụng'}
                                                </button>
                                            </div>
                                            {couponError && <p className="text-red-500 text-[12px] pl-[4px]">{couponError}</p>}
                                            <button type="button" onClick={handleOpenCouponPopup} className="text-[13px] text-client-primary font-semibold hover:underline flex items-center gap-[6px] pl-[2px]">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                                Xem danh sách mã có thể dùng
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Coupon Popup */}
                                {showCouponPopup && (
                                    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={() => setShowCouponPopup(false)}>
                                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                                        <div className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-[480px] mx-[16px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-between px-[28px] py-[20px] border-b border-[#f0f0f0]">
                                                <div>
                                                    <h3 className="text-[18px] font-bold text-client-secondary">Chọn mã giảm giá</h3>
                                                    <p className="text-[13px] text-gray-400 mt-[2px]">Chọn 1 mã phù hợp với đơn hàng</p>
                                                </div>
                                                <button onClick={() => setShowCouponPopup(false)} className="w-[36px] h-[36px] rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#333" strokeWidth="2" strokeLinecap="round" /></svg>
                                                </button>
                                            </div>
                                            <div className="px-[28px] pt-[20px] pb-[12px]">
                                                <div className="flex gap-[10px]">
                                                    <input type="text" placeholder="Nhập mã thủ công..." value={couponCode}
                                                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                                                        className="flex-1 rounded-[30px] border border-[#eee] text-client-secondary py-[10px] px-[18px] text-[14px] outline-none focus:border-client-primary transition-all bg-white" />
                                                    <button type="button" onClick={() => handleApplyCoupon(couponCode)} disabled={isApplyingCoupon || !couponCode.trim()}
                                                        className="px-[18px] py-[10px] rounded-[30px] bg-client-primary text-white text-[14px] font-bold hover:bg-client-secondary transition-all disabled:opacity-50 whitespace-nowrap">
                                                        {isApplyingCoupon ? "..." : "Áp dụng"}
                                                    </button>
                                                </div>
                                                {couponError && <p className="text-red-500 text-[12px] mt-[8px] pl-[4px]">{couponError}</p>}
                                            </div>
                                            <div className="max-h-[340px] overflow-y-auto px-[16px] pb-[20px] space-y-[10px]">
                                                {loadingCoupons ? (
                                                    <div className="text-center py-[40px] text-gray-400 text-[14px]">Đang tải...</div>
                                                ) : availableCoupons.length === 0 ? (
                                                    <div className="text-center py-[40px]">
                                                        <div className="text-[40px] mb-[10px]">🎟️</div>
                                                        <p className="text-gray-400 text-[14px]">Hiện không có mã giảm giá công khai</p>
                                                    </div>
                                                ) : availableCoupons.map((c: any) => {
                                                    const isUsable = !c.minOrderValue || totalAmount >= c.minOrderValue;
                                                    return (
                                                        <div key={c._id} onClick={() => isUsable && handleApplyCoupon(c.code)}
                                                            className={`relative rounded-[16px] border-2 overflow-hidden flex transition-all ${isUsable ? 'border-[#eee] hover:border-client-primary cursor-pointer hover:shadow-md' : 'border-[#f5f5f5] opacity-60 cursor-not-allowed'}`}>
                                                            <div className={`w-[6px] flex-shrink-0 ${isUsable ? 'bg-client-primary' : 'bg-gray-300'}`} />
                                                            <div className="flex-1 px-[16px] py-[14px]">
                                                                <div className="flex items-start justify-between gap-[10px]">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-[8px] mb-[4px]">
                                                                            <span className={`text-[11px] font-bold px-[8px] py-[2px] rounded-full ${isUsable ? 'bg-client-primary/10 text-client-primary' : 'bg-gray-100 text-gray-400'}`}>{c.code}</span>
                                                                            {c.typeDisplay === 'public' && <span className="text-[10px] text-emerald-600 bg-emerald-50 px-[6px] py-[1px] rounded-full font-semibold">Công khai</span>}
                                                                        </div>
                                                                        <p className="text-[14px] font-bold text-client-secondary mb-[2px]">{c.name}</p>
                                                                        <div className="flex flex-wrap gap-[6px]">
                                                                            {c.minOrderValue > 0 && <span className="text-[11px] text-gray-500 bg-gray-50 px-[8px] py-[2px] rounded-full">Đơn từ {c.minOrderValue.toLocaleString()}đ</span>}
                                                                            {c.endDateFormat && <span className="text-[11px] text-gray-500 bg-gray-50 px-[8px] py-[2px] rounded-full">HSD: {c.endDateFormat}</span>}
                                                                        </div>
                                                                        {!isUsable && c.minOrderValue > 0 && <p className="text-[11px] text-red-400 mt-[4px]">Cần thêm {(c.minOrderValue - totalAmount).toLocaleString()}đ</p>}
                                                                    </div>
                                                                    <div className={`flex-shrink-0 text-center px-[10px] py-[6px] rounded-[10px] ${isUsable ? 'bg-client-primary/10' : 'bg-gray-100'}`}>
                                                                        <div className={`text-[18px] font-black leading-none ${isUsable ? 'text-client-primary' : 'text-gray-400'}`}>
                                                                            {c.typeDiscount === 'percentage' ? `${c.value}%` : `${Math.round(c.value / 1000)}K`}
                                                                        </div>
                                                                        <div className="text-[9px] text-gray-400 uppercase tracking-wide mt-[1px]">giảm</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Pricing Breakdown */}
                                <div className="space-y-[15px] pt-[25px] border-t border-[#eee]">
                                    <div className="flex justify-between text-[#666] text-[14px]">
                                        <span className="font-medium">Tạm tính</span>
                                        <span className="font-bold text-client-secondary">{totalAmount.toLocaleString()}đ</span>
                                    </div>
                                    <div className="flex justify-between text-[#666] text-[14px]">
                                        <span className="font-medium">Phí vận chuyển</span>
                                        <span className={`${shippingFee === 0 && !selectedShippingId ? 'text-gray-400' : (shippingFee === 0 ? 'text-green-600' : 'text-client-primary')} font-bold`}>
                                            {shippingFee === 0 && !selectedShippingId ? "__" : (shippingFee === 0 ? "Miễn phí" : `+${shippingFee.toLocaleString()}đ`)}
                                        </span>
                                    </div>
                                    {couponDiscount > 0 && (
                                        <div className="flex justify-between text-[#666] text-[14px]">
                                            <span className="font-medium flex items-center gap-[6px]">
                                                Giảm giá
                                                <span className="text-client-primary text-[11px] font-bold bg-client-primary/10 px-[6px] py-[1px] rounded-full">{appliedCoupon?.code}</span>
                                            </span>
                                            <span className="font-bold text-red-500">-{couponDiscount.toLocaleString()}đ</span>
                                        </div>
                                    )}
                                    {pointDiscount > 0 && (
                                        <div className="flex justify-between text-[#666] text-[14px]">
                                            <span className="font-medium flex items-center gap-[6px]">
                                                💎 Điểm thưởng ({usedPoint.toLocaleString()})
                                            </span>
                                            <span className="font-bold text-red-500">-{pointDiscount.toLocaleString()}đ</span>
                                        </div>
                                    )}
                                    <div className="pt-[20px] border-t border-[#eee] flex justify-between items-center">
                                        <span className="text-[16px] font-bold text-client-secondary uppercase tracking-tight">Tổng thanh toán</span>
                                        <div className="text-[26px] text-client-primary font-bold tracking-tighter leading-none">
                                            {Math.max(0, totalAmount + shippingFee - couponDiscount - pointDiscount).toLocaleString()}đ
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSubmit(handlePlaceOrder)}
                                        disabled={isPlacingOrder}
                                        className={`w-full mt-[30px] py-[12px] px-[25px] rounded-[30px] text-white font-bold transition-all text-[15px] flex items-center justify-center gap-2 ${isPlacingOrder
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-client-primary hover:bg-client-secondary cursor-pointer active:scale-95'
                                            }`}
                                    >
                                        {isPlacingOrder ? (
                                            "Đang tạo đơn..."
                                        ) : (
                                            "ĐẶT HÀNG NGAY"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="app-container p-[80px] text-center pb-[150px]">
                    <div className="w-[160px] h-[160px] bg-white rounded-full flex items-center justify-center mx-auto mb-[40px] border-4 border-dashed border-gray-100 shadow-xl">
                        <ShoppingCartOutlinedIcon style={{
                            fontSize: "70px",
                            color: "#eee"
                        }} />
                    </div>
                    <div className="text-client-secondary text-[32px] font-black font-secondary mb-[20px] uppercase tracking-tighter">Giỏ hàng trống trơn!</div>
                    <p className="max-w-[600px] mx-auto mb-[50px] text-client-text text-[18px] leading-relaxed opacity-60">Bạn chưa chọn được món nào ưng ý sao? Hãy cùng khám phá thêm hàng ngàn sản phẩm tuyệt vời khác từ chúng tôi nhé!</p>
                    <Link to="/shop" className="px-[60px] py-[22px] inline-flex bg-client-primary hover:bg-client-secondary transition-all text-white rounded-[9999px] font-black font-secondary text-[18px] shadow-2xl shadow-client-primary/30 active:scale-95 uppercase tracking-[0.3em] italic">
                        Tiếp tục mua hàng
                    </Link>
                </div>
            )}
            <FooterSub />
        </>
    )
}
