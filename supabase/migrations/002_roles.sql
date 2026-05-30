-- ==========================================
-- KODLOHOST — Roles Migration
-- ==========================================
-- Ролі: owner (Головний Подро), kodlo (Кодло), shemetovany (Шеметований)

-- 1. Оновити CHECK constraint для ролей
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'kodlo', 'shemetovany'));

-- 2. Дефолтна роль для нових користувачів — shemetovany
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'shemetovany';

-- 3. Оновити RLS policies для posts
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
CREATE POLICY "Owner and Kodlo can create posts"
  ON posts FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()::text AND role IN ('owner', 'kodlo')
    )
  );

-- 4. Оновити RLS policies для media
DROP POLICY IF EXISTS "Authenticated users can upload media" ON media;
CREATE POLICY "Owner and Kodlo can upload media"
  ON media FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()::text AND role IN ('owner', 'kodlo')
    )
  );

-- 5. Оновити RLS policies для lore_items
DROP POLICY IF EXISTS "Authenticated users can create lore items" ON lore_items;
CREATE POLICY "Owner and Kodlo can create lore items"
  ON lore_items FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()::text AND role IN ('owner', 'kodlo')
    )
  );

-- 6. Comments — залишаємо для всіх authenticated
-- (полісія "Authenticated users can create comments" вже є)

-- 7. Owner може змінювати будь-який профіль (для адмін-панелі)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (
    auth.uid()::text = id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()::text AND role = 'owner'
    )
  );

-- 8. Owner може видаляти будь-який профіль
CREATE POLICY "Owner can delete any profile"
  ON profiles FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()::text AND role = 'owner'
    )
  );
