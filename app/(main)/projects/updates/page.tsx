import type { Metadata } from "next";
import { getRecentProjectUpdates } from "@/lib/project-center/queries";
import UpdatesClient from "./UpdatesClient";

export const metadata: Metadata = {
  title: "Оновлення проєктів",
  description: "Глобальна стрічка devlog, patch notes, релізів і статусних оновлень усіх проєктів.",
};

export default async function ProjectUpdatesPage() {
  const updates = await getRecentProjectUpdates(100);

  return (
    <div className="min-h-screen px-4 pb-16 pt-24 sm:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-12">
          <p className="micro-cap mb-2 text-ink-mute">Project Center</p>
          <h1 className="heading-section mb-4">Усі оновлення</h1>
          <p className="max-w-3xl text-lg leading-8 text-on-primary-mute">
            Єдина стрічка devlog, patch notes, релізів, локалізаційних і технічних оновлень.
          </p>
        </div>
        <UpdatesClient updates={updates} />
      </div>
    </div>
  );
}
