import React, { useState } from 'react';
import { SupportTicketResponse } from '../../../types/support.type';
import { useUpdateComplaint } from '../../hooks/useSupportTicket';
import { ImageUploadPreview } from './ImageUploadPreview';
import { AppToast } from '../../utils/toast.util';

interface AttachmentUpdateSectionProps {
    ticket: SupportTicketResponse;
}

export const AttachmentUpdateSection: React.FC<AttachmentUpdateSectionProps> = ({ ticket }) => {
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const updateMutation = useUpdateComplaint();

    const handleSubmit = () => {
        if (!attachmentFile) {
            AppToast.error('Vui lòng chọn hình ảnh minh chứng để gửi');
            return;
        }

        updateMutation.mutate(
            {
                id: ticket.id,
                data: {},
                file: attachmentFile,
            },
            {
                onSuccess: (res) => {
                    if (res.success) {
                        setAttachmentFile(null);
                    }
                },
            }
        );
    };

    return (
        <div className="bg-[#FFF4F4] rounded-[20px] p-6 lg:p-8 border border-[#ee1314]/20 flex flex-col gap-5">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ee1314] text-white flex items-center justify-center text-lg shrink-0">
                    <i className="fa-solid fa-paperclip"></i>
                </div>
                <div>
                    <h3 className="text-[18px] font-bold text-[#212B36]">Bổ sung tài liệu</h3>
                    <p className="text-[13px] text-[#637381] mt-0.5">
                        Chỉ có thể cập nhật tệp đính kèm ở trạng thái này
                    </p>
                </div>
            </div>

            <ImageUploadPreview
                value={attachmentFile}
                existingUrl={ticket.attachmentUrl}
                onChange={setAttachmentFile}
                required
                label="Hình ảnh minh chứng"
                helperText="Bắt buộc — tải lên hình ảnh bổ sung để nhân viên xử lý"
            />

            <button
                onClick={handleSubmit}
                disabled={updateMutation.isPending || !attachmentFile}
                className="self-start px-6 py-3 rounded-xl bg-[#ee1314] text-white font-bold text-[14px] hover:bg-[#c80f11] transition-colors disabled:opacity-50 cursor-pointer"
            >
                {updateMutation.isPending ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                    <>
                        <i className="fa-solid fa-upload mr-2"></i> Gửi tài liệu bổ sung
                    </>
                )}
            </button>
        </div>
    );
};
