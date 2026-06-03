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

  const templateRegex = /\{\{([\p{L}]+)\s*\|([\s\S]*?)\}\}/gu;
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
  let result = content;

  result = result.replace(/^={4,}\s*([\s\S]*?)\s*={4,}$/gm, "#### $1");
  result = result.replace(/^={3,}\s*([\s\S]*?)\s*={3,}$/gm, "### $1");
  result = result.replace(/^={2,}\s*([\s\S]*?)\s*={2,}$/gm, "## $1");
  result = result.replace(/^=\s+([\s\S]*?)\s+=\s*$/gm, "## $1");

  result = result.replace(/'''([\s\S]*?)'''/g, "**$1**");
  result = result.replace(/''([\s\S]*?)''/g, "*$1*");

  result = result.replace(/\[\[Файл:([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_match, filename: string, url: string) => {
    const imgUrl = url && url.startsWith("http") ? url : filename;
    return `![${filename}](${imgUrl})`;
  });

  result = result.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_match, page: string, text: string) => {
    return `[${text}](/wiki/general/${page})`;
  });

  result = result.replace(/\[\[([^\]]+)\]\]/g, (_match, page: string) => {
    return `[${page}](/wiki/general/${page})`;
  });

  const lines = result.split("\n");
  const processed: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("; ")) {
      let dl = "<dl>";
      while (i < lines.length && lines[i].startsWith("; ")) {
        dl += `<dt>${lines[i].substring(2)}</dt>`;
        i++;
        if (i < lines.length && lines[i].startsWith(": ")) {
          dl += `<dd>${lines[i].substring(2)}</dd>`;
          i++;
        }
      }
      dl += "</dl>";
      processed.push(dl);
    } else {
      processed.push(line);
      i++;
    }
  }
  result = processed.join("\n");

  result = result.replace(/^\* (.+)$/gm, "- $1");

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
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {withMarkup}
        </ReactMarkdown>
      </div>
      {templates.length > 0 && <div className="clear-both" />}
    </>
  );
}
