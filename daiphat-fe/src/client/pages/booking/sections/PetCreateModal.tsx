import { useState } from "react";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createMyPet } from "../../../api/pet.api";
import { Camera, X } from "lucide-react";
import { uploadImagesToCloudinary } from "../../../../admin/api/uploadCloudinary.api";
import CreatableSelect from 'react-select/creatable';
import { useBreeds, useCreateBreed } from "../../../../admin/pages/account-user/hooks/useBreed";

interface BreedOption {
    label: string;
    value: string;
    __isNew__?: boolean;
}

const schema = z.object({
    name: z.string()
        .min(2, "Tên thú cưng phải có ít nhất 2 ký tự!")
        .nonempty("Vui lòng nhập tên thú cưng!"),
    type: z.enum(["dog", "cat"]),
    breed: z.string().optional(),
    weight: z.number().min(0.1, "Cân nặng phải lớn hơn 0!"),
    avatar: z.string().optional(),
    gender: z.enum(["male", "female"]),
});

type FormData = z.infer<typeof schema>;

interface PetCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newPet: any) => void;
}

export const PetCreateModal = ({ isOpen, onClose, onSuccess }: PetCreateModalProps) => {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string>("");

    const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            type: "dog",
            weight: 1,
            avatar: "",
            gender: "male"
        }
    });

    const petType = watch("type");
    const petBreed = watch("breed");
    const { data: breeds = [] } = useBreeds(petType);
    const { mutate: createBreedMutate } = useCreateBreed();

    const breedOptions: BreedOption[] = breeds.map((b: any) => ({
        label: b.name,
        value: b.name
    }));

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setUploading(true);
            try {
                const urls = await uploadImagesToCloudinary(Array.from(files));
                if (urls && urls.length > 0) {
                    setValue("avatar", urls[0]);
                    setPreview(urls[0]);
                    toast.success("Tải ảnh lên thành công!");
                }
            } catch (err) {
                toast.error("Lỗi tải ảnh!");
            } finally {
                setUploading(false);
            }
        }
    };

    const onSubmit = async (data: FormData) => {
        try {
            const response = await createMyPet(data);
            if (response.code === 200) {
                toast.success(response.message || "Đã thêm thú cưng thành công!");
                if (response.data) {
                    onSuccess(response.data);
                }
                handleClose();
            } else {
                toast.error(response.message || "Không thể tạo thú cưng");
            }
        } catch (error: any) {
            console.error("Create pet error:", error);
            toast.error(error?.response?.data?.message || "Đã có lỗi xảy ra!");
        }
    };

    const handleClose = () => {
        reset();
        setPreview("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-[20px]">
            {/* Backdrop */}
            <div
                onClick={handleClose}
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            />

            {/* Modal Content */}
            <div className="bg-white w-full max-w-[600px] rounded-[12px] shadow-[0px_20px_60px_rgba(0,0,0,0.15)] relative overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-[25px] border-b border-[#eee]">
                    <h2 className="text-[20px] font-[600] text-client-secondary">Thêm thú cưng mới</h2>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-[30px] overflow-y-auto max-h-[80vh]">
                    <form className="space-y-[20px]" onSubmit={handleSubmit(onSubmit)}>
                        <div className="flex flex-col items-center mb-[20px]">
                            <div className="relative group">
                                <div className="w-[100px] h-[100px] rounded-[10px] border-2 border-dashed border-[#ddd] overflow-hidden bg-gray-50 flex flex-col items-center justify-center text-gray-400 group-hover:border-client-primary transition-all">
                                    {preview ? (
                                        <img src={preview} className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <Camera className="w-[28px] h-[28px] mb-1 opacity-50" />
                                            <span className="text-[11px] font-[500]">Chọn ảnh</span>
                                        </>
                                    )}
                                </div>
                                <label className="absolute inset-0 cursor-pointer">
                                    <input type="file" hidden accept="image/*" onChange={handleAvatarChange} disabled={uploading} />
                                </label>
                                {uploading && (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-[10px]">
                                        <div className="w-5 h-5 border-2 border-client-primary border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[20px]">
                            <div className="flex flex-col gap-[8px]">
                                <label className="text-[14px] font-[600] text-client-secondary">Tên bé cưng <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    {...register("name")}
                                    className={`border rounded-[8px] px-[15px] py-[12px] text-[14px] focus:outline-none focus:border-client-primary transition-all bg-[#fcfcfc] hover:bg-white ${errors.name ? "border-red-500" : "border-[#eee]"}`}
                                    placeholder="Lucky, Mimi..."
                                />
                                {errors.name && <span className="text-red-500 text-[12px]">{errors.name.message}</span>}
                            </div>

                            <div className="flex flex-col gap-[8px]">
                                <label className="text-[14px] font-[600] text-client-secondary">Loài <span className="text-red-500">*</span></label>
                                <select
                                    {...register("type")}
                                    className="border border-[#eee] rounded-[8px] px-[15px] py-[12px] text-[14px] focus:outline-none focus:border-client-primary transition-all bg-[#fcfcfc] hover:bg-white cursor-pointer"
                                >
                                    <option value="dog">Chú cún</option>
                                    <option value="cat">Bé mèo</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[20px]">
                            <div className="flex flex-col gap-[8px]">
                                <label className="text-[14px] font-[600] text-client-secondary">Giống bé (Breed)</label>
                                <CreatableSelect
                                    isClearable
                                    options={breedOptions}
                                    value={petBreed ? { label: petBreed, value: petBreed } : null}
                                    onChange={(newValue) => {
                                        const val = (newValue as BreedOption)?.value || "";
                                        setValue("breed", val);
                                        if ((newValue as any)?.__isNew__) {
                                            createBreedMutate({ name: val, type: petType });
                                        }
                                    }}
                                    placeholder="Poodle, Corgi..."
                                    formatCreateLabel={(inputValue) => `Thêm giống "${inputValue}"`}
                                    styles={{
                                        control: (base) => ({
                                            ...base,
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            backgroundColor: '#fcfcfc',
                                            borderColor: '#eee',
                                            boxShadow: 'none',
                                            '&:hover': {
                                                borderColor: '#F8721F'
                                            }
                                        }),
                                        menu: (base) => ({
                                            ...base,
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            zIndex: 100
                                        })
                                    }}
                                />
                            </div>

                            <div className="flex flex-col gap-[8px]">
                                <label className="text-[14px] font-[600] text-client-secondary">Cân nặng (kg) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    step="0.1"
                                    {...register("weight", { valueAsNumber: true })}
                                    className={`border rounded-[8px] px-[15px] py-[12px] text-[14px] focus:outline-none focus:border-client-primary transition-all bg-[#fcfcfc] hover:bg-white ${errors.weight ? "border-red-500" : "border-[#eee]"}`}
                                    placeholder="0.0"
                                />
                                {errors.weight && <span className="text-red-500 text-[12px]">{errors.weight.message}</span>}
                            </div>
                        </div>

                        <div className="flex flex-col gap-[8px]">
                            <label className="text-[14px] font-[600] text-client-secondary">Giới tính</label>
                            <div className="flex gap-5">
                                {["male", "female"].map((g) => (
                                    <label key={g} className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="radio"
                                            value={g}
                                            {...register("gender")}
                                            className="appearance-none w-[16px] h-[16px] border-2 border-[#ddd] rounded-full checked:border-client-primary checked:border-[5px] transition-all cursor-pointer"
                                        />
                                        <span className="text-[13px] font-[500] text-[#555] group-hover:text-client-primary transition-colors">
                                            {g === "male" ? "Đực" : "Cái"}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="pt-[15px] flex justify-end gap-[15px]">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-[25px] py-[10px] rounded-[8px] text-[14px] font-[600] text-[#777] hover:bg-gray-100 transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || uploading}
                                className="relative overflow-hidden group bg-client-primary rounded-[8px] px-[25px] py-[10px] font-[600] text-[14px] text-white cursor-pointer flex items-center gap-[8px] disabled:opacity-50"
                            >
                                <span className="relative z-10">{isSubmitting ? "Đang xử lý..." : "Thêm bé"}</span>
                                <div className="absolute top-0 left-0 w-full h-full bg-client-secondary transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
