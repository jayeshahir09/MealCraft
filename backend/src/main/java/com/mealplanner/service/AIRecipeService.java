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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
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

    @Value("${ai.rate-limit.calls-per-day:20}")
    private int maxCallsPerDay;

    @Transactional
    public RecipeSuggestionResponse suggestRecipes(String email, RecipeSuggestionRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Check rate limit
        int todayCount = getTodayCallCount(user.getId());
        if (todayCount >= maxCallsPerDay) {
            throw new RateLimitExceededException(
                "Daily AI call limit of " + maxCallsPerDay + " reached. Try again tomorrow.");
        }

        // Validate & sanitize ingredients
        validateRequest(request);

        // Build prompt & call LLM with retry on parse failure
        String prompt = promptBuilder.buildRecipeSuggestionPrompt(request);
        List<AiRecipeDTO> recipes = callWithRetry(prompt);

        // Increment usage counter
        aiUsageLogRepository.incrementCallCount(user.getId(), LocalDate.now());

        int remaining = maxCallsPerDay - todayCount - 1;
        return RecipeSuggestionResponse.builder()
                .recipes(recipes)
                .fromCache(false)
                .remainingCallsToday(Math.max(0, remaining))
                .build();
    }

    private List<AiRecipeDTO> callWithRetry(String prompt) {
        try {
            String rawResponse = llmClient.callLLM(prompt);
            return responseParser.parse(rawResponse);
        } catch (AIServiceException e) {
            log.warn("First LLM attempt failed ({}), retrying with stricter prompt...", e.getMessage());
            // Retry once with a stricter prompt prefix
            String strictPrompt = "RESPOND ONLY WITH A JSON ARRAY. NO TEXT BEFORE OR AFTER.\n\n" + prompt;
            String rawResponse = llmClient.callLLM(strictPrompt);
            return responseParser.parse(rawResponse);
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
