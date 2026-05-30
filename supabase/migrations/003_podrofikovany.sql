-- ==========================================
-- KODLOHOST — Подрофікований role + storage stats
-- ==========================================

-- 1. Додати роль podrofikovany
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'podrofikovany', 'kodlo', 'shemetovany'));

-- 2. RLS: podrofikovany може змінювати kodlo/shemetovany (але не інших podrofikovany та не owner)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (
    -- Власний профіль
    auth.uid()::text = id
    -- Owner може все
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
    -- Podrofikovany може змінювати тільки kodlo та shemetovany
    OR (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'podrofikovany')
      AND role IN ('kodlo', 'shemetovany')
    )
  );

-- 3. RLS: podrofikovany може видаляти kodlo/shemetovany
DROP POLICY IF EXISTS "Owner can delete any profile" ON profiles;
CREATE POLICY "Owner can delete any profile"
  ON profiles FOR DELETE USING (
    -- Owner може все
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'owner')
    -- Podrofikovany може видаляти тільки kodlo та shemetovany
    OR (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'podrofikovany')
      AND role IN ('kodlo', 'shemetovany')
    )
  );
