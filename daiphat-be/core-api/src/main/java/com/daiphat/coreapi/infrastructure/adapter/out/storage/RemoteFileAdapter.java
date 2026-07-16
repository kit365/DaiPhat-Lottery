package com.daiphat.coreapi.infrastructure.adapter.out.storage;

import com.daiphat.coreapi.application.port.out.file.RemoteFilePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.nio.file.Paths;

@Component
@RequiredArgsConstructor
public class RemoteFileAdapter implements RemoteFilePort {

    private final RestClient restClient = RestClient.create();

    @Override
    public RemoteFile download(String url) {
        if (url == null || url.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Remote file URL is required");
        }

        try {
            ResponseEntity<byte[]> response = restClient.get()
                    .uri(url)
                    .retrieve()
                    .toEntity(byte[].class);

            byte[] data = response.getBody();
            if (data == null || data.length == 0) {
                throw new DomainException(ErrorCode.INVALID_INPUT, "Remote file is empty");
            }

            String contentType = response.getHeaders().getContentType() != null
                    ? response.getHeaders().getContentType().toString()
                    : "image/jpeg";

            return new RemoteFile(data, resolveFileName(url), contentType);
        } catch (DomainException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR, e);
        }
    }

    private String resolveFileName(String url) {
        try {
            String path = URI.create(url).getPath();
            String fileName = Paths.get(path).getFileName().toString();
            return fileName.isBlank() ? "remote-avatar" : fileName;
        } catch (RuntimeException e) {
            return "remote-avatar";
        }
    }
}
