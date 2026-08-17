package com.daiphat.coreapi.application.port.in.dashboard.client;
import com.daiphat.coreapi.application.dto.response.dashboard.ClientDashboardResponse;
import java.util.List; import java.util.UUID;
public interface ClientOpenRequestServicePort { List<ClientDashboardResponse.OpenRequest> getOpenRequests(UUID userId); }
