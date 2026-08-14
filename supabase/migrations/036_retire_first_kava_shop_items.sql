-- Keep purchase history intact while removing the first two products from sale.
UPDATE kava_shop_items
SET active = FALSE,
    updated_at = NOW()
WHERE title IN ('VIP статус у боті', 'молоток славіка');
