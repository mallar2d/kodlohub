"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";

export default function CoffeeReminder() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    function checkTime() {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Show at 22:00, hide at 22:05
      if (hours === 22 && minutes < 5 && !dismissed) {
        setShow(true);
      } else {
        setShow(false);
      }
    }

    checkTime();
    const interval = setInterval(checkTime, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [dismissed]);

  return (
    <Modal isOpen={show} onClose={() => setDismissed(true)} className="p-8 max-w-md text-center">
      <img
        src="/kava.png"
        alt="Kava"
        className="w-32 h-32 mx-auto mb-6 object-contain"
      />

      <h2 className="heading-sub mb-4">22:00</h2>

      <p className="text-on-primary text-lg mb-2">
        Зараз 22:00. Час їбанути кави.
      </p>

      <p className="text-on-primary-mute mb-8">
        Кодло не спить. Кодло п'є каву.
      </p>

      <a
        href="https://kava.javajumper.ddns.net"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-ghost text-on-primary inline-block"
      >
        ПІТИ НА КАВУ
      </a>
    </Modal>
  );
}
