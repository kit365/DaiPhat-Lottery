package com.daiphat.coreapi.infrastructure.cache;

import com.daiphat.coreapi.application.port.out.settings.keys.SystemConfigCacheKeyGenerator;
import com.daiphat.coreapi.domain.model.enums.settings.ConfigType;
import com.daiphat.coreapi.domain.model.enums.settings.DataType;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("RedisSystemConfigCacheAdapter Unit Tests")
class RedisSystemConfigCacheAdapterTest {

    @Mock
    private RedisClient redisClient;

    @InjectMocks
    private RedisSystemConfigCacheAdapter adapter;

    private SystemConfigModel model() {
        return SystemConfigModel.builder()
                .id(1L)
                .configKey("VENDOR_RETURN_CUTOFF")
                .configValue("15:00")
                .configType(ConfigType.ORDER_SETTING)
                .dataType(DataType.TIME)
                .build();
    }

    @Test
    void get_readsFromRedis() {
        SystemConfigModel cached = model();
        when(redisClient.get(SystemConfigCacheKeyGenerator.byKey("VENDOR_RETURN_CUTOFF"), SystemConfigModel.class))
                .thenReturn(Optional.of(cached));

        assertThat(adapter.get("VENDOR_RETURN_CUTOFF")).contains(cached);
    }

    @Test
    void put_writesWithTtl() {
        SystemConfigModel cached = model();
        Duration ttl = Duration.ofMinutes(15);

        adapter.put("VENDOR_RETURN_CUTOFF", cached, ttl);

        verify(redisClient).set(
                SystemConfigCacheKeyGenerator.byKey("VENDOR_RETURN_CUTOFF"),
                cached,
                ttl
        );
    }

    @Test
    void evict_deletesKey() {
        adapter.evict("VENDOR_RETURN_CUTOFF");

        verify(redisClient).delete(SystemConfigCacheKeyGenerator.byKey("VENDOR_RETURN_CUTOFF"));
    }

    @Test
    void put_skipsNullModel() {
        adapter.put("VENDOR_RETURN_CUTOFF", null, Duration.ofMinutes(1));
        verify(redisClient, never()).set(anyString(), any(), any());
    }

    @Test
    void get_returnsEmptyForBlankKey() {
        assertThat(adapter.get(" ")).isEmpty();
        verify(redisClient, never()).get(anyString(), eq(SystemConfigModel.class));
    }
}
