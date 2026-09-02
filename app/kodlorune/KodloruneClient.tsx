"use client";

interface ProgressItem {
  icon: string;
  percent: number;
}

const ITEMS: ProgressItem[] = [
  { icon: "🎮", percent: 30 },
  { icon: "🎵", percent: 50 },
  { icon: "🎨", percent: 20 },
  { icon: "❤️", percent: 70 },
  { icon: "💙", percent: 85 },
  { icon: "💛", percent: 70 },
  { icon: "💚", percent: 50 },
  { icon: "💜", percent: 40 },
  { icon: "🩵", percent: 30 },
  { icon: "🧡", percent: 30 },
];

function renderBar(percent: number, totalBlocks: number = 20): string {
  const filledCount = Math.round((percent / 100) * totalBlocks);
  const emptyCount = totalBlocks - filledCount;
  return "▓".repeat(filledCount) + "░".repeat(emptyCount);
}

export default function KodloruneClient() {
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col gap-2 items-center justify-center text-white select-text">
      {ITEMS.map((item, index) => (
        <span key={index} className="font-mono tracking-wider text-base sm:text-lg">
          {item.icon} {renderBar(item.percent)}
        </span>
      ))}
      <span className="text-black text-lg mt-8 select-text selection:bg-white selection:text-black">
        Це не він
      </span>
    </div>
  );
}

