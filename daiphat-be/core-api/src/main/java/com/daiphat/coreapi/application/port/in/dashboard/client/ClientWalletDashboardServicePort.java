package com.daiphat.coreapi.application.port.in.dashboard.client;
import com.daiphat.coreapi.application.dto.response.dashboard.ClientDashboardResponse;
import java.util.UUID;
public interface ClientWalletDashboardServicePort { ClientDashboardResponse.Wallet getWallet(UUID userId); }
