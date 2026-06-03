"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface TemplateField {
  key: string;
  value: string;
}

function parseTemplates(content: string): { templates: { name: string; fields: TemplateField[] }[]; cleaned: string } {
  const templates: { name: string; fields: TemplateField[] }[] = [];
  let cleaned = content;

  const templateRegex = /\{\{([\p{L}\s]+)\s*\|([\s\S]*?)\}\}/gu;
  let match;
  while ((match = templateRegex.exec(content)) !== null) {
    const name = match[1];
    const rawBody = match[2];

    if (name.toLowerCase() === "cquote") {
      const textMatch = rawBody.match(/text\s*=\s*([\s\S]*)/);
      if (textMatch) {
        const text = textMatch[1].trim();
        const lines = text.split(/<br\s*\/?>/gi).filter(Boolean);
        const blockquote = lines.map((l: string) => `> ${l.trim()}`).join("\n>\n");
        cleaned = cleaned.replace(match[0], "\n\n" + blockquote + "\n\n");
      } else {
        cleaned = cleaned.replace(match[0], "");
      }
      continue;
    }

    const fields: TemplateField[] = [];
    const parts = rawBody.split("|");
    for (const part of parts) {
      const eqIndex = part.indexOf("=");
      if (eqIndex === -1) continue;
      const key = part.substring(0, eqIndex).trim().replace(/\s+/g, "_");
      const value = part.substring(eqIndex + 1).trim();
      if (key && value) {
        fields.push({ key, value });
      }
    }

    if (fields.length > 0) {
      templates.push({ name, fields });
    }
    cleaned = cleaned.replace(match[0], "");
  }

  return { templates, cleaned };
}

