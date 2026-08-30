import type { Metadata } from "next";
import PaymentClient from "./PaymentClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Оплата KodloHUB Premium — Реквізити",
  description: "Оплата підписки KodloHUB Premium прямим переказом на карту.",
  path: "/payment",
});

export default function PaymentPage() {
  return <PaymentClient />;
}
