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
import com.mealplanner.exception.RateLimitExceededException;
import com.mealplanner.repository.AiUsageLogRepository;
import com.mealplanner.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AIRecipeServiceTest {

    @Mock
    private LLMClient llmClient;
    @Mock
    private PromptBuilder promptBuilder;
    @Mock
    private RecipeResponseParser responseParser;
    @Mock
    private AiUsageLogRepository aiUsageLogRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CacheManager cacheManager;
    @Mock
    private RecipeCacheKeyGenerator recipeCacheKeyGenerator;
    @Mock
    private Cache springCache;

    @InjectMocks
    private AIRecipeService aiRecipeService;

    private User testUser;
    private RecipeSuggestionRequest validRequest;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(aiRecipeService, "maxCallsPerDay", 20);

        testUser = User.builder()
                .id(1L)
                .email("user@example.com")
                .build();

        validRequest = RecipeSuggestionRequest.builder()
                .ingredients(List.of("Salmon", "Asparagus", "Lemon"))
                .cuisine("Mediterranean")
                .maxTimeMinutes(30)
                .build();
    }

    @Test
    @DisplayName("Should successfully suggest recipes and increment usage counter on cache miss")
    void testSuggestRecipesCacheMiss() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(testUser));
        when(aiUsageLogRepository.findByUserIdAndUsageDate(eq(1L), any(LocalDate.class)))
                .thenReturn(Optional.of(AiUsageLog.builder().callCount(2).build()));

        when(cacheManager.getCache("recipesuggestions")).thenReturn(springCache);
        when(recipeCacheKeyGenerator.generate(any(), any(), any())).thenReturn("cache-key-1");
        when(springCache.get("cache-key-1")).thenReturn(null); // Cache miss

        when(promptBuilder.buildRecipeSuggestionPrompt(validRequest)).thenReturn("Generated Prompt");
        when(llmClient.callLLM("Generated Prompt")).thenReturn("Raw LLM Response");

        List<AiRecipeDTO> parsedRecipes = List.of(
                AiRecipeDTO.builder().title("Pan Seared Salmon").cuisine("Mediterranean").steps(List.of("Cook")).build()
        );
        when(responseParser.parse("Raw LLM Response")).thenReturn(parsedRecipes);

        RecipeSuggestionResponse response = aiRecipeService.suggestRecipes("user@example.com", validRequest);

        assertNotNull(response);
        assertEquals(1, response.getRecipes().size());
        assertFalse(response.isFromCache());
        // Remaining should be 20 - (2 previous + 1 current) = 17
        assertEquals(17, response.getRemainingCallsToday());

        verify(aiUsageLogRepository, times(1)).incrementCallCount(eq(1L), any(LocalDate.class));
        verify(springCache, times(1)).put("cache-key-1", parsedRecipes);
    }

    @Test
    @DisplayName("Should return cached recipes without incrementing usage counter on cache hit")
    void testSuggestRecipesCacheHit() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(testUser));
        when(aiUsageLogRepository.findByUserIdAndUsageDate(eq(1L), any(LocalDate.class)))
                .thenReturn(Optional.of(AiUsageLog.builder().callCount(5).build()));

        when(cacheManager.getCache("recipesuggestions")).thenReturn(springCache);
        when(recipeCacheKeyGenerator.generate(any(), any(), any())).thenReturn("cache-key-hit");

        List<AiRecipeDTO> cachedRecipes = List.of(
                AiRecipeDTO.builder().title("Cached Dish").steps(List.of("Step 1")).build()
        );
        Cache.ValueWrapper wrapper = () -> cachedRecipes;
        when(springCache.get("cache-key-hit")).thenReturn(wrapper); // Cache hit!

        RecipeSuggestionResponse response = aiRecipeService.suggestRecipes("user@example.com", validRequest);

        assertNotNull(response);
        assertTrue(response.isFromCache());
        assertEquals(15, response.getRemainingCallsToday()); // 20 - 5 = 15

        verify(aiUsageLogRepository, never()).incrementCallCount(any(), any());
        verify(llmClient, never()).callLLM(any());
    }

    @Test
    @DisplayName("Should throw RateLimitExceededException when user hits 20 daily calls limit")
    void testRateLimitExceeded() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(testUser));
        when(aiUsageLogRepository.findByUserIdAndUsageDate(eq(1L), any(LocalDate.class)))
                .thenReturn(Optional.of(AiUsageLog.builder().callCount(20).build()));

        when(cacheManager.getCache("recipesuggestions")).thenReturn(springCache);
        when(recipeCacheKeyGenerator.generate(any(), any(), any())).thenReturn("cache-key-miss");
        when(springCache.get("cache-key-miss")).thenReturn(null);

        assertThrows(RateLimitExceededException.class, () ->
                aiRecipeService.suggestRecipes("user@example.com", validRequest));
    }

    @Test
    @DisplayName("Should return accurate AI credits payload")
    void testGetAiCredits() {
        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(testUser));
        when(aiUsageLogRepository.findByUserIdAndUsageDate(eq(1L), any(LocalDate.class)))
                .thenReturn(Optional.of(AiUsageLog.builder().callCount(6).build()));

        Map<String, Object> credits = aiRecipeService.getAiCredits("user@example.com");

        assertNotNull(credits);
        assertEquals(14, credits.get("remainingCallsToday")); // 20 - 6 = 14
        assertEquals(20, credits.get("maxCallsPerDay"));
        assertEquals(6, credits.get("usedCallsToday"));
    }
}
