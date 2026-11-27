"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LogoutButton({ redirectTo = "/" }: { redirectTo?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Logged out successfully.");
      router.push(redirectTo);
      router.refresh();
    } catch {
      toast.error("Failed to sign out. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void handleLogout()}
      disabled={loading}
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {loading ? "Signing out..." : "Logout"}
    </Button>
  );
}
