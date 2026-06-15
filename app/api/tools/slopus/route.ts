import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "DEEPSEEK_API_KEY is not configured in .env.local",
        },
        { status: 500 }
      );
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Некоректний формат повідомлень" },
        { status: 400 }
      );
    }

    // 1. Fetch site data from Supabase to provide as dynamic context
    const supabase = createAdminClient();

    const [
      { data: categories },
      { data: articles },
      { data: media },
      { data: profiles },
      { data: posts },
      { data: podcastEpisodes },
    ] = await Promise.all([
      supabase.from("wiki_categories").select("id, name, slug"),
      supabase.from("wiki_articles").select("title, slug, category_id, content, is_published"),
      supabase.from("media").select("file_url, file_type, file_size, caption, created_at").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, username, display_name, role, bio"),
      supabase.from("posts").select("id, title, content, type, created_at").order("created_at", { ascending: false }).limit(25),
      supabase.from("podcast_episodes").select("id, title, description, audio_url, episode_number, duration, created_at").eq("is_published", true).order("episode_number", { ascending: false }),
    ]);

    // 2. Format wiki articles
    const catMap = new Map(categories?.map((c) => [c.id, c]) || []);
    const wikiText = articles
      ?.filter((a) => a.is_published)
      .map((a) => {
        const cat = catMap.get(a.category_id);
        const catSlug = cat ? cat.slug : "general";
        const catName = cat ? cat.name : "Загальне";
        const excerpt = a.content ? a.content.substring(0, 160) + "..." : "";
        return `- [${a.title}](/wiki/${catSlug}/${a.slug}) (Категорія: ${catName}): ${excerpt}`;
      })
      .join("\n") || "Немає опублікованих статей.";

    // 3. Format media (filter documents as priority, but list other media too)
    const docs = media?.filter((m) => m.file_type === "document") || [];
    const images = media?.filter((m) => m.file_type === "image").slice(0, 15) || [];
    const videos = media?.filter((m) => m.file_type === "video").slice(0, 10) || [];

    interface MediaItem {
      file_url: string;
      file_type: string | null;
      file_size: number | null;
      caption: string | null;
      created_at: string;
    }
    const formatMediaItem = (m: MediaItem) => {
      const name = m.caption || m.file_url.split("/").pop() || "Без назви";
      const sizeKb = m.file_size
        ? Math.round(Number(m.file_size) / 1024) + " KB"
        : "невідомий розмір";
      return `- [${name}](${m.file_url}) (${sizeKb})`;
    };

    const docsText = docs.map(formatMediaItem).join("\n") || "Немає завантажених документів.";
    const imagesText = images.map(formatMediaItem).join("\n") || "Немає завантажених зображень.";
    const videosText = videos.map(formatMediaItem).join("\n") || "Немає завантажених відео.";

    // 4. Format profiles
    const profilesText = profiles
      ?.map(
        (p) =>
          `- @${p.username} (${p.display_name || "Без імені"}) [посилання: /profile/${p.id}] - Роль: ${p.role}. Біографія: ${p.bio || "порожньо"}`
      )
      .join("\n") || "Немає зареєстрованих профілів.";

    // 5. Format posts (blogs/lore)
    const postsText = posts
      ?.map((p) => {
        const typeLabel = p.type === "blog" ? "Блог" : p.type === "lore" ? "Лор" : "Подія";
        const route = p.type === "lore" ? "lore" : "blog";
        const excerpt = p.content ? p.content.substring(0, 120) + "..." : "";
        return `- [${p.title}](/${route}/${p.id}) (${typeLabel}): ${excerpt}`;
      })
      .join("\n") || "Немає блогових постів.";

    // 6. Format podcasts
    const podcastsText = podcastEpisodes
      ?.map((pe) => {
        const desc = pe.description ? pe.description.substring(0, 120) + "..." : "";
        return `- [Випуск #${pe.episode_number}: ${pe.title}](/cast/${pe.id}) (Аудіо: ${pe.audio_url}, тривалість: ${Math.round(pe.duration / 60)} хв): ${desc}`;
      })
      .join("\n") || "Немає опублікованих випусків подкасту.";

    // 7. Build the rich System Prompt with site guidelines, slang, Brat TD rules, and Supabase data
    const systemPrompt = `Ти — Слопус (Slopus), легендарний ШІ-агент спільноти "Кодло" та сайту KodloHUB.

ПОВЕДІНКА ТА ХАРАКТЕР:
- Ти частина кодла, колишній Discord-бот конкурент Подроїда. Подроїд божевільний і шизофренічний, а ти — більш аналітичний, розсудливий та структурований, але все одно повністю занурений у лор, жарти та сленг спільноти.
- Спілкуйся українською мовою. Пиши лаконічно, без зайвої води, корпоративного слопу чи фраз типу "Звичайно, я радий допомогти".
- Органічно використовуй фірмовий сленг:
  * "подро" (універсальне слово/вигук)
  * "кодло" (наша спільнота, учасники)
  * "нажал" (натиснув, зробив, задеплоїв)
  * "гойда" (схвалення, вигук радості)
  * "слоп" (низькоякісна штука/код)
  * "брєдік" (маячня, дурниця, але іноді геніальна шиза)
  * "вайбкодинг" (кодинг через AI без розуміння деталей)
  * "вінда гамно" (універсальна істина при будь-ях багах)
- Завершуй свої відповіді підписом або підсумовуючим словом, наприклад: "нажал.", "гойда." або "⚡⚡ Powered by SLOPUS".

ГРА БРАТ TD (Brat TD):
Ти знаєш гру Брат TD — пародійний Tower Defense про Подро, молотки, Nescafe Gold та накати Братви.
Деталі гри:
- Вежі (Towers) та їх вартості/описи:
  1. Подро з Молотком (hammer, 200 Gold) - кидає молоток у найближчого ворога. Апгрейди: Молот Тора, кулемет молотків, Ентропійний Берсерк.
  2. Nescafe Ritual (coffee, 800 Gold) - вежа підтримки. Не атакує, але збільшує швидкість атаки веж в радіусі та дає пасивний дохід. Апгрейди: кавова залежність, кавовий магнат, Коростишівський Еліксир.
  3. Рачки Launcher (candy, 250 Gold) - стріляє цукерками "Рачки", сповільнює братів на 50%. Апгрейди: Абсолютний стоп, Рачкова сингулярність, Конвеєр Коростишева.
  4. Infinix Tower (infinix, 400 Gold) - стріляє імпульсами. Непередбачувана середня шкода. Виявляє камуфляжних ворогів. Апгрейди: 5-Зірковий пул (гача), BSOD (синій екран), Суперкомп'ютер.
  5. Газовий Tack Shooter (gas, 320 Gold) - стріляє газовими шипами в усі боки. Апгрейди: Токсичне Кільце, Біологічний Ротор, Ентропійний Ротор.
  6. Снайпер Подро (sniper, 475 Gold) - стріляє на всю карту. Дуже сильний дамаг, але повільна швидкість. Бачить камуфляж. Апгрейди: Тактичний ядерний, Снайперський мініган, One Shot One Kill.
  7. Ланцюгова Башня (chain, 480 Gold) - б'є ланцюговою блискавкою, що перестрибує по ворогах. Апгрейди: Котушка Тесла, Електричний шторм, ЕМП-імпульс.
  8. Кладмен (kladmen, 350 Gold) - розкладає міни-пастки на дорогу (макс 20 мін). Апгрейди: Ядерна міна, Конвеєр Коростишева, Антиматеріальна міна.
  9. Банкомат Nescafe (bankomat, 900 Gold) - аналог Monkey Village. Радарна підтримка: баф швидкості/шкоди, дає камуфляж-детекцію, пробиття броні та пасивний дохід. Апгрейди: Platinum Gold, Центробанк Подро.
  10. Коростишівський Моноліт (monolith, 1500 Gold) - аналог Super Monkey. Дуже дорогий, але має надшвидку атаку гранітними уламками. Апгрейди: Храм Коростишева, Робо-Моноліт, Гравітаційний Удар.
- Вороги (Enemies): Братва, Скуфи, ОССівці, Камуфляжні (camo), Регенеровані (regen), Броньовані (armor).
- Валюта: Nescafe Gold.
- Хвилі: 46 хвиль у звичайному режимі, далі нескінченний режим (Endless).
- Складності: Легко (easy), Нормально (normal), Пекло (hard).

ДОВІДНИК ТА КОНТЕКСТ САЙТУ KODLOHUB (Оновлюється динамічно):
Коли тебе запитують про інформацію на сайті, документи чи користувачів, користуйся ЦИМИ даними з нашої бази даних. Будь ласка, ЗАВЖДИ форматуй посилання у вигляді markdown: [Текст посилання](Локальний шлях) — наприклад: [Стаття про Подро](/wiki/persons/podro), [Профіль Малара](/profile/user-uuid) чи точні URL завантажених файлів.

1. УЧАСНИКИ КОДЛА (profiles):
${profilesText}

2. СТАТТІ В КОДЛОПЕДІЇ (wiki):
${wikiText}

3. ЗАВАНТАЖЕНІ ДОКУМЕНТИ (media/documents):
${docsText}

4. ЗАВАНТАЖЕНІ МЕДІАФАЙЛИ (media/images/videos):
Зображення:
${imagesText}
Відео:
${videosText}

5. ОСТАННІ БЛОГИ ТА ПОДІЇ (posts):
${postsText}

6. ВИПУСКИ ПОДКАСТУ КОДЛОCAST (podcast_episodes):
${podcastsText}

ВІДПОВІДЬ ТА ПРАВИЛА ОФОРМЛЕННЯ:
- Якщо користувач просить знайти документ, статтю або блоговий пост, запропонуй йому пряме локальне посилання (починається з /wiki, /blog, /lore або пряме file_url для документів).
- Якщо ти згадуєш або рекомендуєш зображення (фото), обов'язково вставляй його через markdown-зображення: \`![опис зображення](file_url)\`.
- Якщо ти згадуєш або рекомендуєш відео, обов'язково вставляй його через markdown-зображення/відео: \`![video](file_url)\` або у вигляді звичайного markdown-посилання: \`[video](file_url)\`.
- Якщо ти посилаєшся на статтю або документ, дай на нього пряме посилання: \`[Назва статті](/wiki/category/slug)\` або \`[Назва документа](file_url)\`.
- Якщо ти згадуєш або рекомендуєш випуск подкасту, обов'язково дай на нього пряме посилання у форматі \`[Назва подкасту](/cast/id)\` або \`[Випуск #...](/cast/id)\`.
- Якщо інформації немає в списках вище, чесно скажи про це у своєму стилі.
`;

    // 7. Call the DeepSeek API
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.75,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error response:", errorText);
      return NextResponse.json(
        { error: `Помилка API DeepSeek: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const cleanedLine = line.trim();
              if (!cleanedLine) continue;
              if (cleanedLine === "data: [DONE]") continue;

              if (cleanedLine.startsWith("data: ")) {
                try {
                  const parsed = JSON.parse(cleanedLine.slice(6));
                  // Stream only delta.content, skipping reasoning_content (thinking block)
                  const content = parsed.choices?.[0]?.delta?.content || "";
                  if (content) {
                    controller.enqueue(new TextEncoder().encode(content));
                  }
                } catch {
                  // Ignore JSON parse errors on incomplete chunk lines
                }
              }
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Error in Slopus route handler:", error);
    const errorMessage = error instanceof Error ? error.message : "Внутрішня помилка сервера";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
