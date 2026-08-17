import { apiApp } from '../../../../../api';
import { withAuthHeaders } from '../../../../../api/authHeaders';
import type { ApiResponse } from '../../../../../types/api.type';

/** Hard-delete a file from Cloudinary / local storage by public URL. */
export const deleteStoredFileByUrl = async (url: string): Promise<ApiResponse<null>> => {
    const response = await apiApp.post(
        '/storage/delete',
        { url },
        {
            ...withAuthHeaders(),
            skipGlobalErrorToast: true,
        }
    );
    return response.data;
};
