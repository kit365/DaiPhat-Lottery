package com.daiphat.coreapi.infrastructure.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    @Value("${daiphat.firebase.project-id}")
    private String projectId;

    @Value("${daiphat.firebase.private-key-id}")
    private String privateKeyId;

    @Value("${daiphat.firebase.private-key}")
    private String privateKey;

    @Value("${daiphat.firebase.client-email}")
    private String clientEmail;

    @Value("${daiphat.firebase.client-id}")
    private String clientId;

    @PostConstruct
    public void initialize() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                String formattedPrivateKey = privateKey.replace("\\n", "\n");
                
                String jsonConfig = String.format(
                        "{\"type\": \"service_account\", \"project_id\": \"%s\", \"private_key_id\": \"%s\", \"private_key\": \"%s\", \"client_email\": \"%s\", \"client_id\": \"%s\"}",
                        projectId, privateKeyId, formattedPrivateKey.replace("\n", "\\n"), clientEmail, clientId
                );

                InputStream serviceAccount = new ByteArrayInputStream(jsonConfig.getBytes());

                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .build();

                FirebaseApp.initializeApp(options);
                System.out.println("FirebaseApp initialized successfully.");
            }
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println("Failed to initialize FirebaseApp: " + e.getMessage());
        }
    }
}
