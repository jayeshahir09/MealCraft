package com.mealplanner.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealplanner.exception.AIServiceException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpStatusCodeException;
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
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(8_000);   // 8 s connect
        factory.setReadTimeout(35_000);     // 35 s read per model (fits well under Render 100s timeout)
        this.restTemplate = new RestTemplate(factory);
    }

    @Value("${openrouter.api.key:}")
    private String apiKey;

    @Value("${openrouter.api.base-url:https://openrouter.ai/api/v1}")
    private String baseUrl;

    // Comma-separated list of models to try in order
    @Value("${openrouter.models:openrouter/free,meta-llama/llama-3.3-70b-instruct:free,google/gemma-2-9b-it:free,mistralai/mistral-7b-instruct:free,qwen/qwen-2.5-72b-instruct:free}")
    private String modelsConfig;

    public String callLLM(String prompt) {
        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.trim().startsWith("${") || apiKey.trim().equals("your-openrouter-api-key")) {
            log.warn("OPENROUTER_API_KEY is not configured in environment variables. Activating recipe fallback engine.");
            throw new AIServiceException("OPENROUTER_API_KEY is missing or invalid");
        }

        List<String> models = Arrays.asList(modelsConfig.split(","));
        AIServiceException lastException = null;

        for (String modelId : models) {
            modelId = modelId.trim();
            if (modelId.isEmpty()) continue;
            try {
                log.info("Attempting LLM call with model: {}", modelId);
                return callModel(modelId, prompt);
            } catch (AIServiceException e) {
                lastException = e;
                if (isRetryableError(e)) {
                    log.warn("Model '{}' failed ({}), trying next fallback model...", modelId, e.getMessage());
                } else {
                    // Non-retryable error (e.g. bad auth), stop immediately
                    throw e;
                }
            }
        }

        // All models exhausted
        log.error("All {} models failed. Last error: {}", models.size(), lastException != null ? lastException.getMessage() : "unknown");
        throw new AIServiceException("All AI models are currently unavailable: " + (lastException != null ? lastException.getMessage() : "unknown"));
    }

    /**
     * Returns true if the error is worth retrying on the next model.
     * All connection, timeout, 404, 429, and 5xx server errors should retry next model.
     * Only 401/403 or missing API key are non-retryable.
     */
    private boolean isRetryableError(AIServiceException e) {
        String msg = e.getMessage();
        if (msg == null) return true;
        if (msg.contains("auth error") || msg.contains("API key missing") || msg.contains("401") || msg.contains("403")) {
            return false;
        }
        return true;
    }

    private String callModel(String modelId, String prompt) {
        Map<String, Object> requestBody = Map.of(
            "model", modelId,
            "messages", List.of(
                Map.of("role", "system", "content", "You are a precise recipe assistant that responds only with valid JSON arrays."),
                Map.of("role", "user", "content", prompt)
            ),
            "temperature", 0.7,
            "max_tokens", 3500
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey.trim());
        headers.set("HTTP-Referer", "https://mealcraft-xcme.onrender.com");
        headers.set("X-Title", "MealCraft");

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
            log.warn("Model '{}' not found on OpenRouter (404)", modelId);
            throw new AIServiceException("model not found: " + modelId);
        } catch (HttpClientErrorException.TooManyRequests e) {
            log.warn("Model '{}' is rate-limited (429): {}", modelId, e.getResponseBodyAsString());
            throw new AIServiceException("rate limited: " + modelId);
        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden e) {
            log.error("Authentication failed (401/403) with OpenRouter. Check OPENROUTER_API_KEY: {}", e.getStatusCode());
            throw new AIServiceException("auth error: " + e.getStatusCode());
        } catch (HttpStatusCodeException e) {
            log.warn("OpenRouter HTTP error {} for model '{}': {}", e.getStatusCode(), modelId, e.getResponseBodyAsString());
            throw new AIServiceException("AI HTTP error (" + e.getStatusCode().value() + ") on model: " + modelId);
        } catch (ResourceAccessException e) {
            log.warn("LLM API timeout/network error for model '{}': {}", modelId, e.getMessage());
            throw new AIServiceException("timed out: " + modelId);
        } catch (AIServiceException e) {
            throw e;
        } catch (Exception e) {
            log.warn("LLM API call failed for model '{}': {}", modelId, e.getMessage());
            throw new AIServiceException("AI error on model: " + modelId);
        }
    }
}
