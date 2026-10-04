package com.mealplanner.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.*;

class UnitConverterTest {

    @Test
    @DisplayName("Should normalize common synonyms and plurals")
    void testNormalizeIngredientName() {
        assertEquals("coriander", UnitConverter.normalizeIngredientName("Cilantro"));
        assertEquals("green onion", UnitConverter.normalizeIngredientName("Scallions"));
        assertEquals("green onion", UnitConverter.normalizeIngredientName("Spring Onion"));
        assertEquals("tomato", UnitConverter.normalizeIngredientName("Tomatoes"));
        assertEquals("potato", UnitConverter.normalizeIngredientName("Potatoes"));
        assertEquals("egg", UnitConverter.normalizeIngredientName("Eggs"));
        assertEquals("garlic", UnitConverter.normalizeIngredientName("Garlic Cloves"));
        assertEquals("all-purpose flour", UnitConverter.normalizeIngredientName("Flour"));
        assertEquals("bell pepper", UnitConverter.normalizeIngredientName("Capsicum"));
        assertEquals("salt", UnitConverter.normalizeIngredientName("Table Salt"));
    }

    @Test
    @DisplayName("Should return empty string for null or blank names")
    void testNormalizeBlank() {
        assertEquals("", UnitConverter.normalizeIngredientName(null));
        assertEquals("", UnitConverter.normalizeIngredientName("   "));
    }

    @ParameterizedTest
    @CsvSource({
            "g, WEIGHT",
            "kg, WEIGHT",
            "oz, WEIGHT",
            "lbs, WEIGHT",
            "ml, VOLUME",
            "l, VOLUME",
            "cups, VOLUME",
            "tbsp, VOLUME",
            "tsp, VOLUME",
            "pcs, COUNT",
            "cloves, COUNT",
            "slices, COUNT",
            "cans, COUNT",
            "unknown_unit, UNKNOWN"
    })
    @DisplayName("Should categorize unit groups correctly")
    void testGetCategory(String unit, UnitConverter.UnitCategory expected) {
        assertEquals(expected, UnitConverter.getCategory(unit));
    }

    @Test
    @DisplayName("Should parse numeric quantities and fractions correctly")
    void testParseQuantity() {
        assertEquals(2.5, UnitConverter.parseQuantity("2.5"), 0.001);
        assertEquals(500.0, UnitConverter.parseQuantity("500g"), 0.001);
        assertEquals(0.5, UnitConverter.parseQuantity("1/2"), 0.001);
        assertEquals(0.75, UnitConverter.parseQuantity("3/4"), 0.001);
        assertEquals(1.0, UnitConverter.parseQuantity(null), 0.001);
        assertEquals(1.0, UnitConverter.parseQuantity("abc"), 0.001);
    }

    @Test
    @DisplayName("Should convert weight units to and from base grams correctly")
    void testWeightConversion() {
        // 1.5 kg -> 1500 g
        double baseGrams = UnitConverter.toBaseUnit(1.5, "kg");
        assertEquals(1500.0, baseGrams, 0.001);

        // 1500 g -> 1.5 kg
        double targetKg = UnitConverter.fromBaseUnit(baseGrams, "kg");
        assertEquals(1.5, targetKg, 0.001);
    }

    @Test
    @DisplayName("Should convert volume units to and from base ml correctly")
    void testVolumeConversion() {
        // 2 cups -> 480 ml
        double baseMl = UnitConverter.toBaseUnit(2.0, "cups");
        assertEquals(480.0, baseMl, 0.001);

        // 480 ml -> 2 cups
        double targetCups = UnitConverter.fromBaseUnit(baseMl, "cups");
        assertEquals(2.0, targetCups, 0.001);

        // 1 liter -> 1000 ml
        assertEquals(1000.0, UnitConverter.toBaseUnit(1.0, "l"), 0.001);
    }

    @Test
    @DisplayName("Should format numbers cleanly without unnecessary decimal zeroes")
    void testFormatQuantity() {
        assertEquals("5", UnitConverter.formatQuantity(5.0));
        assertEquals("2.5", UnitConverter.formatQuantity(2.5));
        assertEquals("0", UnitConverter.formatQuantity(0.0));
        assertEquals("0", UnitConverter.formatQuantity(-1.0));
    }
}
