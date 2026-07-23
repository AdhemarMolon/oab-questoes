"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/lib/auth-client";

import styles from "./SignOutButton.module.css";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    await signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <button className={styles.button} disabled={pending} onClick={handleSignOut} type="button">
      {pending ? "Saindo…" : "Sair"}
    </button>
  );
}
