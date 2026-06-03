import type { Metadata } from "next";
import CastNewClient from "./CastNewClient";

export const metadata: Metadata = {
  title: "Новий випуск — КодлоCAST",
};

export default function CastNewPage() {
  return <CastNewClient />;
}