function parseMediaWikiMarkup(content: string): string {
  let result = content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u200B\u200C\u200D\uFEFF\u00A0]/g, " ")
    .replace(/\t/g, "  ");

  const lines = result.split("\n");
  const processed: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    const h4 = trimmed.match(/^={4,}\s*(.+?)\s*={4,}$/);
    if (h4) { processed.push(`#### ${h4[1]}\n`); continue; }

    const h3 = trimmed.match(/^={3,}\s*(.+?)\s*={3,}$/);
    if (h3) { processed.push(`### ${h3[1]}\n`); continue; }

    const h2 = trimmed.match(/^={2,}\s*(.+?)\s*={2,}$/);
    if (h2) { processed.push(`## ${h2[1]}\n`); continue; }

    const h1 = trimmed.match(/^=\s+(.+?)\s+=\s*$/);
    if (h1) { processed.push(`## ${h1[1]}\n`); continue; }

    processed.push(line);
  }

  result = processed.join("\n");

  result = result.replace(/'''([\s\S]*?)'''/g, "**$1**");
  result = result.replace(/''([\s\S]*?)''/g, "*$1*");

  result = result.replace(/\[\[Файл:([^\]|]+)\|([^\]]*)\]\]/g, (_match, urlOrName: string, params: string) => {
    const parts = params.split("|");
    const imgUrl = urlOrName.startsWith("http") ? urlOrName : urlOrName;
    let caption = "";
    let align = "";
    let thumb = false;
    let width = "";
    for (const p of parts) {
      const trimmed = p.trim();
      if (!trimmed) continue;
      if (trimmed.match(/^\d+px$/)) { width = trimmed.replace("px", ""); continue; }
      if (trimmed === "thumb" || trimmed === "thumbnail") { thumb = true; continue; }
      if (["right", "left", "center", "none"].includes(trimmed)) { align = trimmed; continue; }
      if (["frameless", "frame", "border"].includes(trimmed)) continue;
      caption = trimmed.replace(/^"(.*)"$/, "$1");
    }
    const meta = [align, thumb ? "thumb" : "", width].filter(Boolean).join("|");
    return `![${meta}|${caption || "зображення"}](${imgUrl})`;
  });

  result = result.replace(/\[\[Файл:([^\]|]+)\]\]/g, (_match, urlOrName: string) => {
    return `![|зображення](${urlOrName})`;
  });

  result = result.replace(/\[\[(https?:\/\/[^\]|]+)\|([^\]]*)\]\]/g, (_match, url: string, params: string) => {
    const parts = params.split("|");
    let caption = "";
    let align = "";
    let thumb = false;
    let width = "";
    for (const p of parts) {
      const trimmed = p.trim();
      if (!trimmed) continue;
      if (trimmed.match(/^\d+px$/)) { width = trimmed.replace("px", ""); continue; }
      if (trimmed === "thumb" || trimmed === "thumbnail") { thumb = true; continue; }
      if (["right", "left", "center", "none"].includes(trimmed)) { align = trimmed; continue; }
      if (["frameless", "frame", "border"].includes(trimmed)) continue;
      caption = trimmed.replace(/^"(.*)"$/, "$1");
    }
    const meta = [align, thumb ? "thumb" : "", width].filter(Boolean).join("|");
    return `![${meta}|${caption || "зображення"}](${url})`;
  });

  result = result.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_match, page: string, text: string) => {
    return `[${text}](/wiki/general/${page})`;
  });

  result = result.replace(/\[\[([^\]]+)\]\]/g, (_match, page: string) => {
    return `[${page}](/wiki/general/${page})`;
  });

  result = result.replace(/\[(https?:\/\/[^\]]+)\s+([^\]]+)\]/g, (_match, url: string, text: string) => {
    return `[${text}](${url})`;
  });

  result = result.replace(/([^\!]|^)\[(https?:\/\/[^\]]+)\]\(([^)]+)\)/g, (_match, prefix: string, alt: string, url: string) => {
    if (prefix === "!") return _match;
    return `${prefix}![${alt}](${url})`;
  });

  result = result.replace(/\n\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_match, alt: string, url: string) => {
    return `\n![${alt}](${url})`;
  });

  const dlLines = result.split("\n");
  const dlProcessed: string[] = [];
  let i = 0;
  while (i < dlLines.length) {
    const line = dlLines[i];
    if (line.trimStart().startsWith("; ")) {
      while (i < dlLines.length && dlLines[i].trimStart().startsWith("; ")) {
        const term = dlLines[i].trimStart().substring(2).replace(/\*\*(.+?)\*\*/g, "$1");
        dlProcessed.push(`**${term}**`);
        i++;
        if (i < dlLines.length && dlLines[i].trimStart().startsWith(": ")) {
          dlProcessed.push(`> ${dlLines[i].trimStart().substring(2)}`);
          i++;
        } else if (i < dlLines.length && !dlLines[i].trimStart().startsWith("; ") && !dlLines[i].trimStart().startsWith("=") && dlLines[i].trim() !== "") {
          dlProcessed.push(`> ${dlLines[i]}`);
          i++;
        }
        dlProcessed.push("");
      }
    } else {
      dlProcessed.push(line);
      i++;
    }
  }
  result = dlProcessed.join("\n");

  const tableLines = result.split("\n");
  const tableProcessed: string[] = [];
  let inTable = false;
  let headerDone = false;
  for (const line of tableLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("{|")) {
      inTable = true;
      headerDone = false;
      continue;
    }
    if (trimmed === "|}") {
      inTable = false;
      continue;
    }
    if (inTable) {
      if (trimmed === "|-") continue;
      if (trimmed.startsWith("! ")) {
        const cells = trimmed.split(" !! ").map((c: string) => c.replace(/^!\s*/, "").trim());
        tableProcessed.push("| " + cells.join(" | ") + " |");
        tableProcessed.push("| " + cells.map(() => "---").join(" | ") + " |");
        headerDone = true;
      } else if (trimmed.startsWith("| ")) {
        const cells = trimmed.split(" || ").map((c: string) => c.replace(/^\|\s*/, "").trim());
        tableProcessed.push("| " + cells.join(" | ") + " |");
      }
    } else {
      tableProcessed.push(line);
    }
  }
  result = tableProcessed.join("\n");

  result = result.replace(/^\* (.+)$/gm, "- $1");
  result = result.replace(/\n{3,}/g, "\n\n");

  return result;
}

