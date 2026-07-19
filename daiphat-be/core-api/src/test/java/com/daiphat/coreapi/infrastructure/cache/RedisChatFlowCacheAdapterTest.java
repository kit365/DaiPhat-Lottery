package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.port.out.chat.ChatFlowCachePayload;
import com.daiphat.coreapi.application.port.out.chat.keys.ChatCacheKeyGenerator;
import com.daiphat.coreapi.domain.model.chat.PendingFlowState;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.databind.jsontype.PolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("RedisChatFlowCacheAdapter")
class RedisChatFlowCacheAdapterTest {

    private static final Long CONVERSATION_ID = 42L;
    private static final String KEY = ChatCacheKeyGenerator.activeFlows(CONVERSATION_ID);
    private static final Duration TTL = Duration.ofMinutes(10);

    @Mock
    private RedisClient redisClient;

    private RedisChatFlowCacheAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new RedisChatFlowCacheAdapter(redisClient);
    }

    @Test
    void loadFlows_returnsCachedFlows() {
        PendingFlowState flow = PendingFlowState.builder()
                .flowId("flow-1")
                .intent("WEB_SCHEDULE")
                .pendingSlot("LOCATION")
                .collectedSlots(Map.of())
                .createdAt(Instant.parse("2026-07-05T10:00:00Z"))
                .lastTouchedAt(Instant.parse("2026-07-05T10:01:00Z"))
                .reentryCount(0)
                .build();
        when(redisClient.get(KEY, ChatFlowCachePayload.class))
                .thenReturn(Optional.of(new ChatFlowCachePayload(List.of(flow))));

        assertThat(adapter.loadFlows(CONVERSATION_ID)).containsExactly(flow);
    }

    @Test
    void loadFlows_whenRedisFails_returnsEmptyList() {
        when(redisClient.get(KEY, ChatFlowCachePayload.class))
                .thenThrow(new RuntimeException("connection refused"));

        assertThat(adapter.loadFlows(CONVERSATION_ID)).isEmpty();
    }

    @Test
    void saveFlows_writesPayloadWithTtl() {
        PendingFlowState flow = PendingFlowState.create("WEB_SCHEDULE");

        adapter.saveFlows(CONVERSATION_ID, List.of(flow), TTL);

        ArgumentCaptor<ChatFlowCachePayload> payloadCaptor = ArgumentCaptor.forClass(ChatFlowCachePayload.class);
        verify(redisClient).set(eq(KEY), payloadCaptor.capture(), eq(TTL));
        assertThat(payloadCaptor.getValue().flows()).hasSize(1);
    }

    @Test
    void saveFlows_whenEmpty_deletesKey() {
        adapter.saveFlows(CONVERSATION_ID, List.of(), TTL);

        verify(redisClient).delete(KEY);
        verify(redisClient, never()).set(any(), any(), any());
    }

    @Test
    void saveFlows_whenRedisFails_doesNotThrow() {
        doThrow(new RuntimeException("connection refused"))
                .when(redisClient)
                .set(eq(KEY), any(), eq(TTL));

        adapter.saveFlows(CONVERSATION_ID, List.of(PendingFlowState.create("WEB_SCHEDULE")), TTL);
    }

    @Test
    void deleteFlows_removesKey() {
        adapter.deleteFlows(CONVERSATION_ID);

        verify(redisClient).delete(KEY);
    }

    @Test
    void chatFlowCachePayload_survivesRedisPolymorphicRoundTrip() throws Exception {
        ObjectMapper redisObjectMapper = new ObjectMapper();
        redisObjectMapper.registerModule(new JavaTimeModule());
        redisObjectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        PolymorphicTypeValidator ptv = BasicPolymorphicTypeValidator.builder()
                .allowIfBaseType(Object.class)
                .allowIfSubType("com.daiphat.")
                .allowIfSubType("java.util.")
                .allowIfSubType("java.lang.")
                .allowIfSubType("java.time.")
                .build();
        redisObjectMapper.activateDefaultTyping(
                ptv,
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.PROPERTY
        );

        PendingFlowState flow = PendingFlowState.create("WEB_SEARCH")
                .withPendingSlot("TICKET_FRAGMENT")
                .withCollectedSlots(Map.of("ticket_match_mode", "prefix"));
        ChatFlowCachePayload payload = new ChatFlowCachePayload(List.of(flow));

        GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(redisObjectMapper);
        byte[] bytes = serializer.serialize(payload);
        Object raw = serializer.deserialize(bytes);

        assertThat(raw).isInstanceOf(ChatFlowCachePayload.class);
        ChatFlowCachePayload restored = (ChatFlowCachePayload) raw;
        assertThat(restored.flows()).hasSize(1);
        assertThat(restored.flows().getFirst().pendingSlot()).isEqualTo("TICKET_FRAGMENT");
        assertThat(restored.flows().getFirst().collectedSlots())
                .containsEntry("ticket_match_mode", "prefix");
    }
}
