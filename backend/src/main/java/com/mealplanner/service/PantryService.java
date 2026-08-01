package com.mealplanner.service;

import com.mealplanner.dto.PantryItemDTO;
import com.mealplanner.entity.PantryItem;
import com.mealplanner.entity.User;
import com.mealplanner.repository.PantryRepository;
import com.mealplanner.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PantryService {

    private final PantryRepository pantryRepository;
    private final UserRepository userRepository;

    public List<PantryItemDTO> getPantryItems(String email) {
        User user = getUser(email);
        return pantryRepository.findByUserId(user.getId())
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public PantryItemDTO addPantryItem(String email, PantryItemDTO dto) {
        User user = getUser(email);
        PantryItem item = PantryItem.builder()
                .user(user)
                .ingredientName(dto.getIngredientName().trim().toLowerCase())
                .quantity(dto.getQuantity())
                .unit(dto.getUnit())
                .build();
        return toDTO(pantryRepository.save(item));
    }

    @Transactional
    public void deletePantryItem(String email, Long itemId) {
        User user = getUser(email);
        PantryItem item = pantryRepository.findByUserIdAndId(user.getId(), itemId)
                .orElseThrow(() -> new IllegalArgumentException("Pantry item not found"));
        pantryRepository.delete(item);
    }

    @Transactional
    public void clearPantry(String email) {
        User user = getUser(email);
        List<PantryItem> items = pantryRepository.findByUserId(user.getId());
        pantryRepository.deleteAll(items);
    }

    public List<String> getPantryIngredientNames(Long userId) {
        return pantryRepository.findByUserId(userId)
                .stream()
                .map(p -> p.getIngredientName().toLowerCase())
                .collect(Collectors.toList());
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private PantryItemDTO toDTO(PantryItem item) {
        return PantryItemDTO.builder()
                .id(item.getId())
                .ingredientName(item.getIngredientName())
                .quantity(item.getQuantity())
                .unit(item.getUnit())
                .build();
    }
}
