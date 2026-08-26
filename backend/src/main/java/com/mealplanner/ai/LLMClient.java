package com.mealplanner.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealplanner.exception.AIServiceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class LLMClient {

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    public LLMClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        // Reuse a single RestTemplate with explicit timeouts (avoids creating one per call)
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);  // 10 s to establish connection
        factory.setReadTimeout(180_000);    // 3 min to read (free LLMs are slow)
        this.restTemplate = new RestTemplate(factory);
    }

    @Value("${openrouter.api.key}")
    private String apiKey;

    @Value("${openrouter.api.base-url}")
    private String baseUrl;

    // Comma-separated list of models to try in order
    @Value("${openrouter.models:openrouter/free,minimax/minimax-m3:free,minimax/minimax-m2.7:free,nvidia/nemotron-3-super-120b-a12b:free,nvidia/nemotron-3.5-lightning:free}")
    private String modelsConfig;

    public String callLLM(String prompt) {
        List<String> models = Arrays.asList(modelsConfig.split(","));
        AIServiceException lastException = null;

        for (String modelId : models) {
            modelId = modelId.trim();
            try {
                log.info("Attempting LLM call with model: {}", modelId);
                return callModel(modelId, prompt);
            } catch (AIServiceException e) {
                lastException = e;
                if (isRetryableError(e)) {
                    log.warn("Model '{}' failed ({}), trying next model...", modelId, e.getMessage());
                } else {
                    // Non-retryable error (e.g. bad auth), stop immediately
                    throw e;
                }
            }
        }

        // All models exhausted
        log.error("All {} models failed. Last error: {}", models.size(), lastException != null ? lastException.getMessage() : "unknown");
        throw new AIServiceException("All AI models are currently unavailable. Please try again in a moment.");
    }

    /**
     * Returns true if the error is worth retrying on the next model.
     * 429 (rate limit) and 404 (model not found) are retryable.
     * 401/403 (auth errors) are not — no point trying other models with the same key.
     */
    private boolean isRetryableError(AIServiceException e) {
        String msg = e.getMessage();
        if (msg == null) return false;
        return msg.contains("rate limited") || msg.contains("429")
            || msg.contains("model not found") || msg.contains("503")
            || msg.contains("timed out");
    }

    private String callModel(String modelId, String prompt) {
        Map<String, Object> requestBody = Map.of(
            "model", modelId,
            "messages", List.of(
                Map.of("role", "system", "content", "You are a precise recipe assistant that responds only with valid JSON arrays."),
                Map.of("role", "user", "content", prompt)
            ),
            "temperature", 0.7,
            "max_tokens", 3500   // increased: 2000 was causing truncation on 3-5 recipe responses
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
            String content = root.path("choices").get(0).path("message").path("content").asText();
            log.info("Successfully got response from model: {}", modelId);
            return content;

        } catch (HttpClientErrorException.NotFound e) {
            log.warn("Model '{}' not found on OpenRouter", modelId);
            throw new AIServiceException("model not found: " + modelId);
        } catch (HttpClientErrorException.TooManyRequests e) {
            log.warn("Model '{}' is rate-limited (429): {}", modelId, e.getResponseBodyAsString());
            throw new AIServiceException("rate limited: " + modelId);
        } catch (HttpClientErrorException e) {
            log.error("OpenRouter HTTP error {} for model '{}': {}", e.getStatusCode(), modelId, e.getResponseBodyAsString());
            throw new AIServiceException("AI service error: " + e.getStatusCode());
        } catch (ResourceAccessException e) {
            log.error("LLM API timeout for model '{}'", modelId);
            throw new AIServiceException("timed out: " + modelId);
        } catch (AIServiceException e) {
            throw e;
        } catch (Exception e) {
            log.error("LLM API call failed for model '{}'", modelId, e);
            throw new AIServiceException("AI service unavailable. Please try again later.");
        }
    }
}
