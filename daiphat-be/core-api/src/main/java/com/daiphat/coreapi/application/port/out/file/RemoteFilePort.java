package com.daiphat.coreapi.application.port.out.file;

public interface RemoteFilePort {
    RemoteFile download(String url);

    record RemoteFile(
            byte[] data,
            String fileName,
            String contentType
    ) {
    }
}
