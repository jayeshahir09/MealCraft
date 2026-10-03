/**
 * Smart Culinary Image Resolver
 * Provides curated, high-definition photography based on recipe title keywords, cuisine, or custom imageUrl.
 * Supports both getRecipeImage(recipeObj) and getRecipeImage(title, cuisine).
 */

const CUISINE_IMAGES = {
  Italian: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80', // Pasta & Basil
  Mexican: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80', // Street Tacos
  Indian: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80', // Rich Curry & Naan
  Chinese: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80', // Stir Fry Wok / Dim Sum
  Japanese: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80', // Sushi / Ramen
  Mediterranean: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80', // Mediterranean Harvest Bowl
  French: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80', // French Boulangerie / Bistro
  American: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', // Artisan Burger / Grill
  Thai: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80', // Thai Coconut Curry
  Korean: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=800&q=80', // Bibimbap / Bulgogi
  Spanish: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?auto=format&fit=crop&w=800&q=80', // Paella & Tapas
  'Middle Eastern': 'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=800&q=80', // Mezze / Hummus / Falafel
  Greek: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80', // Greek Salad / Gyros
  Vietnamese: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80', // Pho & Spring Rolls
  Default: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80' // Fresh Chef Table
};

const KEYWORD_IMAGES = [
  {
    keywords: ['potato', 'hash', 'fries', 'tater', 'spud'],
    url: 'https://images.unsplash.com/photo-1518013034458-30b0ee243591?auto=format&fit=crop&w=800&q=80' // Crispy Roasted Potato Hash
  },
  {
    keywords: ['flatbread', 'naan', 'roti', 'paratha', 'pita', 'bread', 'stuffed'],
    url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80' // Stuffed Indian Flatbread / Naan
  },
  {
    keywords: ['onion', 'pot', 'stew', 'casserole', 'braised', 'simmer'],
    url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80' // Savory Spiced Pot / Stew
  },
  {
    keywords: ['avocado', 'toast', 'breakfast', 'egg', 'omelet', 'frittata', 'benedict'],
    url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80' // Avocado Toast with Poached Egg
  },
  {
    keywords: ['salmon', 'fish', 'trout', 'tuna', 'seafood', 'shrimp', 'prawn', 'cod'],
    url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80' // Pan-Seared Salmon Fillet
  },
  {
    keywords: ['quinoa', 'salad', 'kale', 'spinach', 'grain', 'bowl', 'harvest'],
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80' // Colorful Quinoa Harvest Bowl
  },
  {
    keywords: ['pasta', 'spaghetti', 'lasagna', 'fettuccine', 'penne', 'ravioli', 'carbonara', 'bolognese'],
    url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=800&q=80' // Fresh Italian Pasta
  },
  {
    keywords: ['curry', 'tikka', 'masala', 'paneer', 'chana', 'dal', 'korma', 'butter chicken'],
    url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80' // Aromatic Spiced Curry
  },
  {
    keywords: ['taco', 'burrito', 'quesadilla', 'fajita', 'enchilada', 'nacho'],
    url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80' // Mexican Street Tacos
  },
  {
    keywords: ['soup', 'broth', 'ramen', 'noodle', 'pho', 'udon', 'soba'],
    url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80' // Gourmet Asian Noodle Bowl
  },
  {
    keywords: ['pizza', 'focaccia', 'margherita'],
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80' // Artisanal Stone-Baked Pizza
  },
  {
    keywords: ['chicken', 'roast', 'wings', 'breast', 'thigh', 'grilled chicken'],
    url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=800&q=80' // Herb Roasted Chicken
  },
  {
    keywords: ['steak', 'beef', 'ribeye', 'sirloin', 'bbq', 'pork', 'lamb', 'meat'],
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80' // Sizzling Grilled Steak
  },
  {
    keywords: ['rice', 'biryani', 'fried rice', 'risotto', 'paella', 'pilaf'],
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80' // Saffron Spiced Rice / Biryani
  },
  {
    keywords: ['sushi', 'sashimi', 'maki', 'roll', 'nigiri', 'poke'],
    url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80' // Chef's Sushi Platter
  },
  {
    keywords: ['smoothie', 'shake', 'yogurt', 'parfait', 'berry', 'fruit', 'acai'],
    url: 'https://images.unsplash.com/photo-1502741224143-90386d7f8c82?auto=format&fit=crop&w=800&q=80' // Superfood Berry Smoothie Bowl
  },
  {
    keywords: ['cake', 'dessert', 'brownie', 'cookie', 'chocolate', 'pancake', 'waffle'],
    url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80' // Decadent Chocolate Dessert
  }
];

/**
 * Resolves recipe image from recipe object OR (title, cuisine) strings
 */
export function getRecipeImage(arg1, arg2) {
  let title = '';
  let cuisine = '';
  let customUrl = null;

  if (typeof arg1 === 'object' && arg1 !== null) {
    customUrl = arg1.imageUrl || arg1.image;
    title = arg1.title || '';
    cuisine = arg1.cuisine || '';
  } else if (typeof arg1 === 'string') {
    title = arg1;
    cuisine = typeof arg2 === 'string' ? arg2 : '';
  }

  // 1. If recipe already has explicit valid image URL
  if (customUrl && typeof customUrl === 'string' && customUrl.startsWith('http')) {
    return customUrl;
  }

  const titleLower = title.toLowerCase();
  const cuisineLower = cuisine.toLowerCase();

  // 2. Match culinary title keywords
  for (const item of KEYWORD_IMAGES) {
    if (item.keywords.some(k => titleLower.includes(k))) {
      return item.url;
    }
  }

  // 3. Match cuisine fallback
  for (const [key, url] of Object.entries(CUISINE_IMAGES)) {
    if (key.toLowerCase() === cuisineLower && cuisineLower !== '') {
      return url;
    }
  }

  return CUISINE_IMAGES.Default;
}

export function handleImageError(e, fallbackCuisine) {
  e.target.onerror = null;
  const key = typeof fallbackCuisine === 'string' ? fallbackCuisine : '';
  e.target.src = CUISINE_IMAGES[key] || CUISINE_IMAGES.Default;
}
