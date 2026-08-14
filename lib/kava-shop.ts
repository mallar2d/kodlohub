export const RETIRED_KAVA_SHOP_ITEMS = new Set([
  "VIP статус у боті",
  "молоток славіка",
]);

export function isRetiredKavaShopItem(title: string) {
  return RETIRED_KAVA_SHOP_ITEMS.has(title);
}
