import type { Metadata } from "next";
import KodloruneClient from "./KodloruneClient";

export const metadata: Metadata = {
  title: {
    absolute: "kodlorune",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function KodlorunePage() {
  return <KodloruneClient />;
}
