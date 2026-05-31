import Link from "next/link";

const tools = [
  {
    href: "/tools/audio-combiner",
    name: "PDRLIFY",
    description: "Додай PDR звук до будь-якого аудіофайлу з налаштовуваною затримкою",
  },
];

export default function ToolsPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <p className="micro-cap text-ink-mute mb-2">KODLOHUB TOOLS</p>
        <h1 className="heading-section mb-8">ТУЛЗИ</h1>

        <div className="grid gap-4">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="card-dark p-6 hover:border-on-primary-mute transition-colors group block"
            >
              <h2 className="button-cap text-on-primary mb-2 group-hover:opacity-80 transition-opacity">
                {tool.name}
              </h2>
              <p className="text-on-primary-mute text-sm">{tool.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
