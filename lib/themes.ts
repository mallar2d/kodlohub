export type ThemeId =
  | "space"
  | "nescafe"
  | "kodlorune"
  | "matrix"
  | "atb"
  | "biohazard"
  | "sadochok";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  accent: string;
  accentHover: string;
  canvas: string;
  canvasSoft: string;
  card: string;
  hairline: string;
  textPrimary: string;
  sound?: string;
  isLight?: boolean;
}

export const THEMES: ThemeConfig[] = [
  {
    id: "space",
    name: "КОСМІЧНА",
    badge: "xAI SPEC",
    tagline: "Суворий xAI мінімалізм",
    description: "Холодний монохром, нуль декоративного мотлоху, глибокий вакуум і надвисокий контраст.",
    accent: "#ffffff",
    accentHover: "#e5e5e5",
    canvas: "#0a0a0a",
    canvasSoft: "#121316",
    card: "#16181c",
    hairline: "#212327",
    textPrimary: "#ffffff",
  },
  {
    id: "nescafe",
    name: "NESCAFE GOLD",
    badge: "22:00 РИТУАЛ",
    tagline: "Подрофікований затишок",
    description: "Аромат смажених зерен, 10 ложок цукру о 22:00, чавунна сковорідка та тепла амбра гуртожитку.",
    accent: "#f59e0b",
    accentHover: "#d97706",
    canvas: "#130d09",
    canvasSoft: "#1d140f",
    card: "#261a13",
    hairline: "#422b1f",
    textPrimary: "#fef3c7",
    sound: "/spintrick-sound.mp3",
  },
  {
    id: "kodlorune",
    name: "KODLORUNE",
    badge: "DARK WORLD",
    tagline: "The Legend of Kodlo",
    description: "Темний світ Дельтарун, неоновий ціан та гаряча маджента. Пророцтво вже прокинулося.",
    accent: "#00f0ff",
    accentHover: "#38bdf8",
    canvas: "#05050a",
    canvasSoft: "#0e0d1d",
    card: "#151329",
    hairline: "#2d2454",
    textPrimary: "#ffffff",
    sound: "/spintrick-combosound.mp3",
  },
  {
    id: "matrix",
    name: "ШЕМЕТ-ТЕРМІНАЛ",
    badge: "ХАКЕР",
    tagline: "Фосфорний ЕПТ Коростишева",
    description: "Зелений монохромний консольний термінал, режим сканування місцевості та пошук скарбів.",
    accent: "#00ff66",
    accentHover: "#22c55e",
    canvas: "#030804",
    canvasSoft: "#071609",
    card: "#0b210f",
    hairline: "#13381a",
    textPrimary: "#d1fae5",
    sound: "/brat-td/sfx_hammer_fire.mp3",
  },
  {
    id: "atb",
    name: "ПАКЕТ АТБ",
    badge: "ЕКОНОМІЧНА",
    tagline: "Легендарний синій поліетилен",
    description: "Культовий камуфляж для баклаг води та інвентарю. Червоно-жовта знижка на весь слоп.",
    accent: "#facc15",
    accentHover: "#eab308",
    canvas: "#071124",
    canvasSoft: "#0d1f40",
    card: "#122852",
    hairline: "#1e3d77",
    textPrimary: "#ffffff",
    sound: "/brat-td/sfx_bankomat_mone.mp3",
  },
  {
    id: "biohazard",
    name: "БІОХАЗАРД",
    badge: "ГАЗЕНВАГЕН",
    tagline: "Ароматична аура +50 AoE",
    description: "Суп з опаришів, капсула стазису та дезодорант поверх тритижневого поту. Рівень загрози: 404.",
    accent: "#bef264",
    accentHover: "#a3e635",
    canvas: "#080e04",
    canvasSoft: "#101b08",
    card: "#16250b",
    hairline: "#294014",
    textPrimary: "#f7fee7",
    sound: "/brat-td/sfx_gas_spray.mp3",
  },
  {
    id: "sadochok",
    name: "ЯБЛУЧНИЙ САДОЧОК",
    badge: "СВІТЛА ТЕМА",
    tagline: "Той самий єдиний випадок",
    description: "Єдиний раз в історії, коли Подро випив не каву, а свіжий яблучний сік. Світло, чистота та шок для сусідів.",
    accent: "#16a34a",
    accentHover: "#15803d",
    canvas: "#f7f9f5",
    canvasSoft: "#edf3e8",
    card: "#ffffff",
    hairline: "#d1dcce",
    textPrimary: "#142315",
    isLight: true,
    sound: "/PDR_PRODUCTION_SOUND.mp3",
  },
];

export const DEFAULT_THEME_ID: ThemeId = "space";

export function getThemeConfig(id: string | null | undefined): ThemeConfig {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
