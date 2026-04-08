import { ArrowRight, MapPin, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Sidebar } from "./sections/Sidebar";
import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAddress } from "../../api/dashboard.api";
import { ProductBanner } from "../product/sections/ProductBanner";
import { useSettingGeneral } from "../../hooks/useSettings";

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

const schema = z.object({
    fullName: z.string()
        .min(5, "Họ tên phải có ít nhất 5 ký tự!")
        .max(50, "Họ tên không được vượt quá 50 ký tự!")
        .nonempty("Vui lòng nhập họ tên!"),
    phone: z.string()
        .nonempty("Vui lòng nhập số điện thoại!")
        .regex(/^(0?)(3[2-9]|5[6|8|9]|7[0|6-9]|8[0-6|8|9]|9[0-4|6-9])[0-9]{7}$/, "Số điện thoại không đúng định dạng!"),
    address: z.string().nonempty("Vui lòng nhập tên đường, tòa nhà, số nhà!"),
    longitude: z.number(),
    latitude: z.number(),
    isDefault: z.boolean().optional(),
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

export const AddressCreatePage = () => {
    const navigate = useNavigate();
    const [position, setPosition] = useState<L.LatLng | null>(new L.LatLng(10.7410688, 106.7164031));
    const [mapCenter, setMapCenter] = useState<L.LatLngExpression>([10.7410688, 106.7164031]);
    const [searchKeyword, setSearchKeyword] = useState<string>("");
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isNotFound, setIsNotFound] = useState(false);
    const [tilesError, setTilesError] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    const isManualChange = useRef(false);

    const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            longitude: 106.7164031,
            latitude: 10.7410688,
            isDefault: false
        }
    });

    const address = watch("address");

    const { data: settings } = useSettingGeneral();
    const GOONG_API_KEY = settings?.goongApiKey?.trim() || "";
    const GOONG_MAP_KEY = settings?.goongMapKey?.trim() || "";

    const fetchAddressFromCoords = async (lat: number, lon: number) => {
        setValue("latitude", lat);
        setValue("longitude", lon);
        if (!GOONG_API_KEY) return;
        try {
            console.log("Goong Reverse Geocode with API Key:", GOONG_API_KEY.substring(0, 5) + "...");
            const res = await fetch(`https://rsapi.goong.io/Geocode?latlng=${lat},${lon}&api_key=${GOONG_API_KEY}`);
            const data = await res.json();
            console.log("Goong Reverse Result:", data);
            if (data && data.results && data.results.length > 0) {
                isManualChange.current = false;
                setValue("address", data.results[0].formatted_address);
                setIsNotFound(false);
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

                const newPos = new L.LatLng(lat, lon);
                setPosition(newPos);
                setValue("latitude", lat);
                setValue("longitude", lon);

                if (isFromSearch) {
                    setMapCenter([lat, lon]);
                    setValue("address", data.results[0].formatted_address);
                    setSearchKeyword("");
                    setShowSuggestions(false);
                }
                setIsNotFound(false);
            } else {
                setIsNotFound(true);
            }
        } catch (error) {
            console.error("Lỗi Geocoding Goong:", error);
        }
    };

    useEffect(() => {
        if (!isManualChange.current) return;

        const timer = setTimeout(() => {
            if (address && address.length >= 3) {
                geocodeFromAddress(address);
                isManualChange.current = false;
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [address]);

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
            const newPos = new L.LatLng(lat, lon);
            setPosition(newPos);
            setMapCenter([lat, lon]);
            setValue("latitude", lat);
            setValue("longitude", lon);
            setValue("address", suggestion.description);
            setSearchKeyword("");
            setShowSuggestions(false);
            setIsNotFound(false);
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
                const newPos = new L.LatLng(lat, lon);
                setPosition(newPos);
                setMapCenter([lat, lon]);
                setValue("latitude", lat);
                setValue("longitude", lon);
                setValue("address", suggestion.description);
                setSearchKeyword("");
                setShowSuggestions(false);
                setIsNotFound(false);
            }
        } catch (error) {
            console.error("Lỗi lấy chi tiết địa điểm Goong:", error);
        }
    };

    const onSubmit = async (data: FormData) => {
        try {
            const response = await createAddress(data);
            if (response.success) {
                toast.success(response.message);
                navigate("/dashboard/address");
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error("Đã có lỗi xảy ra!");
        }
    };

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Tài khoản", to: "/dashboard/profile" },
        { label: "Danh sách địa chỉ", to: "/dashboard/address" },
        { label: "Thêm địa chỉ mới", to: `/dashboard/address/create` },
    ];

    return (
        <>
            <ProductBanner
                pageTitle="Thêm địa chỉ mới"
                breadcrumbs={breadcrumbs}
                url="https://wdtsweetheart.wpengine.com/wp-content/uploads/2025/06/bc-shop-details.jpg"
                className="bg-top"
            />

            <div className="mt-[-150px] mb-[100px] app-container flex items-stretch">
                <div className="w-[25%] px-[12px] flex">
                    <Sidebar />
                </div>
                <div className="w-[75%] px-[12px]">
                    <div className="mt-[100px] p-[35px] bg-white shadow-[0px_8px_24px_#959da533] rounded-[12px]">
                        <h3 className="text-[24px] font-[600] text-client-secondary mb-[25px] flex items-center justify-between">
                            Thêm địa chỉ mới
                            <Link className="relative overflow-hidden group bg-[#ffa500] rounded-[8px] px-[25px] py-[12px] font-[500] text-[14px] text-white" to={"/dashboard/address"}>
                                <span className="relative z-10">Hủy</span>
                                <div className="absolute top-0 left-0 w-full h-full bg-[#cc8400] transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                            </Link>
                        </h3>
                        <div className="p-[25px] border border-[#eee] rounded-[10px]">
                            <form className="space-y-[20px]" onSubmit={handleSubmit(onSubmit)}>
                                <div className="grid grid-cols-2 gap-[25px]">
                                    <div className="flex flex-col gap-[10px]">
                                        <label className="text-[15px] font-[600] text-client-secondary">Họ tên người nhận</label>
                                        <input
                                            type="text"
                                            {...register("fullName")}
                                            className={`border rounded-[10px] px-[20px] py-[15px] text-[15px] focus:outline-none focus:border-client-primary transition-all bg-[#fcfcfc] hover:bg-white ${errors.fullName ? "border-red-500" : "border-[#eee]"}`}
                                            placeholder="Nhập họ tên"
                                        />
                                        {errors.fullName && <span className="text-red-500 text-[13px]">{errors.fullName.message}</span>}
                                    </div>
                                    <div className="flex flex-col gap-[10px]">
                                        <label className="text-[15px] font-[600] text-client-secondary">Số điện thoại</label>
                                        <input
                                            type="text"
                                            {...register("phone")}
                                            className={`border rounded-[10px] px-[20px] py-[15px] text-[15px] focus:outline-none focus:border-client-primary transition-all bg-[#fcfcfc] hover:bg-white ${errors.phone ? "border-red-500" : "border-[#eee]"}`}
                                            placeholder="Nhập số điện thoại"
                                        />
                                        {errors.phone && <span className="text-red-500 text-[13px]">{errors.phone.message}</span>}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-[10px]">
                                    <label className="text-[15px] font-[600] text-client-secondary">Địa chỉ chi tiết</label>
                                    <div className="relative group">
                                        <textarea
                                            {...register("address")}
                                            rows={2}
                                            className={`w-full border rounded-[10px] px-[20px] py-[15px] text-[15px] focus:outline-none focus:border-client-primary transition-all bg-[#fcfcfc] group-hover:bg-white resize-none outline-none ${errors.address ? "border-red-500" : "border-[#eee]"}`}
                                            placeholder="Gõ địa chỉ hoặc chọn trên bản đồ..."
                                            onChange={(e) => {
                                                isManualChange.current = true;
                                                setValue("address", e.target.value);
                                                if (isNotFound) setIsNotFound(false);
                                            }}
                                        />
                                        <div className="absolute right-[12px] top-[12px]">
                                            <MapPin className="w-[18px] h-[18px] text-client-primary" />
                                        </div>
                                    </div>
                                    {errors.address && <span className="text-red-500 text-[13px]">{errors.address.message}</span>}
                                    {isNotFound && (
                                        <p className="text-[13px] text-red-500 font-[500] mt-[10px] flex items-center gap-[6px]">
                                            <span className="text-[16px]">⚠️</span>
                                            Không tìm thấy vị trí này trên bản đồ. Vui lòng kiểm tra lại địa chỉ hoặc chọn trực tiếp từ bản đồ bên dưới.
                                        </p>
                                    )}
                                </div>

                                {/* Ensure search box and suggestions are visible outside the map grid */}
                                <div className="relative h-[450px] border border-[#eee] rounded-[16px] shadow-inner group/map">
                                    <div className="absolute top-[20px] left-1/2 -translate-x-1/2 z-[2000] w-[90%] max-w-[500px]">
                                        <div className="relative flex items-center bg-white/90 backdrop-blur-md shadow-[0px_10px_30px_rgba(0,0,0,0.1)] rounded-[8px] border border-white/50 p-[5px]">
                                            <div className="pl-[15px]">
                                                <Search className="w-[18px] h-[18px] text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                className="flex-1 border-none bg-transparent rounded-[8px] px-[12px] py-[10px] text-[14px] focus:outline-none placeholder:text-gray-400"
                                                placeholder="Tìm kiếm địa điểm..."
                                                value={searchKeyword}
                                                onChange={(e) => setSearchKeyword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    geocodeFromAddress(searchKeyword, true);
                                                }}
                                                className="bg-client-secondary text-white px-[18px] py-[8px] rounded-[8px] text-[14px] font-[500] hover:bg-client-primary transition-all active:scale-95"
                                            >
                                                Tìm kiếm
                                            </button>
                                        </div>

                                        {showSuggestions && (
                                            <div className="absolute top-[calc(100%+10px)] left-0 w-full bg-white/95 backdrop-blur-lg border border-[#eee] rounded-[12px] shadow-[0px_15px_35px_rgba(0,0,0,0.15)] overflow-hidden z-[1001]">
                                                {isLoadingSuggestions ? (
                                                    <div className="px-[20px] py-[15px] text-gray-500 text-[14px] flex items-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-client-primary border-t-transparent rounded-full animate-spin"></div>
                                                        Đang tìm kiếm...
                                                    </div>
                                                ) : suggestions.length > 0 ? (
                                                    suggestions.map((item, index) => (
                                                        <div
                                                            key={index}
                                                            onClick={() => handleSelectSuggestion(item)}
                                                            className="px-[20px] py-[15px] hover:bg-client-primary/5 cursor-pointer border-b border-[#f5f5f5] last:border-none flex items-start gap-[12px] transition-colors"
                                                        >
                                                            <MapPin className="w-[16px] h-[16px] text-client-secondary shrink-0 mt-[2px]" />
                                                            <div className="flex flex-col gap-[2px]">
                                                                <span className="text-[14px] font-[500] text-[#333] line-clamp-1">
                                                                    {item.description.split(',')[0]}
                                                                </span>
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

                                    <MapContainer
                                        center={mapCenter}
                                        zoom={15}
                                        scrollWheelZoom={true}
                                        style={{ height: '100%', width: '100%' }}
                                    >
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
                                        <LocationMarker position={position} setPosition={setPosition} onLocationSelect={fetchAddressFromCoords} />
                                        <MapController center={mapCenter} />
                                    </MapContainer>

                                    <div className="absolute inset-0 pointer-events-none shadow-[inset_0px_0px_50px_rgba(0,0,0,0.02)] rounded-[16px]"></div>
                                </div>

                                {(errors.longitude || errors.latitude) && (
                                    <span className="text-red-500 text-[13px]">Vui lòng chọn vị trí trên bản đồ!</span>
                                )}

                                <div className="checkbox mt-[10px]">
                                    <input
                                        type="checkbox"
                                        id="default_address_checkbox"
                                        hidden
                                        {...register("isDefault")}
                                    />
                                    <label htmlFor="default_address_checkbox" className="text-[14px] font-[500] text-[#555] cursor-pointer select-none">
                                        Đặt làm địa chỉ mặc định
                                    </label>
                                </div>

                                <div className="flex items-center gap-[10px] pt-[10px]">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="relative overflow-hidden group bg-client-primary rounded-[8px] px-[30px] py-[12px] font-[500] text-[14px] text-white cursor-pointer flex items-center gap-[8px] disabled:opacity-50"
                                    >
                                        <span className="relative z-10">{isSubmitting ? "Đang xử lý..." : "Thêm mới địa chỉ"}</span>
                                        {!isSubmitting && <ArrowRight className="relative z-10 w-[18px] h-[18px] transition-transform duration-300 rotate-[-45deg] group-hover:rotate-0" />}
                                        <div className="absolute top-0 left-0 w-full h-full bg-client-secondary transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
