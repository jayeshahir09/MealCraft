package com.mealplanner.service;

import com.mealplanner.ai.LLMClient;
import com.mealplanner.ai.PromptBuilder;
import com.mealplanner.ai.RecipeResponseParser;
import com.mealplanner.config.RecipeCacheKeyGenerator;
import com.mealplanner.dto.AiRecipeDTO;
import com.mealplanner.dto.RecipeSuggestionRequest;
import com.mealplanner.dto.RecipeSuggestionResponse;
import com.mealplanner.entity.AiUsageLog;
import com.mealplanner.entity.User;
import com.mealplanner.exception.AIServiceException;
import com.mealplanner.exception.RateLimitExceededException;
import com.mealplanner.repository.AiUsageLogRepository;
import com.mealplanner.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIRecipeService {

    private final LLMClient llmClient;
    private final PromptBuilder promptBuilder;
    private final RecipeResponseParser responseParser;
    private final AiUsageLogRepository aiUsageLogRepository;
    private final UserRepository userRepository;
    private final CacheManager cacheManager;
    private final RecipeCacheKeyGenerator recipeCacheKeyGenerator;

    @Value("${ai.rate-limit.calls-per-day:20}")
    private int maxCallsPerDay;

    @Transactional
    public RecipeSuggestionResponse suggestRecipes(String email, RecipeSuggestionRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        validateRequest(request);

        // Clear previous days' entries so they don't linger
        try {
            aiUsageLogRepository.deleteOldUsageLogs(LocalDate.now());
        } catch (Exception e) {
            log.warn("Failed to clean up old AI usage logs: {}", e.getMessage());
        }

        int todayCount = getTodayCallCount(user.getId());

        // Check Cache
        Object cacheKey = recipeCacheKeyGenerator.generate(this, null, request);
        Cache cache = cacheManager.getCache("recipesuggestions");
        Cache.ValueWrapper wrapper = (cache != null) ? cache.get(cacheKey) : null;

        List<AiRecipeDTO> recipes;
        boolean wasCacheHit = false;

        if (wrapper != null && wrapper.get() instanceof List) {
            recipes = (List<AiRecipeDTO>) wrapper.get();
            wasCacheHit = true;
            log.info("Cache hit for user {} — skipping rate limit increment", email);
        } else {
            if (todayCount >= maxCallsPerDay) {
                throw new RateLimitExceededException(
                        "Daily AI call limit of " + maxCallsPerDay + " reached. Resets at start of new day.");
            }
            log.info("Cache miss — calling LLM for request: ingredients={}", request.getIngredients());
            String prompt = promptBuilder.buildRecipeSuggestionPrompt(request);
            recipes = callWithRetry(prompt);
            if (cache != null) {
                cache.put(cacheKey, recipes);
            }
            aiUsageLogRepository.incrementCallCount(user.getId(), LocalDate.now());
            todayCount++;
        }

        int remaining = Math.max(0, maxCallsPerDay - todayCount);
        return RecipeSuggestionResponse.builder()
                .recipes(recipes)
                .fromCache(wasCacheHit)
                .remainingCallsToday(remaining)
                .maxCallsPerDay(maxCallsPerDay)
                .build();
    }

    public Map<String, Object> getAiCredits(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        try {
            aiUsageLogRepository.deleteOldUsageLogs(LocalDate.now());
        } catch (Exception e) {
            log.warn("Failed to clean up old AI usage logs: {}", e.getMessage());
        }

        int todayCount = getTodayCallCount(user.getId());
        int remaining = Math.max(0, maxCallsPerDay - todayCount);

        return Map.of(
                "remainingCallsToday", remaining,
                "maxCallsPerDay", maxCallsPerDay,
                "usedCallsToday", todayCount
        );
    }

    private List<AiRecipeDTO> callWithRetry(String prompt) {
        String rawResponse = llmClient.callLLM(prompt);
        try {
            return responseParser.parse(rawResponse);
        } catch (AIServiceException parseException) {
            // Only retry on logical failures (empty list, missing fields).
            // Structural JSON issues (truncation, bad chars) are auto-healed by the parser.
            String msg = parseException.getMessage();
            boolean isContentIssue = msg != null &&
                (msg.contains("empty recipe list") || msg.contains("missing title") || msg.contains("missing steps"));
            if (!isContentIssue) {
                log.error("Unrecoverable parse error, not retrying: {}", msg);
                throw parseException;
            }
            log.warn("LLM returned incomplete content, retrying with stricter prompt: {}", msg);
            String strictPrompt = "RESPOND ONLY WITH A JSON ARRAY. NO TEXT BEFORE OR AFTER. EVERY recipe MUST have title and steps.\n\n" + prompt;
            return responseParser.parse(llmClient.callLLM(strictPrompt));
        }
    }

    private int getTodayCallCount(Long userId) {
        return aiUsageLogRepository.findByUserIdAndUsageDate(userId, LocalDate.now())
                .map(AiUsageLog::getCallCount)
                .orElse(0);
    }

    private void validateRequest(RecipeSuggestionRequest request) {
        if (request.getIngredients() == null || request.getIngredients().isEmpty()) {
            throw new IllegalArgumentException("At least one ingredient is required");
        }
        if (request.getIngredients().size() > 50) {
            throw new IllegalArgumentException("Too many ingredients (max 50)");
        }
        request.getIngredients().forEach(ing -> {
            if (ing == null || ing.isBlank()) {
                throw new IllegalArgumentException("Ingredient names cannot be empty");
            }
            if (ing.length() > 100) {
                throw new IllegalArgumentException("Ingredient name too long: " + ing);
            }
        });
    }
}
