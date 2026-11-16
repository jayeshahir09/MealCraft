-- Add composite B-tree index on (user_id, cuisine) for fast filtering in GET /api/recipes?cuisine={cuisine}
CREATE INDEX IF NOT EXISTS idx_recipes_user_cuisine ON recipes(user_id, cuisine);
