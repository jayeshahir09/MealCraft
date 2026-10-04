package com.mealplanner.util;

import java.util.Map;
import java.util.Set;

public class UnitConverter {

    public enum UnitCategory {
        WEIGHT, VOLUME, COUNT, UNKNOWN
    }

    private static final Map<String, Double> WEIGHT_TO_GRAMS = Map.ofEntries(
            Map.entry("g", 1.0),
            Map.entry("gram", 1.0),
            Map.entry("grams", 1.0),
            Map.entry("kg", 1000.0),
            Map.entry("kilogram", 1000.0),
            Map.entry("kilograms", 1000.0),
            Map.entry("oz", 28.3495),
            Map.entry("ounce", 28.3495),
            Map.entry("ounces", 28.3495),
            Map.entry("lb", 453.592),
            Map.entry("lbs", 453.592),
            Map.entry("pound", 453.592),
            Map.entry("pounds", 453.592)
    );

    private static final Map<String, Double> VOLUME_TO_ML = Map.ofEntries(
            Map.entry("ml", 1.0),
            Map.entry("milliliter", 1.0),
            Map.entry("milliliters", 1.0),
            Map.entry("l", 1000.0),
            Map.entry("liter", 1000.0),
            Map.entry("liters", 1000.0),
            Map.entry("cup", 240.0),
            Map.entry("cups", 240.0),
            Map.entry("tbsp", 15.0),
            Map.entry("tablespoon", 15.0),
            Map.entry("tablespoons", 15.0),
            Map.entry("tsp", 5.0),
            Map.entry("teaspoon", 5.0),
            Map.entry("teaspoons", 5.0)
    );

    private static final Set<String> COUNT_UNITS = Set.of(
            "pcs", "pc", "piece", "pieces",
            "clove", "cloves",
            "slice", "slices",
            "can", "cans",
            "bunch", "bunches",
            "pinch", "pinches",
            "head", "heads",
            "stalk", "stalks",
            "sprig", "sprigs"
    );

    private static final Map<String, String> SYNONYMS = Map.ofEntries(
            Map.entry("cilantro", "coriander"),
            Map.entry("scallion", "green onion"),
            Map.entry("scallions", "green onion"),
            Map.entry("spring onion", "green onion"),
            Map.entry("spring onions", "green onion"),
            Map.entry("capsicum", "bell pepper"),
            Map.entry("bell peppers", "bell pepper"),
            Map.entry("garlic cloves", "garlic"),
            Map.entry("garlic clove", "garlic"),
            Map.entry("minced garlic", "garlic"),
            Map.entry("roma tomato", "tomato"),
            Map.entry("diced tomato", "tomato"),
            Map.entry("chicken breast fillets", "chicken breast"),
            Map.entry("boneless chicken breast", "chicken breast"),
            Map.entry("egg white", "egg"),
            Map.entry("egg yolk", "egg"),
            Map.entry("whole milk", "milk"),
            Map.entry("skim milk", "milk"),
            Map.entry("flour", "all-purpose flour"),
            Map.entry("plain flour", "all-purpose flour"),
            Map.entry("maida", "all-purpose flour"),
            Map.entry("table salt", "salt"),
            Map.entry("sea salt", "salt"),
            Map.entry("ground black pepper", "black pepper"),
            Map.entry("black pepper powder", "black pepper"),
            Map.entry("pepper", "black pepper")
    );

    public static String normalizeIngredientName(String name) {
        if (name == null || name.isBlank()) return "";
        String clean = name.trim().toLowerCase().replaceAll("\\s+", " ");

        if (SYNONYMS.containsKey(clean)) {
            return SYNONYMS.get(clean);
        }

        // Strip plural suffixes
        if (clean.endsWith("es") && clean.length() > 4) {
            String singular = clean.substring(0, clean.length() - 2);
            if (SYNONYMS.containsKey(singular)) return SYNONYMS.get(singular);
            return singular;
        }
        if (clean.endsWith("s") && !clean.endsWith("ss") && clean.length() > 3) {
            String singular = clean.substring(0, clean.length() - 1);
            if (SYNONYMS.containsKey(singular)) return SYNONYMS.get(singular);
            return singular;
        }

        return clean;
    }

    public static UnitCategory getCategory(String unit) {
        if (unit == null || unit.isBlank()) return UnitCategory.UNKNOWN;
        String u = unit.trim().toLowerCase();
        if (WEIGHT_TO_GRAMS.containsKey(u)) return UnitCategory.WEIGHT;
        if (VOLUME_TO_ML.containsKey(u)) return UnitCategory.VOLUME;
        if (COUNT_UNITS.contains(u)) return UnitCategory.COUNT;
        return UnitCategory.UNKNOWN;
    }

    public static double parseQuantity(String qty) {
        if (qty == null || qty.isBlank()) return 1.0;
        try {
            String clean = qty.replaceAll("[^0-9./]", "").trim();
            if (clean.contains("/")) {
                String[] parts = clean.split("/");
                if (parts.length == 2) {
                    double num = Double.parseDouble(parts[0]);
                    double den = Double.parseDouble(parts[1]);
                    if (den != 0) return num / den;
                }
            }
            return Double.parseDouble(clean);
        } catch (Exception e) {
            return 1.0;
        }
    }

    public static double toBaseUnit(double qty, String unit) {
        if (unit == null || unit.isBlank()) return qty;
        String u = unit.trim().toLowerCase();
        if (WEIGHT_TO_GRAMS.containsKey(u)) {
            return qty * WEIGHT_TO_GRAMS.get(u);
        }
        if (VOLUME_TO_ML.containsKey(u)) {
            return qty * VOLUME_TO_ML.get(u);
        }
        return qty;
    }

    public static double fromBaseUnit(double baseQty, String targetUnit) {
        if (targetUnit == null || targetUnit.isBlank()) return baseQty;
        String u = targetUnit.trim().toLowerCase();
        if (WEIGHT_TO_GRAMS.containsKey(u)) {
            return baseQty / WEIGHT_TO_GRAMS.get(u);
        }
        if (VOLUME_TO_ML.containsKey(u)) {
            return baseQty / VOLUME_TO_ML.get(u);
        }
        return baseQty;
    }

    public static String formatQuantity(double qty) {
        if (qty <= 0) return "0";
        if (qty == Math.floor(qty)) {
            return String.valueOf((int) qty);
        }
        return String.format("%.1f", qty);
    }
}
