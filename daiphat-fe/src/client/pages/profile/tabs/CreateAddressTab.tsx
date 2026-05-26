import React, { useState, useEffect } from 'react';
import { MapPin, ArrowUpRight, ArrowLeft } from "lucide-react";
import { AppToast as toast } from "../../../utils/toast.util";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';

const GOONG_MAPTILES_KEY = "SslY4jJ8euo9DM7LMlEqD8t6SMAyBmt8HwnRnOzw";
const GOONG_API_KEY = "IpZcTBRFm7ySh1dCuQlAOwgBiG7sCclYMVO2O0e9";

const MapUpdater = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
};

const LocationPicker = ({ position, setPosition, setAddressLine }: { position: [number, number], setPosition: any, setAddressLine: any }) => {
    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
            fetch(`https://rsapi.goong.io/Geocode?latlng=${e.latlng.lat},${e.latlng.lng}&api_key=${GOONG_API_KEY}`)
                .then(res => res.json())
                .then(data => {
                    if (data.results && data.results.length > 0) {
                        setAddressLine(data.results[0].formatted_address);
                    }
                })
                .catch(() => {});
        },
    });
    return <Marker position={position} />;
};

export const CreateAddressTab = () => {
    const navigate = useNavigate();
    const [position, setPosition] = useState<[number, number]>([10.762622, 106.660172]);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        addressLine: '',
        isDefault: false
    });

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!searchQuery.trim()) {
                setSuggestions([]);
                return;
            }
            try {
                const res = await fetch(`https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&location=10.762622,106.660172&radius=30000&input=${encodeURIComponent(searchQuery)}`);
                const data = await res.json();
                if (data.predictions) {
                    setSuggestions(data.predictions);
                } else {
                    setSuggestions([]);
                }
            } catch (error) {
                console.error("Autocomplete error:", error);
            }
        };

        const timer = setTimeout(fetchSuggestions, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectSuggestion = async (placeId: string, description: string) => {
        setSearchQuery(description);
        setFormData(prev => ({ ...prev, addressLine: description }));
        setSuggestions([]);
        setIsSearching(true);
        try {
            const res = await fetch(`https://rsapi.goong.io/Place/Detail?place_id=${placeId}&api_key=${GOONG_API_KEY}`);
            const data = await res.json();
            if (data.result && data.result.geometry) {
                const pos = data.result.geometry.location;
                setPosition([pos.lat, pos.lng]);
                setFormData(prev => ({ ...prev, addressLine: data.result.formatted_address || description }));
            }
        } catch (error) {
            toast.error("Lỗi lấy thông tin địa điểm");
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchMap = async () => {
        if (!searchQuery) return;
        try {
            const res = await fetch(`https://rsapi.goong.io/geocode?address=${encodeURIComponent(searchQuery)}&api_key=${GOONG_API_KEY}`);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                const pos = data.results[0].geometry.location;
                setPosition([pos.lat, pos.lng]);
                setFormData(prev => ({ ...prev, addressLine: data.results[0].formatted_address }));
            } else {
                toast.error("Không tìm thấy địa điểm");
            }
        } catch (error) {
            toast.error("Lỗi tìm kiếm");
        }
    };

    const handleSaveAddress = () => {
        if (!formData.fullName || !formData.phone || !formData.addressLine) {
            toast.error("Vui lòng điền đầy đủ thông tin bắt buộc!");
            return;
        }
        // In real app, call API to save
        toast.success("Thêm địa chỉ thành công!");
        navigate('/profile/address');
    };

    return (
        <div className="bg-white border border-[#E5E8EB] rounded-xl shadow-sm">
            <div className="flex justify-between items-center p-6 border-b border-[#E5E8EB]">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/profile/address')}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} className="text-[#637381]" />
                    </button>
                    <h3 className="text-[20px] font-bold text-[#212B36]">Thêm Địa Chỉ</h3>
                </div>
                <button 
                    onClick={() => navigate('/profile/address')}
                    className="px-6 py-2 bg-[#D13939] text-white rounded-[4px] text-[14px] font-medium hover:bg-[#b02e2e] transition-colors"
                >
                    Hủy
                </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="relative">
                        <label className="absolute -top-2.5 left-3 bg-white px-1 text-[13px] text-[#637381] z-10">Họ Tên *</label>
                        <input 
                            type="text" 
                            placeholder="Ví dụ: Lê Văn A"
                            value={formData.fullName}
                            onChange={e => setFormData({...formData, fullName: e.target.value})}
                            className="w-full border border-[#E5E8EB] rounded-[4px] px-4 py-3.5 text-[14px] text-[#212B36] outline-none focus:border-[#BA0000] transition-colors bg-transparent relative z-0"
                        />
                    </div>
                    <div className="relative">
                        <label className="absolute -top-2.5 left-3 bg-white px-1 text-[13px] text-[#637381] z-10">Số Điện Thoại *</label>
                        <input 
                            type="tel" 
                            placeholder="Ví dụ: 0987654321"
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                            className="w-full border border-[#E5E8EB] rounded-[4px] px-4 py-3.5 text-[14px] text-[#212B36] outline-none focus:border-[#BA0000] transition-colors bg-transparent relative z-0"
                        />
                    </div>
                </div>

                <div className="relative mt-2">
                    <label className="absolute -top-2.5 left-3 bg-white px-1 text-[13px] text-[#637381] z-20">Chọn địa chỉ trên bản đồ *</label>
                    <div className="flex rounded-[4px] border border-[#E5E8EB] overflow-hidden focus-within:border-[#BA0000] transition-colors relative z-10 bg-white">
                        <input 
                            type="text" 
                            placeholder="Nhập địa chỉ cần tìm..."
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value);
                                if (!e.target.value) setSuggestions([]);
                            }}
                            onKeyDown={e => e.key === 'Enter' && handleSearchMap()}
                            className="flex-1 px-4 py-3.5 text-[14px] text-[#212B36] outline-none bg-transparent"
                        />
                        <button 
                            onClick={handleSearchMap}
                            disabled={isSearching}
                            className="px-6 py-3.5 bg-white text-[#212B36] text-[14px] border-l border-[#E5E8EB] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Tìm kiếm
                        </button>
                    </div>
                    
                    {suggestions.length > 0 && (
                        <ul className="absolute left-0 right-0 top-[100%] mt-1 bg-white border border-[#E5E8EB] rounded-lg shadow-lg z-30 max-h-60 overflow-y-auto">
                            {suggestions.map((suggestion, index) => (
                                <li 
                                    key={index}
                                    onClick={() => handleSelectSuggestion(suggestion.place_id, suggestion.description)}
                                    className="px-4 py-3 text-[14px] text-[#212B36] hover:bg-[#F4F6F8] cursor-pointer border-b border-gray-50 last:border-b-0 flex items-start gap-2 transition-colors"
                                >
                                    <MapPin size={16} className="mt-0.5 text-[#637381] shrink-0" />
                                    <span className="flex-1">{suggestion.description}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="h-[400px] rounded-[4px] border border-[#E5E8EB] overflow-hidden z-0">
                    <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapUpdater center={position} />
                        <LocationPicker 
                            position={position} 
                            setPosition={setPosition} 
                            setAddressLine={(val: string) => setFormData(prev => ({...prev, addressLine: val}))} 
                        />
                    </MapContainer>
                </div>
                
                <div className="relative mt-2">
                    <label className="absolute -top-2.5 left-3 bg-white px-1 text-[13px] text-[#637381] z-10">Địa Chỉ *</label>
                    <textarea 
                        rows={2}
                        value={formData.addressLine}
                        onChange={e => setFormData({...formData, addressLine: e.target.value})}
                        className="w-full border border-[#E5E8EB] rounded-[4px] px-4 py-3.5 text-[14px] text-[#212B36] outline-none focus:border-[#BA0000] transition-colors resize-none bg-transparent relative z-0"
                    />
                </div>
                
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <input 
                        type="checkbox" 
                        checked={formData.isDefault}
                        onChange={e => setFormData({...formData, isDefault: e.target.checked})}
                        className="w-4 h-4 accent-[#BA0000]"
                    />
                    <span className="text-[14px] text-[#212B36]">Đặt làm địa chỉ mặc định</span>
                </label>

                <button 
                    onClick={handleSaveAddress}
                    className="w-fit flex items-center gap-2 mt-2 px-6 py-2.5 bg-[#BA0000] text-white font-medium text-[15px] rounded-[4px] hover:bg-[#990000] transition-colors"
                >
                    Thêm Mới <ArrowUpRight size={18} />
                </button>
            </div>
        </div>
    );
};
