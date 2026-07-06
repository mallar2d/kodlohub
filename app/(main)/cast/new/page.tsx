import CastNewClient from "./CastNewClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Новий випуск — КодлоCAST",
  description: "Створити новий випуск подкасту КодлоCAST.",
  path: "/cast/new",
  noIndex: true,
});

export default function CastNewPage() {
  return <CastNewClient />;
}
