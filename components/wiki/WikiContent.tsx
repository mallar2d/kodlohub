"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { wikiCategoryIcons } from "@/lib/wiki-icons";

interface TemplateField {
  key: string;
  value: string;
}

function parseTemplates(content: string): { templates: { name: string; fields: TemplateField[] }[]; cleaned: string } {
  const templates: { name: string; fields: TemplateField[] }[] = [];
  let cleaned = content;

  const templateRegex = /\{\{(\w+)\|([^}]*)\}\}/g;
  let match;
  while ((match = templateRegex.exec(content)) !== null) {
    const name = match[1];
    const rawFields = match[2];
    const fields: TemplateField[] = [];

    const fieldRegex = /(\w+)\s*=\s*([^|]*)/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(rawFields)) !== null) {
      fields.push({ key: fieldMatch[1], value: fieldMatch[2].trim() });
    }

    templates.push({ name, fields });
    cleaned = cleaned.replace(match[0], "");
  }

  return { templates, cleaned };
}

function parseWikiLinks(content: string): string {
  let result = content;

  result = result.replace(/\[\[Файл:([^\]|]+)(?:\|([^\]]*))?\]\]/g, (_match, filename) => {
    return `![${filename}](/uploads/${filename})`;
  });

  result = result.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_match, page, text) => {
    return `[${text}](/wiki/general/${page})`;
  });

  result = result.replace(/\[\[([^\]]+)\]\]/g, (_match, page) => {
    return `[${page}](/wiki/general/${page})`;
  });

  return result;
}

function parseMediaWikiMarkup(content: string): string {
  let result = content;

  result = result.replace(/'''([^']+)'''/g, "**$1**");
  result = result.replace(/''([^']+)''/g, "*$1*");

  result = result.replace(/^; (.+)$/gm, "**$1**");
  result = result.replace(/^: '(.+)$/gm, "> *$1*");
  result = result.replace(/^: (.+)$/gm, "> $1");

  result = result.replace(/\{\{Cquote\|text=([^}]*)\}\}/g, (_match, text) => {
    return `> ${text.replace(/<br\s*\/?>/g, "\n\n")}`;
  });

  return result;
}

const templateLabels: Record<string, Record<string, string>> = {
  Персонаж: {
    name: "Ім'я",
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

  return (
    <div className="card-dark p-0 overflow-hidden mb-8 float-right ml-6 w-72">
      <div className="bg-canvas-night-soft px-4 py-3 border-b border-hairline-dark">
        <h3 className="button-cap text-on-primary text-sm">{template.name}</h3>
      </div>
      {imageField && (
        <div className="border-b border-hairline-dark">
          <div className="aspect-square bg-canvas-night flex items-center justify-center">
            <span className="text-ink-mute text-xs">📷 {imageField.value}</span>
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
  const withLinks = parseWikiLinks(cleaned);
  const withMarkup = parseMediaWikiMarkup(withLinks);

  return (
    <>
      {templates.length > 0 && (
        <div className="mb-6">
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
