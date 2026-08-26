package com.mealplanner.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealplanner.dto.AiRecipeDTO;
import com.mealplanner.exception.AIServiceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class RecipeResponseParser {

    private final ObjectMapper objectMapper;

    public List<AiRecipeDTO> parse(String rawResponse) {
        String cleaned = extractJson(rawResponse);
        try {
            List<AiRecipeDTO> recipes = objectMapper.readValue(cleaned, new TypeReference<>() {});
            if (recipes == null || recipes.isEmpty()) {
                throw new AIServiceException("LLM returned empty recipe list");
            }
            // Validate each recipe has required fields
            for (AiRecipeDTO recipe : recipes) {
                if (recipe.getTitle() == null || recipe.getTitle().isBlank()) {
                    throw new AIServiceException("Recipe missing title in LLM response");
                }
                if (recipe.getSteps() == null || recipe.getSteps().isEmpty()) {
                    throw new AIServiceException("Recipe missing steps in LLM response");
                }
            }
            return recipes;
        } catch (JsonProcessingException e) {
            log.error("Failed to parse LLM JSON response: {}", cleaned, e);
            throw new AIServiceException("Failed to parse recipe suggestions from AI response");
        }
    }

    private String extractJson(String rawResponse) {
        if (rawResponse == null) throw new AIServiceException("LLM returned null response");
        // Strip markdown code blocks if present
        String cleaned = rawResponse.trim();
        if (cleaned.startsWith("```")) {
            int mdStart = cleaned.indexOf('[');
            int mdEnd = cleaned.lastIndexOf(']');
            if (mdStart != -1 && mdEnd != -1) {
                cleaned = cleaned.substring(mdStart, mdEnd + 1);
            }
        }
        // Extract JSON array — use everything from first '[' onward;
        // repairTruncatedJson will handle a missing or misplaced closing ']'
        int start = cleaned.indexOf('[');
        if (start == -1) {
            throw new AIServiceException("LLM response does not contain a JSON array");
        }
        return sanitizeJson(cleaned.substring(start));
    }

    /**
     * Strips non-ASCII / non-printable characters that LLMs sometimes hallucinate
     * into numeric fields (e.g. "estimatedTimeMinutes": η90).
     * Keeps printable ASCII (0x20–0x7E) plus standard whitespace (\t \n \r).
     * Also repairs truncated arrays (LLM cut off mid-object).
     */
    private String sanitizeJson(String json) {
        // Remove any character outside printable ASCII range
        String sanitized = json.replaceAll("[^\\x20-\\x7E\\t\\n\\r]", "");
        // Fix dangling non-numeric prefix on number values, e.g. ": η90" → ": 90"
        sanitized = sanitized.replaceAll("(?<=[:,\\[\\s])\\s*[^0-9\\-\\.\"\\[\\{\\]\\}trfn\\s]+([0-9])", "$1");
        // Repair truncated array (LLM response cut off mid-object)
        sanitized = repairTruncatedJson(sanitized);
        return sanitized;
    }

    /**
     * Walks the JSON string character-by-character (respecting strings and escape
     * sequences) to find the position of every fully-closed top-level object '{}'.
     * Trims the array at the last complete object and appends ']', so a response
     * truncated mid-object is recovered instead of failing the whole request.
     */
    private String repairTruncatedJson(String json) {
        int depth = 0;
        int lastCompleteObjectEnd = -1;
        boolean inString = false;
        boolean escape = false;

        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);
            if (escape)          { escape = false; continue; }
            if (c == '\\' && inString) { escape = true;  continue; }
            if (c == '"')        { inString = !inString; continue; }
            if (inString)        { continue; }

            if      (c == '{') { depth++; }
            else if (c == '}') {
                depth--;
                if (depth == 0) lastCompleteObjectEnd = i;
            }
        }

        if (lastCompleteObjectEnd == -1) {
            // No complete top-level object found — return as-is and let Jackson report the error
            return json;
        }

        // Keep everything up to and including the last '}', then close the array
        String repaired = json.substring(0, lastCompleteObjectEnd + 1).trim();
        if (repaired.endsWith(",")) {
            repaired = repaired.substring(0, repaired.length() - 1);
        }
        if (!repaired.endsWith("]")) {
            repaired = repaired + "]";
        }
        return repaired;
    }
}
