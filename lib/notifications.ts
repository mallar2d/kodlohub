import { createAdminClient } from "./supabase/admin";

interface CreateNotificationParams {
  userId: string;
  type: "comment" | "post_approved" | "post_rejected" | "role_changed" | "post_deleted" | "system";
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  const admin = createAdminClient();

  const { error } = await admin.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link || null,
  });

  if (error) {
    console.error("Failed to create notification:", error.message);
  }
}

export async function notifyRoleChanged(userId: string, newRole: string) {
  const roleLabels: Record<string, string> = {
    owner: "Головний Подро",
    podrofikovany: "Подрофікований",
    kodlo: "Кодло",
    shemetovany: "Шеметований",
  };

  await createNotification({
    userId,
    type: "role_changed",
    title: "Змінено роль",
    message: `Твою роль змінено на "${roleLabels[newRole] || newRole}"`,
    link: `/profile/${userId}`,
  });
}

export async function notifyPostDeleted(authorId: string, postTitle: string) {
  await createNotification({
    userId: authorId,
    type: "post_deleted",
    title: "Пост видалено",
    message: `Твій пост "${postTitle}" було видалено`,
  });
}

export async function notifyComment(postAuthorId: string, commenterName: string, postTitle: string) {
  if (postAuthorId) {
    await createNotification({
      userId: postAuthorId,
      type: "comment",
      title: "Новий коментар",
      message: `${commenterName} прокоментував "${postTitle}"`,
    });
  }
}
