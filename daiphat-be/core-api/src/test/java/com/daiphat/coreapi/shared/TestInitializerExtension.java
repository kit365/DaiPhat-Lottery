package com.daiphat.coreapi.shared;

import org.junit.jupiter.api.extension.BeforeAllCallback;
import org.junit.jupiter.api.extension.ExtensionContext;

public class TestInitializerExtension implements BeforeAllCallback {
    static {
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    @Override
    public void beforeAll(ExtensionContext context) {
        // This method is called before any test class executes.
        // It triggers the static block which sets net.bytebuddy.experimental to true.
    }
}
