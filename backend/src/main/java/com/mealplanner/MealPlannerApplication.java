package com.mealplanner;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class MealPlannerApplication {
    public static void main(String[] args) {
        SpringApplication.run(MealPlannerApplication.class, args);
    }
}
