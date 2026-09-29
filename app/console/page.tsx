"use client";

import { useEffect } from "react";

export default function ConsoleRedirect() {
  useEffect(() => {
    window.location.replace("/account/");
  }, []);
  return (
    <p className="text-sm text-muted">
      Redirecting to{" "}
      <a className="text-accent hover:underline" href="/account/">
        Account
      </a>
      …
    </p>
  );
}
