-- Fix lore_items delete policy — allow owner/podrofikovany to delete any
DROP POLICY IF EXISTS "Authors can delete own lore items" ON lore_items;
CREATE POLICY "Authors and admins can delete lore items" ON lore_items FOR DELETE USING (
  auth.uid()::text = author_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
);

-- Fix media delete policy — allow owner/podrofikovany to delete any
DROP POLICY IF EXISTS "Authors can delete own media" ON media;
CREATE POLICY "Authors and admins can delete media" ON media FOR DELETE USING (
  auth.uid()::text = author_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('owner', 'podrofikovany'))
);
