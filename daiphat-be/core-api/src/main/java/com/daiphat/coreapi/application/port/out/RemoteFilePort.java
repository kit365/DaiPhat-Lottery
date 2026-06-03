package com.daiphat.coreapi.application.port.out;

public interface RemoteFilePort {
    RemoteFile download(String url);

    record RemoteFile(
            byte[] data,
            String fileName,
            String contentType
    ) {
    }
}
