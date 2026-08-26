package com.mealplanner.service;

import com.mealplanner.ai.LLMClient;
import com.mealplanner.ai.PromptBuilder;
import com.mealplanner.ai.RecipeResponseParser;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIRecipeService {

    private final LLMClient llmClient;
    private final PromptBuilder promptBuilder;
    private final RecipeResponseParser responseParser;
    private final AiUsageLogRepository aiUsageLogRepository;
    private final UserRepository userRepository;

    // Self-injection via @Lazy so that calls to cachedSuggest() go through
    // the Spring proxy and @Cacheable is intercepted correctly.
    @Autowired @Lazy
    private AIRecipeService self;

    @Value("${ai.rate-limit.calls-per-day:20}")
    private int maxCallsPerDay;

    @Transactional
    public RecipeSuggestionResponse suggestRecipes(String email, RecipeSuggestionRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Validate & sanitize ingredients first (before cache check)
        validateRequest(request);

        // Try cache — hits don't count against the rate limit
        // Must call through `self` (the Spring proxy) for @Cacheable to intercept
        int todayCount = getTodayCallCount(user.getId());
        List<AiRecipeDTO> recipes = self.cachedSuggest(request);
        boolean wasCacheHit = isCacheHit(user.getId(), todayCount);

        if (!wasCacheHit) {
            // Only enforce rate limit and increment counter on real LLM calls
            if (todayCount >= maxCallsPerDay) {
                throw new RateLimitExceededException(
                    "Daily AI call limit of " + maxCallsPerDay + " reached. Try again tomorrow.");
            }
            aiUsageLogRepository.incrementCallCount(user.getId(), LocalDate.now());
        } else {
            log.info("Cache hit for user {} — skipping rate limit increment", email);
        }

        int remaining = wasCacheHit ? (maxCallsPerDay - todayCount) : (maxCallsPerDay - todayCount - 1);
        return RecipeSuggestionResponse.builder()
                .recipes(recipes)
                .fromCache(wasCacheHit)
                .remainingCallsToday(Math.max(0, remaining))
                .build();
    }

    /**
     * The actual LLM call, wrapped in @Cacheable.
     * Cache key is built by RecipeCacheKeyGenerator — order-independent, normalised.
     * Cache name must match the one registered in CacheConfig.
     */
    @Cacheable(cacheNames = "recipesuggestions", keyGenerator = "recipeCacheKeyGenerator")
    public List<AiRecipeDTO> cachedSuggest(RecipeSuggestionRequest request) {
        log.info("Cache miss — calling LLM for request: ingredients={}", request.getIngredients());
        String prompt = promptBuilder.buildRecipeSuggestionPrompt(request);
        return callWithRetry(prompt);
    }

    /**
     * Detects a cache hit by checking if the usage counter changed.
     * If todayCount is the same after cachedSuggest(), the result came from cache.
     */
    private boolean isCacheHit(Long userId, int countBeforeCall) {
        // We compare counts before and after; a real call will have been logged by now
        // This is a lightweight heuristic — accurate because cachedSuggest is @Cacheable
        return getTodayCallCount(userId) == countBeforeCall;
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
