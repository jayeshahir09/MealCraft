package com.mealplanner.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealplanner.exception.AIServiceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class LLMClient {

    private final ObjectMapper objectMapper;

    @Value("${openrouter.api.key}")
    private String apiKey;

    @Value("${openrouter.api.base-url}")
    private String baseUrl;

    @Value("${openrouter.model}")
    private String model;

    public String callLLM(String prompt) {
        RestTemplate restTemplate = new RestTemplate();

        Map<String, Object> requestBody = Map.of(
            "model", model,
            "messages", List.of(
                Map.of("role", "system", "content", "You are a precise recipe assistant that responds only with valid JSON arrays."),
                Map.of("role", "user", "content", prompt)
            ),
            "temperature", 0.7,
            "max_tokens", 2000
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        headers.set("HTTP-Referer", "http://localhost:8080");
        headers.set("X-Title", "AI Meal Planner");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                baseUrl + "/chat/completions", entity, String.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new AIServiceException("LLM API returned non-2xx: " + response.getStatusCode());
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            return root.path("choices").get(0).path("message").path("content").asText();

        } catch (ResourceAccessException e) {
            log.error("LLM API timeout", e);
            throw new AIServiceException("AI service timed out. Please try again.");
        } catch (AIServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("LLM API call failed", e);
            throw new AIServiceException("AI service unavailable. Please try again later.");
        }
    }
}
