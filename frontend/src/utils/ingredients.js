export const MASTER_INGREDIENTS = [
  // Produce
  { name: 'Garlic', category: 'Produce', emoji: '🧄', unitGroup: 'count', defaultUnit: 'cloves', allowedUnits: ['cloves', 'pcs', 'g', 'tsp'], synonyms: ['garlic clove', 'garlic cloves', 'minced garlic'] },
  { name: 'Onion', category: 'Produce', emoji: '🧅', unitGroup: 'count', defaultUnit: 'pcs', allowedUnits: ['pcs', 'g', 'kg', 'slices'], synonyms: ['onions', 'yellow onion', 'white onion', 'red onion', 'diced onion'] },
  { name: 'Tomato', category: 'Produce', emoji: '🍅', unitGroup: 'count', defaultUnit: 'pcs', allowedUnits: ['pcs', 'g', 'kg', 'cans', 'cups'], synonyms: ['tomatoes', 'fresh tomato', 'roma tomato'] },
  { name: 'Potato', category: 'Produce', emoji: '🥔', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'pcs', 'lbs'], synonyms: ['potatoes', 'russet potato', 'baby potato'] },
  { name: 'Ginger', category: 'Produce', emoji: '🫚', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'tbsp', 'tsp', 'pcs'], synonyms: ['fresh ginger', 'ginger root', 'minced ginger'] },
  { name: 'Lemon', category: 'Produce', emoji: '🍋', unitGroup: 'count', defaultUnit: 'pcs', allowedUnits: ['pcs', 'tbsp', 'tsp', 'ml'], synonyms: ['lemons', 'lemon juice', 'fresh lemon'] },
  { name: 'Lime', category: 'Produce', emoji: '🍈', unitGroup: 'count', defaultUnit: 'pcs', allowedUnits: ['pcs', 'tbsp', 'tsp', 'ml'], synonyms: ['limes', 'lime juice'] },
  { name: 'Carrot', category: 'Produce', emoji: '🥕', unitGroup: 'count', defaultUnit: 'pcs', allowedUnits: ['pcs', 'g', 'kg', 'cups'], synonyms: ['carrots', 'baby carrots'] },
  { name: 'Spinach', category: 'Produce', emoji: '🥬', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'cups', 'bunches'], synonyms: ['baby spinach', 'fresh spinach'] },
  { name: 'Bell Pepper', category: 'Produce', emoji: '🫑', unitGroup: 'count', defaultUnit: 'pcs', allowedUnits: ['pcs', 'g', 'cups'], synonyms: ['bell peppers', 'capsicum', 'green pepper', 'red pepper', 'yellow pepper'] },
  { name: 'Broccoli', category: 'Produce', emoji: '🥦', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'pcs', 'cups'], synonyms: ['broccoli florets', 'fresh broccoli'] },
  { name: 'Mushroom', category: 'Produce', emoji: '🍄', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'cups', 'pcs'], synonyms: ['mushrooms', 'button mushrooms', 'cremini', 'portobello'] },
  { name: 'Avocado', category: 'Produce', emoji: '🥑', unitGroup: 'count', defaultUnit: 'pcs', allowedUnits: ['pcs', 'slices'], synonyms: ['avocados', 'hass avocado'] },
  { name: 'Cucumber', category: 'Produce', emoji: '🥒', unitGroup: 'count', defaultUnit: 'pcs', allowedUnits: ['pcs', 'g', 'slices', 'cups'], synonyms: ['cucumbers', 'english cucumber'] },
  { name: 'Zucchini', category: 'Produce', emoji: '🥒', unitGroup: 'count', defaultUnit: 'pcs', allowedUnits: ['pcs', 'g', 'cups'], synonyms: ['courgette', 'green zucchini'] },
  { name: 'Green Chili', category: 'Produce', emoji: '🌶️', unitGroup: 'count', defaultUnit: 'pcs', allowedUnits: ['pcs', 'tsp', 'tbsp'], synonyms: ['green chilies', 'serrano', 'jalapeno', 'thai chili'] },
  { name: 'Cabbage', category: 'Produce', emoji: '🥬', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'pcs', 'cups'], synonyms: ['green cabbage', 'red cabbage', 'shredded cabbage'] },
  { name: 'Cauliflower', category: 'Produce', emoji: '🥦', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'pcs', 'cups'], synonyms: ['cauliflower florets', 'gobi'] },
  { name: 'Sweet Potato', category: 'Produce', emoji: '🍠', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'pcs'], synonyms: ['sweet potatoes', 'yam'] },
  { name: 'Green Onion', category: 'Produce', emoji: '🌱', unitGroup: 'count', defaultUnit: 'bunches', allowedUnits: ['bunches', 'pcs', 'tbsp', 'cups'], synonyms: ['scallion', 'scallions', 'spring onion', 'spring onions'] },

  // Dairy & Eggs
  { name: 'Egg', category: 'Dairy & Eggs', emoji: '🥚', unitGroup: 'count', defaultUnit: 'pcs', allowedUnits: ['pcs'], synonyms: ['eggs', 'large egg', 'egg white', 'egg yolk'] },
  { name: 'Milk', category: 'Dairy & Eggs', emoji: '🥛', unitGroup: 'volume', defaultUnit: 'ml', allowedUnits: ['ml', 'L', 'cups', 'tbsp'], synonyms: ['whole milk', 'skim milk', '2% milk', 'dairy milk'] },
  { name: 'Butter', category: 'Dairy & Eggs', emoji: '🧈', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'tbsp', 'kg', 'oz'], synonyms: ['unsalted butter', 'salted butter'] },
  { name: 'Cheddar Cheese', category: 'Dairy & Eggs', emoji: '🧀', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'cups', 'slices', 'oz'], synonyms: ['cheddar', 'shredded cheddar', 'cheese'] },
  { name: 'Mozzarella', category: 'Dairy & Eggs', emoji: '🧀', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'cups', 'slices'], synonyms: ['mozzarella cheese', 'fresh mozzarella'] },
  { name: 'Parmesan', category: 'Dairy & Eggs', emoji: '🧀', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'tbsp', 'cups', 'oz'], synonyms: ['parmesan cheese', 'parmigiano', 'grated parmesan'] },
  { name: 'Greek Yogurt', category: 'Dairy & Eggs', emoji: '🥣', unitGroup: 'volume', defaultUnit: 'cups', allowedUnits: ['cups', 'g', 'ml', 'tbsp'], synonyms: ['yogurt', 'plain yogurt', 'curd', 'dahi'] },
  { name: 'Heavy Cream', category: 'Dairy & Eggs', emoji: '🥛', unitGroup: 'volume', defaultUnit: 'ml', allowedUnits: ['ml', 'cups', 'tbsp', 'L'], synonyms: ['whipping cream', 'double cream'] },
  { name: 'Cream Cheese', category: 'Dairy & Eggs', emoji: '🧀', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'oz', 'tbsp'], synonyms: ['philadelphia cream cheese'] },
  { name: 'Paneer', category: 'Dairy & Eggs', emoji: '🧀', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg'], synonyms: ['cottage cheese', 'indian paneer'] },
  { name: 'Feta Cheese', category: 'Dairy & Eggs', emoji: '🧀', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'cups', 'oz'], synonyms: ['feta', 'crumbled feta'] },

  // Pantry & Grains
  { name: 'Rice', category: 'Pantry & Grains', emoji: '🍚', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'cups'], synonyms: ['white rice', 'basmati rice', 'jasmine rice', 'brown rice'] },
  { name: 'Pasta', category: 'Pantry & Grains', emoji: '🍝', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'oz', 'cups'], synonyms: ['spaghetti', 'penne', 'macaroni', 'fusilli', 'noodles'] },
  { name: 'All-Purpose Flour', category: 'Pantry & Grains', emoji: '🌾', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'cups', 'tbsp'], synonyms: ['flour', 'plain flour', 'maida', 'wheat flour'] },
  { name: 'Rolled Oats', category: 'Pantry & Grains', emoji: '🥣', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'cups', 'kg'], synonyms: ['oats', 'oatmeal', 'quick oats'] },
  { name: 'Quinoa', category: 'Pantry & Grains', emoji: '🌾', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'cups', 'kg'], synonyms: ['white quinoa', 'tri-color quinoa'] },
  { name: 'Bread', category: 'Pantry & Grains', emoji: '🍞', unitGroup: 'count', defaultUnit: 'slices', allowedUnits: ['slices', 'pcs'], synonyms: ['sliced bread', 'white bread', 'whole wheat bread', 'toast'] },
  { name: 'Breadcrumbs', category: 'Pantry & Grains', emoji: '🍞', unitGroup: 'volume', defaultUnit: 'cups', allowedUnits: ['cups', 'g', 'tbsp'], synonyms: ['panko', 'panko breadcrumbs'] },
  { name: 'Lentils', category: 'Pantry & Grains', emoji: '🫘', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'cups'], synonyms: ['dal', 'red lentils', 'brown lentils', 'yellow dal'] },
  { name: 'Chickpeas', category: 'Pantry & Grains', emoji: '🫘', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'cans', 'cups'], synonyms: ['garbanzo beans', 'chana', 'canned chickpeas'] },
  { name: 'Black Beans', category: 'Pantry & Grains', emoji: '🫘', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'cans', 'cups'], synonyms: ['canned black beans', 'black bean'] },

  // Meat & Seafood
  { name: 'Chicken Breast', category: 'Meat & Seafood', emoji: '🍗', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'lbs', 'pcs'], synonyms: ['boneless chicken breast', 'chicken fillets', 'chicken'] },
  { name: 'Chicken Thighs', category: 'Meat & Seafood', emoji: '🍗', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'pcs', 'lbs'], synonyms: ['boneless chicken thighs', 'chicken thigh'] },
  { name: 'Ground Beef', category: 'Meat & Seafood', emoji: '🥩', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'lbs', 'oz'], synonyms: ['minced beef', 'beef mince', 'minced meat'] },
  { name: 'Salmon', category: 'Meat & Seafood', emoji: '🐟', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'pcs', 'oz'], synonyms: ['salmon fillet', 'fresh salmon'] },
  { name: 'Shrimp', category: 'Meat & Seafood', emoji: '🦐', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'kg', 'pcs', 'oz'], synonyms: ['prawns', 'raw shrimp', 'peeled shrimp'] },
  { name: 'Bacon', category: 'Meat & Seafood', emoji: '🥓', unitGroup: 'count', defaultUnit: 'slices', allowedUnits: ['slices', 'g', 'oz'], synonyms: ['bacon strips', 'pancetta'] },
  { name: 'Tuna', category: 'Meat & Seafood', emoji: '🐟', unitGroup: 'count', defaultUnit: 'cans', allowedUnits: ['cans', 'g', 'oz'], synonyms: ['canned tuna', 'tuna fish'] },
  { name: 'Tofu', category: 'Meat & Seafood', emoji: '🧈', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'pcs', 'oz'], synonyms: ['firm tofu', 'silken tofu'] },

  // Oils & Condiments
  { name: 'Olive Oil', category: 'Oils & Condiments', emoji: '🫒', unitGroup: 'volume', defaultUnit: 'tbsp', allowedUnits: ['tbsp', 'tsp', 'ml', 'L', 'cups'], synonyms: ['extra virgin olive oil', 'evoo'] },
  { name: 'Vegetable Oil', category: 'Oils & Condiments', emoji: '🌻', unitGroup: 'volume', defaultUnit: 'tbsp', allowedUnits: ['tbsp', 'ml', 'L', 'cups'], synonyms: ['cooking oil', 'canola oil', 'sunflower oil'] },
  { name: 'Soy Sauce', category: 'Oils & Condiments', emoji: '🍶', unitGroup: 'volume', defaultUnit: 'tbsp', allowedUnits: ['tbsp', 'tsp', 'ml', 'cups'], synonyms: ['dark soy sauce', 'light soy sauce', 'shoyu'] },
  { name: 'Sesame Oil', category: 'Oils & Condiments', emoji: '🧴', unitGroup: 'volume', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp', 'ml'], synonyms: ['toasted sesame oil'] },
  { name: 'Vinegar', category: 'Oils & Condiments', emoji: '🧪', unitGroup: 'volume', defaultUnit: 'tbsp', allowedUnits: ['tbsp', 'tsp', 'ml', 'cups'], synonyms: ['white vinegar', 'apple cider vinegar', 'rice vinegar'] },
  { name: 'Mayonnaise', category: 'Oils & Condiments', emoji: '🧴', unitGroup: 'volume', defaultUnit: 'tbsp', allowedUnits: ['tbsp', 'cups', 'g'], synonyms: ['mayo', 'kewpie mayo'] },
  { name: 'Dijon Mustard', category: 'Oils & Condiments', emoji: '🧴', unitGroup: 'volume', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp'], synonyms: ['mustard', 'yellow mustard'] },
  { name: 'Hot Sauce', category: 'Oils & Condiments', emoji: '🌶️', unitGroup: 'volume', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp', 'ml'], synonyms: ['sriracha', 'tabasco', 'chili sauce'] },
  { name: 'Honey', category: 'Oils & Condiments', emoji: '🍯', unitGroup: 'volume', defaultUnit: 'tbsp', allowedUnits: ['tbsp', 'tsp', 'ml', 'g'], synonyms: ['raw honey', 'pure honey'] },
  { name: 'Peanut Butter', category: 'Oils & Condiments', emoji: '🥜', unitGroup: 'volume', defaultUnit: 'tbsp', allowedUnits: ['tbsp', 'g', 'cups'], synonyms: ['smooth peanut butter', 'crunchy peanut butter'] },

  // Herbs & Spices
  { name: 'Salt', category: 'Herbs & Spices', emoji: '🧂', unitGroup: 'spices', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp', 'pinch', 'g'], synonyms: ['table salt', 'sea salt', 'kosher salt'] },
  { name: 'Black Pepper', category: 'Herbs & Spices', emoji: '🧂', unitGroup: 'spices', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp', 'pinch', 'g'], synonyms: ['ground black pepper', 'cracked pepper', 'pepper'] },
  { name: 'Cumin', category: 'Herbs & Spices', emoji: '🌿', unitGroup: 'spices', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp', 'g'], synonyms: ['ground cumin', 'cumin powder', 'cumin seeds', 'jeera'] },
  { name: 'Coriander', category: 'Herbs & Spices', emoji: '🌿', unitGroup: 'count', defaultUnit: 'bunches', allowedUnits: ['bunches', 'cups', 'tbsp', 'tsp', 'g'], synonyms: ['fresh coriander', 'cilantro', 'coriander leaves', 'coriander powder'] },
  { name: 'Paprika', category: 'Herbs & Spices', emoji: '🌶️', unitGroup: 'spices', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp', 'g'], synonyms: ['smoked paprika', 'sweet paprika'] },
  { name: 'Turmeric', category: 'Herbs & Spices', emoji: '🟡', unitGroup: 'spices', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp', 'g'], synonyms: ['turmeric powder', 'haldi'] },
  { name: 'Garam Masala', category: 'Herbs & Spices', emoji: '✨', unitGroup: 'spices', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp'], synonyms: ['curry powder', 'masala'] },
  { name: 'Oregano', category: 'Herbs & Spices', emoji: '🌿', unitGroup: 'spices', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp', 'pinch'], synonyms: ['dried oregano', 'italian seasoning'] },
  { name: 'Basil', category: 'Herbs & Spices', emoji: '🌿', unitGroup: 'count', defaultUnit: 'bunches', allowedUnits: ['bunches', 'cups', 'tbsp', 'leaves'], synonyms: ['fresh basil', 'sweet basil', 'basil leaves'] },
  { name: 'Parsley', category: 'Herbs & Spices', emoji: '🌿', unitGroup: 'count', defaultUnit: 'bunches', allowedUnits: ['bunches', 'cups', 'tbsp'], synonyms: ['fresh parsley', 'flat leaf parsley'] },
  { name: 'Rosemary', category: 'Herbs & Spices', emoji: '🌿', unitGroup: 'spices', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp', 'sprigs'], synonyms: ['fresh rosemary', 'dried rosemary'] },
  { name: 'Thyme', category: 'Herbs & Spices', emoji: '🌿', unitGroup: 'spices', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp', 'sprigs'], synonyms: ['fresh thyme', 'dried thyme'] },
  { name: 'Cinnamon', category: 'Herbs & Spices', emoji: '🪵', unitGroup: 'spices', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp', 'sticks'], synonyms: ['cinnamon powder', 'ground cinnamon'] },
  { name: 'Chili Flakes', category: 'Herbs & Spices', emoji: '🌶️', unitGroup: 'spices', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp', 'pinch'], synonyms: ['red pepper flakes', 'crushed chili'] },

  // Baking & Sweeteners
  { name: 'Granulated Sugar', category: 'Baking & Sweeteners', emoji: '🍬', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'cups', 'tbsp', 'tsp', 'kg'], synonyms: ['sugar', 'white sugar'] },
  { name: 'Brown Sugar', category: 'Baking & Sweeteners', emoji: '🟤', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'cups', 'tbsp'], synonyms: ['light brown sugar', 'dark brown sugar'] },
  { name: 'Baking Powder', category: 'Baking & Sweeteners', emoji: '🧪', unitGroup: 'spices', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp', 'g'], synonyms: ['double acting baking powder'] },
  { name: 'Baking Soda', category: 'Baking & Sweeteners', emoji: '🧪', unitGroup: 'spices', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp', 'pinch'], synonyms: ['bicarbonate of soda'] },
  { name: 'Vanilla Extract', category: 'Baking & Sweeteners', emoji: '🧪', unitGroup: 'volume', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp', 'ml'], synonyms: ['pure vanilla', 'vanilla essence'] },
  { name: 'Cocoa Powder', category: 'Baking & Sweeteners', emoji: '🍫', unitGroup: 'weight', defaultUnit: 'g', allowedUnits: ['g', 'tbsp', 'cups'], synonyms: ['unsweetened cocoa powder', 'cacao'] },
  { name: 'Yeast', category: 'Baking & Sweeteners', emoji: '🍞', unitGroup: 'spices', defaultUnit: 'tsp', allowedUnits: ['tsp', 'tbsp', 'g', 'packets'], synonyms: ['active dry yeast', 'instant yeast'] },

  // Canned, Broths & Liquids
  { name: 'Tomato Paste', category: 'Canned & Jarred', emoji: '🥫', unitGroup: 'volume', defaultUnit: 'tbsp', allowedUnits: ['tbsp', 'cans', 'g'], synonyms: ['concentrated tomato paste'] },
  { name: 'Diced Tomatoes', category: 'Canned & Jarred', emoji: '🥫', unitGroup: 'count', defaultUnit: 'cans', allowedUnits: ['cans', 'g', 'cups'], synonyms: ['canned tomatoes', 'crushed tomatoes'] },
  { name: 'Coconut Milk', category: 'Canned & Jarred', emoji: '🥥', unitGroup: 'volume', defaultUnit: 'ml', allowedUnits: ['ml', 'cans', 'cups'], synonyms: ['canned coconut milk', 'coconut cream'] },
  { name: 'Chicken Broth', category: 'Canned & Jarred', emoji: '🥣', unitGroup: 'volume', defaultUnit: 'ml', allowedUnits: ['ml', 'cups', 'L'], synonyms: ['chicken stock', 'bouillon'] },
  { name: 'Vegetable Broth', category: 'Canned & Jarred', emoji: '🥣', unitGroup: 'volume', defaultUnit: 'ml', allowedUnits: ['ml', 'cups', 'L'], synonyms: ['vegetable stock'] }
];

export const POPULAR_STAPLES = [
  'Garlic', 'Onion', 'Tomato', 'Egg', 'Milk', 'Olive Oil', 
  'Butter', 'Salt', 'Black Pepper', 'Chicken Breast', 'Rice', 'All-Purpose Flour'
];

export const ALL_UNITS = [
  { val: '', label: 'Unit (optional)', emoji: '📏' },
  { val: 'g', label: 'g (grams)', emoji: '⚖️' },
  { val: 'kg', label: 'kg (kilograms)', emoji: '⚖️' },
  { val: 'ml', label: 'ml (milliliters)', emoji: '🧪' },
  { val: 'L', label: 'L (liters)', emoji: '🧃' },
  { val: 'pcs', label: 'pcs (pieces)', emoji: '🔢' },
  { val: 'cups', label: 'cups', emoji: '☕' },
  { val: 'tbsp', label: 'tbsp (tablespoon)', emoji: '🥄' },
  { val: 'tsp', label: 'tsp (teaspoon)', emoji: '🥄' },
  { val: 'cloves', label: 'cloves', emoji: '🧄' },
  { val: 'cans', label: 'cans', emoji: '🥫' },
  { val: 'slices', label: 'slices', emoji: '🍞' },
  { val: 'bunches', label: 'bunches', emoji: '🌿' },
  { val: 'oz', label: 'oz (ounces)', emoji: '⚖️' },
  { val: 'lbs', label: 'lbs (pounds)', emoji: '⚖️' },
  { val: 'pinch', label: 'pinch', emoji: '🤏' }
];

/**
 * Normalizes an ingredient name: lowercase, trims whitespace, handles basic plurals and synonyms.
 */
export function normalizeIngredientName(name) {
  if (!name) return '';
  let str = name.trim().toLowerCase().replace(/\s+/g, ' ');

  // Look for match in master catalog
  const match = MASTER_INGREDIENTS.find(item => 
    item.name.toLowerCase() === str || 
    (item.synonyms && item.synonyms.some(s => s.toLowerCase() === str))
  );

  if (match) return match.name;

  // Basic lemmatization fallback (e.g. tomatoes -> tomato, eggs -> egg)
  if (str.endsWith('es') && str.length > 4) {
    const singular = str.slice(0, -2);
    const matchSingular = MASTER_INGREDIENTS.find(item => item.name.toLowerCase() === singular);
    if (matchSingular) return matchSingular.name;
  }
  if (str.endsWith('s') && !str.endsWith('ss') && str.length > 3) {
    const singular = str.slice(0, -1);
    const matchSingular = MASTER_INGREDIENTS.find(item => item.name.toLowerCase() === singular);
    if (matchSingular) return matchSingular.name;
  }

  // Return title-cased custom name
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Returns matching master ingredient entry or null.
 */
export function findMasterIngredient(name) {
  if (!name) return null;
  const target = name.trim().toLowerCase();
  return MASTER_INGREDIENTS.find(i => 
    i.name.toLowerCase() === target || 
    (i.synonyms && i.synonyms.some(s => s.toLowerCase() === target))
  ) || null;
}

/**
 * Returns allowed units and default unit for given ingredient.
 */
export function getUnitsForIngredient(name) {
  const master = findMasterIngredient(name);
  if (master && master.allowedUnits) {
    const allowed = ALL_UNITS.filter(u => u.val === '' || master.allowedUnits.includes(u.val));
    return {
      options: allowed,
      defaultUnit: master.defaultUnit || ''
    };
  }
  return {
    options: ALL_UNITS,
    defaultUnit: ''
  };
}
