package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("GET /import-batches/without-lines integration")
class ImportBatchWithoutLinesWebMvcIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(authorities = {"importBatch:view"})
    @DisplayName("returns 200 with a list payload")
    void getBatchesWithoutLines_returnsOk() throws Exception {
        mockMvc.perform(get("/api/v1/import-batches/without-lines"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @WithMockUser(authorities = {"importBatch:view", "importBatch:create"})
    @DisplayName("returns 200 after editing an import batch and navigating back to the list")
    void getBatchesWithoutLines_afterEdit_returnsOk() throws Exception {
        mockMvc.perform(put("/api/v1/import-batches/4")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "supplierId", 1,
                                "invoiceEvidenceUrl", "https://cdn.example/invoice-after-edit.jpg"
                        ))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/import-batches/without-lines"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }
}
