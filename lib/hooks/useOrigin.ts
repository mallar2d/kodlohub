"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** Origin поточної сторінки; на сервері та до гідрації — fallback. */
export function useOrigin(fallback = "https://kodlo.host"): string {
  return useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => fallback
  );
}
