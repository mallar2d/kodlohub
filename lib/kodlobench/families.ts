/**
 * Model families. A family gets one colour everywhere (table, bars, points, legend), so a model
 * is recognisable by its maker before you read the name. Colours are theme tokens (`--kb-fam-*`
 * in globals.css). Unknown models fall back to a neutral grey.
 */
export interface ModelFamily {
  id: string;
  label: string;
  test: RegExp;
}

export const FAMILIES: readonly ModelFamily[] = [
  { id: "openai", label: "OpenAI GPT", test: /gpt|chatgpt|codex|^o\d/i },
  { id: "glm", label: "Z.ai GLM", test: /glm|zai/i },
  { id: "grok", label: "xAI Grok", test: /grok/i },
  { id: "claude", label: "Anthropic Claude", test: /claude/i },
  { id: "gemini", label: "Google Gemini", test: /gemini/i },
  { id: "mistral", label: "Mistral AI", test: /mistral|mixtral|codestral|magistral|devstral/i },
  { id: "muse", label: "Meta Muse", test: /muse|llama/i },
  { id: "deepseek", label: "DeepSeek", test: /deepseek/i },
];

export const OTHER_FAMILY: ModelFamily = { id: "other", label: "Інші", test: /./ };

export function familyOf(model: string): ModelFamily {
  return FAMILIES.find((f) => f.test.test(model)) ?? OTHER_FAMILY;
}
