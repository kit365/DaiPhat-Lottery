package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.generator.streetagent.StreetAgentContractCodeGenerator;
import com.daiphat.coreapi.application.generator.streetagent.VendorBatchCodeGenerator;
import com.daiphat.coreapi.shared.time.VietnamClock;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class StreetAgentCodeGeneratorTest {

    @Test
    void generates_batch_and_contract_codes_from_their_documented_formats() {
        VietnamClock clock = new VietnamClock(Clock.fixed(Instant.parse("2026-08-13T17:30:00Z"), ZoneOffset.UTC));

        assertThat(new VendorBatchCodeGenerator().nextCode()).matches("VND-[A-F0-9]{8}");
        assertThat(new StreetAgentContractCodeGenerator(clock).nextCode())
                .matches("HD-CTV-20260814-[A-F0-9]{8}");
        assertThat(clock.today()).hasToString("2026-08-14");
    }
}