const templateLabels: Record<string, Record<string, string>> = {
  Персонаж: {
    ім_я: "Ім'я",
    оригінал_імені: "Оригінал",
    зображення: "Зображення",
    підпис: "Підпис",
    псевдоніми: "Псевдоніми",
    вид: "Вид",
    рід_занять: "Рід занять",
    статус: "Статус",
    місце_проживання: "Місце проживання",
    зброя: "Зброя",
    світогляд: "Світогляд",
    IQ: "IQ",
  },
  "Музичний колектив": {
    назва: "Назва",
    зображення: "Зображення",
    підпис: "Підпис",
    походження: "Походження",
    жанри: "Жанри",
    роки_діяльності: "Роки діяльності",
    лейбл: "Лейбл",
    учасники: "Учасники",
    вебсайт: "Вебсайт",
  },
};

function Infobox({ template }: { template: { name: string; fields: TemplateField[] } }) {
  const labels = templateLabels[template.name] || {};
  const imageField = template.fields.find((f) => f.key === "зображення");
  const captionField = template.fields.find((f) => f.key === "підпис");
  const nameField = template.fields.find((f) => f.key === "ім_я" || f.key === "name");

  return (
    <div className="card-dark p-0 overflow-hidden mb-6 float-right ml-6 w-72">
      <div className="bg-canvas-night-soft px-4 py-3 border-b border-hairline-dark">
        <h3 className="button-cap text-on-primary text-sm">{template.name}</h3>
      </div>
      {imageField && (
        <div className="border-b border-hairline-dark">
          <div className="aspect-square bg-canvas-night flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageField.value}
              alt={nameField?.value || template.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
              }}
            />
            <span className="text-ink-mute text-xs hidden">📷 {imageField.value}</span>
          </div>
          {captionField && (
            <p className="caption text-ink-mute text-center px-3 py-2">{captionField.value}</p>
          )}
        </div>
      )}
      <div className="divide-y divide-hairline-dark">
        {template.fields
          .filter((f) => f.key !== "зображення" && f.key !== "підпис")
          .map((field) => (
            <div key={field.key} className="px-4 py-2.5">
              <p className="micro-cap text-ink-mute mb-0.5">{labels[field.key] || field.key}</p>
              <p className="text-on-primary text-sm">{field.value}</p>
            </div>
          ))}
      </div>
    </div>
  );
}

function WikiImage({ alt, src }: { alt: string; src?: string }) {
  if (!src) return null;

  let caption = alt;
  let align = "";
  let thumb = false;
  let width = "";

  const parts = alt.split("|");
  if (parts.length > 1) {
    caption = parts[parts.length - 1] || "зображення";
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i].trim();
      if (p.match(/^\d+px$/)) { width = p.replace("px", ""); }
      else if (p.match(/^\d+$/)) { width = p; }
      else if (p === "thumb" || p === "thumbnail") { thumb = true; }
      else if (["right", "left", "center", "none"].includes(p)) { align = p; }
    }
  }

  const containerClass = [
    "wiki-img-container",
    align ? `wiki-img-${align}` : "",
    thumb ? "wiki-img-thumb" : "",
  ].filter(Boolean).join(" ");

  return (
    <figure className={containerClass} style={width ? { maxWidth: `${width}px` } : undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={caption} className="wiki-img" loading="lazy" />
      {caption && caption !== "зображення" && (
        <figcaption className="wiki-img-caption">{caption}</figcaption>
      )}
    </figure>
  );
}

export default function WikiContent({ content }: { content: string }) {
  const { templates, cleaned } = parseTemplates(content);
  const withMarkup = parseMediaWikiMarkup(cleaned);

  return (
    <>
      {templates.length > 0 && (
        <div className="mb-2">
          {templates.map((t, i) => (
            <Infobox key={i} template={t} />
          ))}
        </div>
      )}
      <div className="prose max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            img: ({ alt, src }) => <WikiImage alt={alt || ""} src={typeof src === "string" ? src : ""} />,
          }}
        >
          {withMarkup}
        </ReactMarkdown>
      </div>
      {templates.length > 0 && <div className="clear-both" />}
    </>
  );
}
