import type { Metadata } from "next";
import KodloruneClient from "./KodloruneClient";

export const metadata: Metadata = {
  title: {
    absolute: "unforgettable",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function KodlorunePage() {
  return <KodloruneClient />;
}
