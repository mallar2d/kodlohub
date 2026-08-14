export function resolveKavaAvatar(
  telegramPhotoUrl: string | null | undefined,
  profileAvatarUrl: string | null | undefined
) {
  return telegramPhotoUrl || profileAvatarUrl || null;
}
