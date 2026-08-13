import type { Metadata } from "next";
import ForgottenManClient from "./ForgottenManClient";

export const metadata: Metadata = {
  title: {
    absolute: "kodlo",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgottenManPage() {
  return <ForgottenManClient />;
}
