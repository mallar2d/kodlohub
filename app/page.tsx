import Link from "next/link";

const sections = [
  {
    href: "/gallery",
    title: "ГАЛЕРЕЯ КОДЛА",
    description: "Фотки, відео та все що залишилось від подро",
    bgImage: "/video_Thumbnail.jpg",
  },
  {
    href: "/blog",
    title: "БЛОГ ПОДРО",
    description: "Тексти, історії та думки кодла",
    bgImage: "/video_Thumbnail.jpg",
  },
  {
    href: "/lore",
    title: "ЛОРА-БІБЛІОТЕКА",
    description: "Артефакти, меми, цитати та все найкраще",
    bgImage: "/video_Thumbnail.jpg",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/video_Thumbnail.jpg)" }}
        />
        <div className="absolute inset-0 bg-canvas-night/60" />

        {/* Content */}
        <div className="relative z-10 text-center px-4">
          <h1 className="heading-hero mb-6">KODLOHOST</h1>
          <p className="text-on-primary-mute text-xl mb-8 max-w-2xl mx-auto">
            Хостинг для кодла. Зберігай фотки, відео та тексти про подро та
            інші приколи.
          </p>
          <Link href="/gallery" className="btn-ghost text-on-primary">
            НАЖАТИ
          </Link>
        </div>
      </section>

      {/* Sections */}
      {sections.map((section, i) => (
        <section
          key={section.href}
          className={`relative h-[70vh] flex items-center overflow-hidden ${
            i % 2 === 1 ? "bg-canvas-night-soft" : "bg-canvas-night"
          }`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${section.bgImage})` }}
          />

          <div className="relative z-10 max-w-[1200px] mx-auto px-6 w-full">
            <div
              className={`flex flex-col ${
                i % 2 === 0 ? "items-start text-left" : "items-end text-right"
              }`}
            >
              <h2 className="heading-section mb-4">{section.title}</h2>
              <p className="text-on-primary-mute text-lg mb-8 max-w-xl">
                {section.description}
              </p>
              <Link
                href={section.href}
                className="btn-ghost text-on-primary"
              >
                {section.title.includes("ГАЛЕРЕЯ")
                  ? "ДИВИТИСЬ"
                  : section.title.includes("БЛОГ")
                  ? "ЧИТАТИ"
                  : "ВІДКРИТИ"}
              </Link>
            </div>
          </div>
        </section>
      ))}

      {/* Lore banner */}
      <section className="bg-canvas-night py-24 px-6">
        <div className="max-w-[1200px] mx-auto text-center">
          <p className="micro-cap text-ink-mute mb-4">АРХІВ КОДЛА</p>
          <h2 className="heading-sub mb-6">
            28 УЧАСНИКІВ. 177 385 ПОВІДОМЛЕНЬ. 423 ДНІ.
          </h2>
          <p className="text-on-primary-mute text-lg mb-8 max-w-2xl mx-auto">
            Все найкраще, що створило кодло, зберігається тут. Від мемів до
            фільмів. Від ботів до ігор.
          </p>
          <Link href="/lore" className="btn-ghost text-on-primary">
            ДОСЛІДЖУВАТИ
          </Link>
        </div>
      </section>
    </div>
  );
}
