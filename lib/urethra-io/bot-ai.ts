import type { Maggot, FoodItem, SkinId } from "./types";

export const BOT_NAMES: Array<{ name: string; preferredSkin: SkinId }> = [
  { name: "Петро_Хікан", preferredSkin: "podro" },
  { name: "Опариш_Подро", preferredSkin: "classic" },
  { name: "Нескафе_Голд_Бос", preferredSkin: "nescafe" },
  { name: "Чавунна_Сковорідка", preferredSkin: "chugun" },
  { name: "Садочок_Екзорцист", preferredSkin: "sadoczyk" },
  { name: "Макаронина_ЗСУ", preferredSkin: "classic" },
  { name: "ASMR_Крильця", preferredSkin: "bloody" },
  { name: "Баклага_6л", preferredSkin: "baklaga" },
  { name: "Коростишівський_Гігант", preferredSkin: "granite" },
  { name: "Кавовий_Дрист", preferredSkin: "bloody" },
  { name: "Чашка_Петрі", preferredSkin: "mold" },
  { name: "Ворсинка_9000", preferredSkin: "cyber" },
  { name: "Бронепластина_Чавун", preferredSkin: "chugun" },
  { name: "Гастрономічний_Горор", preferredSkin: "classic" },
  { name: "Клейстер_Макаронний", preferredSkin: "classic" },
  { name: "Спецназ_Оновлення_Даних", preferredSkin: "cyber" },
  { name: "Дід_Панас_Кофеман", preferredSkin: "nescafe" },
  { name: "Уретральний_Мандрівник", preferredSkin: "cyber" },
  { name: "Борг_За_Гуртожиток", preferredSkin: "podro" },
  { name: "Еспресо_Штурмовик", preferredSkin: "bloody" },
  { name: "Infinix_На_Зарядці", preferredSkin: "infinix" },
  { name: "Пліснява_Під_Ліжком", preferredSkin: "mold" },
  { name: "Нічний_Жор_о_03_00", preferredSkin: "classic" },
  { name: "Золотий_Бульйончик", preferredSkin: "broth" },
  { name: "Шолом_з_Каструлі", preferredSkin: "chugun" },
  { name: "Коростишівський_Кар'єр", preferredSkin: "granite" },
  { name: "RGB_Про_Геймер", preferredSkin: "rgb_gamer" },
  { name: "Безодня_Хікікоморі", preferredSkin: "void_hikka" },
  { name: "Шеметований_Барон", preferredSkin: "shemet" },
  { name: "Радіаційна_Морквина", preferredSkin: "toxic_carrot" },
  { name: "CRT_Монітор_1998", preferredSkin: "retro_pixel" },
  { name: "Макарони_за_9.99", preferredSkin: "zebra" },
  { name: "Свідок_Nescafe", preferredSkin: "nescafe" },
  { name: "Екзорцист_Садочка", preferredSkin: "sadoczyk" },
  { name: "Військомат_Бердичів", preferredSkin: "granite" },
  { name: "PUBG_На_Мінімалках", preferredSkin: "rgb_gamer" },
  { name: "Сковорода_4_Клас", preferredSkin: "chugun" },
  { name: "Крильце_ASMR_Master", preferredSkin: "bloody" },
  { name: "Морква_По_Феншую", preferredSkin: "toxic_carrot" },
  { name: "Анонім_з_Безодні", preferredSkin: "void_hikka" },
  { name: "Кавовий_Магнат", preferredSkin: "shemet" },
  { name: "Турбо_Дрист_V8", preferredSkin: "infinix" },
  { name: "Капілярний_Снайпер", preferredSkin: "cyber" },
  { name: "Мобілізований_Опариш", preferredSkin: "classic" },
  { name: "Паралельна_Реальність", preferredSkin: "podro" },
  { name: "Брудна_Тарілка", preferredSkin: "mold" },
  { name: "Супутник_Подро", preferredSkin: "baklaga" },
  { name: "Забута_Людина", preferredSkin: "void_hikka" },
  { name: "Молоток_Торпеда", preferredSkin: "granite" },
  { name: "Гігантський_Міцелій", preferredSkin: "mold" },
  { name: "Степовий_Хікан", preferredSkin: "podro" },
  { name: "Рістретто_Кілер", preferredSkin: "bloody" },
  { name: "Масляний_Навар", preferredSkin: "broth" },
  { name: "Елітна_Арабіка", preferredSkin: "nescafe" },
  { name: "Чавунна_Броня", preferredSkin: "chugun" },
];

