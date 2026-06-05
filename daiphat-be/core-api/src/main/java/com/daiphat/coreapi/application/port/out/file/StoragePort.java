package com.daiphat.coreapi.application.port.out.file;

import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;

public interface StoragePort {
    StorageResult upload(UploadRequest request);

    StorageResult overwrite(String publicId, UploadRequest request);

    void delete(String publicId);
}
