"use client";


import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) {
          setStatus("authenticated");
        } else {
          setStatus("unauthenticated");
          router.push("/login");
        }
      })
      .catch(() => {
        setStatus("unauthenticated");
        router.push("/login");
      });
  }, [router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return <>{children}</>;
}