export function getRandomBotProfile(): { name: string; skin: SkinId } {
  const item = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  return {
    name: item.name,
    skin: item.preferredSkin,
  };
}

export function updateBotAI(
  bot: Maggot,
  allMaggots: Maggot[],
  foods: FoodItem[],
  arenaRadius: number
) {
  if (!bot.alive) return;

  const head = bot.segments[0] || { x: bot.x, y: bot.y, radius: 16 };
  const distFromCenter = Math.hypot(head.x, head.y);

  // 1. Boundary Wall Avoidance
  const dangerZone = arenaRadius - 260;
  if (distFromCenter > dangerZone) {
    const angleToCenter = Math.atan2(-head.y, -head.x);
    bot.targetAngle = angleToCenter;
    bot.isBoosting = false;
    return;
  }

  // 2. Obstacle / Other Maggots Avoidance
  const lookAheadDist = bot.isBoosting ? 140 : 90;
  const rayX = head.x + Math.cos(bot.angle) * lookAheadDist;
  const rayY = head.y + Math.sin(bot.angle) * lookAheadDist;

  let nearestThreatDistSq = Infinity;
  let threatAngle = 0;

  for (let i = 0; i < allMaggots.length; i++) {
    const other = allMaggots[i];
    if (!other.alive || other.id === bot.id) continue;

    const segCount = other.segments.length;
    for (let s = 0; s < segCount; s++) {
      const seg = other.segments[s];
      const dx = seg.x - rayX;
      const dy = seg.y - rayY;
      const distSq = dx * dx + dy * dy;
      const dangerRadius = seg.radius + head.radius + 15;

      if (distSq < dangerRadius * dangerRadius && distSq < nearestThreatDistSq) {
        nearestThreatDistSq = distSq;
        threatAngle = Math.atan2(seg.y - head.y, seg.x - head.x);
      }
    }
  }

  if (nearestThreatDistSq !== Infinity) {
    let diff = bot.angle - threatAngle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    const turnDir = diff >= 0 ? 1 : -1;
    bot.targetAngle = bot.angle + turnDir * 1.8;
    bot.isBoosting = false;
    return;
  }

  // 3. Hunting / Circling smaller maggots
  let huntTarget: Maggot | null = null;
  let minTargetDist = 450;

  if (bot.score > 250) {
    for (let i = 0; i < allMaggots.length; i++) {
      const other = allMaggots[i];
      if (!other.alive || other.id === bot.id) continue;
      if (other.score < bot.score * 0.7) {
        const otherHead = other.segments[0] || other;
        const d = Math.hypot(otherHead.x - head.x, otherHead.y - head.y);
        if (d < minTargetDist) {
          minTargetDist = d;
          huntTarget = other;
        }
      }
    }
  }

  if (huntTarget) {
    const otherHead = huntTarget.segments[0] || huntTarget;
    const leadX = otherHead.x + Math.cos(huntTarget.angle) * 70;
    const leadY = otherHead.y + Math.sin(huntTarget.angle) * 70;

    bot.targetAngle = Math.atan2(leadY - head.y, leadX - head.x);
    bot.isBoosting = bot.score > 300 && minTargetDist < 260 && Math.random() < 0.85;
    return;
  }

  // 4. Foraging Food
  let bestFood: FoodItem | null = null;
  let bestScore = -Infinity;

  const sampleLimit = Math.min(foods.length, 60);
  const step = Math.max(1, Math.floor(foods.length / sampleLimit));

  for (let i = 0; i < foods.length; i += step) {
    const f = foods[i];
    const dx = f.x - head.x;
    const dy = f.y - head.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < 600 * 600) {
      const dist = Math.sqrt(distSq);
      const foodWeight = f.type === "carrot" ? 25 : f.type === "sadoczyk" ? 40 : f.type === "drop" ? 8 : f.value;
      const score = (foodWeight * 100) / (dist + 30);

      if (score > bestScore) {
        bestScore = score;
        bestFood = f;
      }
    }
  }

  if (bestFood && bestScore > 0) {
    bot.targetAngle = Math.atan2(bestFood.y - head.y, bestFood.x - head.x);
    bot.isBoosting = (bestFood.type === "carrot" || bestFood.type === "sadoczyk") && bot.score > 180;
  } else {
    if (Math.random() < 0.04) {
      bot.targetAngle += (Math.random() - 0.5) * 1.2;
    }
    bot.isBoosting = false;
  }
}
