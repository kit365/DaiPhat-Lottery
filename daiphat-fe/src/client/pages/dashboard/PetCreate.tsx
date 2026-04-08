import { Link, useNavigate } from "react-router-dom";
import { Sidebar } from "./sections/Sidebar";
import { useState } from "react";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createMyPet } from "../../api/pet.api";
import { ProductBanner } from "../product/sections/ProductBanner";
import { ArrowRight, Camera } from "lucide-react";
import { uploadImagesToCloudinary } from "../../../admin/api/uploadCloudinary.api";
import CreatableSelect from "react-select/creatable";
import { useClientBreeds, useClientCreateBreed } from "../../hooks/useBreed";

interface BreedOption {
    label: string;
    value: string;
    __isNew__?: boolean;
}

const schema = z.object({
    name: z.string().min(2, "Tên thú cưng phải có ít nhất 2 ký tự!").nonempty("Vui lòng nhập tên thú cưng!"),
    type: z.enum(["dog", "cat"]),
    breed: z.string().optional(),
    weight: z.number().min(0.1, "Cân nặng phải lớn hơn 0!"),
    avatar: z.string().optional(),
    gender: z.enum(["male", "female"]),
    age: z.number().min(0, "Tuổi không hợp lệ!").optional(),
    notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export const PetCreatePage = () => {
    const navigate = useNavigate();
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string>("");

    const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            type: "dog",
            weight: 1,
            avatar: "",
            gender: "male",
            age: 0,
            notes: "",
        }
    });

    const petType = watch("type");
    const petBreed = watch("breed");
    const { data: breeds = [] } = useClientBreeds(petType);
    const { mutate: createBreedMutate } = useClientCreateBreed();

    const breedOptions: BreedOption[] = breeds.map((breed: any) => ({
        label: breed.name,
        value: breed.name,
    }));

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const urls = await uploadImagesToCloudinary(Array.from(files));
            if (urls && urls.length > 0) {
                setValue("avatar", urls[0]);
                setPreview(urls[0]);
                toast.success("Tai anh len thanh cong!");
            }
        } catch {
            toast.error("Loi tai anh!");
        } finally {
            setUploading(false);
        }
    };

    const onSubmit = async (data: FormData) => {
        try {
            const response = await createMyPet(data);
            if (response.code === 200 || response.code === 201) {
                toast.success(response.message || "Đã thêm thú cưng thành công!");
                navigate("/dashboard/pet");
                return;
            }

            toast.error(response.message || "Thêm thú cưng thất bại!");
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Đã có lỗi xảy ra!");
        }
    };

    const breadcrumbs = [
        { label: "Trang chủ", to: "/" },
        { label: "Tài khoản", to: "/dashboard/overview" },
        { label: "Danh sách thú cưng", to: "/dashboard/pet" },
        { label: "Them be moi", to: "/dashboard/pet/create" },
    ];

    return (
        <>
            <ProductBanner
                pageTitle="Thêm thú cưng mới"
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
                            Thong tin thu cung
                            <Link className="relative overflow-hidden group bg-[#ffa500] rounded-[8px] px-[25px] py-[12px] font-[500] text-[14px] text-white" to="/dashboard/pet">
                                <span className="relative z-10">Quay lai</span>
                                <div className="absolute top-0 left-0 w-full h-full bg-[#cc8400] transition-transform duration-500 ease-in-out transform scale-x-0 origin-left group-hover:scale-x-100"></div>
                            </Link>
                        </h3>

                        <div className="p-[25px] border border-[#eee] rounded-[10px]">
                            <form className="space-y-[20px]" onSubmit={handleSubmit(onSubmit)}>
                                <div className="flex flex-col items-center mb-[30px]">
                                    <div className="relative group">
                                        <div className="w-[120px] h-[120px] rounded-[12px] border-2 border-dashed border-[#ddd] overflow-hidden bg-gray-50 flex flex-col items-center justify-center text-gray-400 group-hover:border-client-primary transition-all">
                                            {preview ? (
                                                <img src={preview} className="w-full h-full object-cover" />
                                            ) : (
                                                <>
                                                    <Camera className="w-[32px] h-[32px] mb-1 opacity-50" />
                                                    <span className="text-[12px] font-[500]">Chọn ảnh</span>
                                                </>
                                            )}
                                        </div>
                                        <label className="absolute inset-0 cursor-pointer">
                                            <input type="file" hidden accept="image/*" onChange={handleAvatarChange} disabled={uploading} />
                                        </label>
                                        {uploading && (
                                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-[12px]">
                                                <div className="w-6 h-6 border-2 border-client-primary border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-3 text-[13px] text-gray-400">Hình ảnh giúp chúng mình nhận diện bé tốt hơn</p>
                                </div>

                                <div className="grid grid-cols-2 gap-[25px]">
                                    <div className="flex flex-col gap-[10px]">
                                        <label className="text-[15px] font-[600] text-client-secondary">Tên bé cưng <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            {...register("name")}
                                            className={`border rounded-[10px] px-[20px] py-[15px] text-[15px] focus:outline-none focus:border-client-primary transition-all bg-[#fcfcfc] hover:bg-white ${errors.name ? "border-red-500" : "border-[#eee]"}`}
                                            placeholder="Vi du: Lucky, Mimi..."
                                        />
                                        {errors.name && <span className="text-red-500 text-[13px]">{errors.name.message}</span>}
                                    </div>

                                    <div className="flex flex-col gap-[10px]">
                                        <label className="text-[15px] font-[600] text-client-secondary">Loài <span className="text-red-500">*</span></label>
                                        <select
                                            {...register("type")}
                                            className={`border rounded-[10px] px-[20px] py-[15px] text-[15px] focus:outline-none focus:border-client-primary transition-all bg-[#fcfcfc] hover:bg-white ${errors.type ? "border-red-500" : "border-[#eee]"}`}
                                        >
                                            <option value="dog">Chó</option>
                                            <option value="cat">Mèo</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-[25px]">
                                    <div className="flex flex-col gap-[10px]">
                                        <label className="text-[15px] font-[600] text-client-secondary">Giống bé (Breed)</label>
                                        <CreatableSelect
                                            isClearable
                                            options={breedOptions}
                                            value={petBreed ? { label: petBreed, value: petBreed } : null}
                                            onChange={(newValue) => {
                                                const value = (newValue as BreedOption)?.value || "";
                                                setValue("breed", value);
                                                if ((newValue as BreedOption)?.__isNew__) {
                                                    createBreedMutate({ name: value, type: petType });
                                                }
                                            }}
                                            placeholder="Chọn hoặc nhập giống mới..."
                                            formatCreateLabel={(inputValue) => `Thêm giống "${inputValue}"`}
                                            styles={{
                                                control: (base) => ({
                                                    ...base,
                                                    borderRadius: "10px",
                                                    padding: "8px 10px",
                                                    fontSize: "15px",
                                                    backgroundColor: "#fcfcfc",
                                                    borderColor: "#eee",
                                                    boxShadow: "none",
                                                    "&:hover": {
                                                        borderColor: "#F8721F",
                                                        backgroundColor: "white"
                                                    }
                                                }),
                                                menu: (base) => ({
                                                    ...base,
                                                    borderRadius: "10px",
                                                    fontSize: "15px",
                                                    zIndex: 100
                                                })
                                            }}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-[10px]">
                                        <label className="text-[15px] font-[600] text-client-secondary">Cân nặng (kg) <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            {...register("weight", { valueAsNumber: true })}
                                            className={`border rounded-[10px] px-[20px] py-[15px] text-[15px] focus:outline-none focus:border-client-primary transition-all bg-[#fcfcfc] hover:bg-white ${errors.weight ? "border-red-500" : "border-[#eee]"}`}
                                            placeholder="0.0"
                                        />
                                        {errors.weight && <span className="text-red-500 text-[13px]">{errors.weight.message}</span>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-[25px]">
                                    <div className="flex flex-col gap-[10px]">
                                        <label className="text-[15px] font-[600] text-client-secondary">Tuổi (Tháng)</label>
                                        <input
                                            type="number"
                                            {...register("age", { valueAsNumber: true })}
                                            className="border rounded-[10px] px-[20px] py-[15px] text-[15px] focus:outline-none focus:border-client-primary transition-all bg-[#fcfcfc] hover:bg-white border-[#eee]"
                                            placeholder="Ví dụ: 3, 12, 24..."
                                        />
                                    </div>
                                    <div className="flex flex-col gap-[10px]">
                                        <label className="text-[15px] font-[600] text-client-secondary">Giới tính</label>
                                        <div className="flex gap-6 h-[54px] items-center">
                                            {["male", "female"].map((gender) => (
                                                <label key={gender} className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        value={gender}
                                                        {...register("gender")}
                                                        className="appearance-none w-[20px] h-[20px] border-2 border-[#ddd] rounded-full checked:border-client-primary checked:border-[5px] transition-all cursor-pointer"
                                                    />
                                                    <span className="text-[14px] font-[500] text-[#555] group-hover:text-client-primary transition-colors">
                                                        {gender === "male" ? "Đực" : "Cái"}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-[10px]">
                                    <label className="text-[15px] font-[600] text-client-secondary">Ghi chú sức khỏe/Lưu ý</label>
                                    <textarea
                                        {...register("notes")}
                                        rows={3}
                                        className="border rounded-[10px] px-[20px] py-[15px] text-[15px] focus:outline-none focus:border-client-primary transition-all bg-[#fcfcfc] hover:bg-white border-[#eee] resize-none"
                                        placeholder="Ví dụ: Bé bị dị ứng xà phòng, nhát người lạ..."
                                    />
                                </div>

                                <div className="pt-[10px]">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || uploading}
                                        className="relative overflow-hidden group bg-client-primary rounded-[8px] px-[30px] py-[12px] font-[500] text-[14px] text-white cursor-pointer flex items-center gap-[8px] disabled:opacity-50"
                                    >
                                        <span className="relative z-10">{isSubmitting ? "Đang xử lý..." : "Lưu thú cưng"}</span>
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
