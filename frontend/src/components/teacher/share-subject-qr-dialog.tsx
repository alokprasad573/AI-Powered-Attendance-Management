"use client";

import { Check, Copy, Download, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ShareSubjectQrDialog({
  subjectName,
  subjectCode,
}: {
  subjectName: string;
  subjectCode: string;
}) {
  const [open, setOpen] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
      window.location.origin;
    const url = `${origin}/?join-class=${encodeURIComponent(subjectCode)}`;

    let active = true;
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: {
        dark: "#090A0B",
        light: "#F5F6F6",
      },
    })
      .then((dataUrl) => {
        if (active) {
          setJoinUrl(url);
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (active) {
          setJoinUrl(url);
          setQrDataUrl(null);
        }
      });

    return () => {
      active = false;
    };
  }, [open, subjectCode]);

  async function handleCopy() {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      toast.success("Join link copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Clipboard copy blocked by browser.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="sm">
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Share QR Code: {subjectName}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Scan to join {subjectName}</DialogTitle>
          <DialogDescription>
            Subject Code: <span className="telemetry-num text-[var(--accent-primary)]">{subjectCode}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Copy Link</h3>
            <div className="glass-row break-all rounded-[12px] p-3 font-mono text-xs text-[var(--accent-primary)]">
              {joinUrl || "Generating URL..."}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => void handleCopy()}>
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                {copied ? "Copied" : "Copy Link"}
              </Button>
              {qrDataUrl ? (
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={qrDataUrl} download={`join-${subjectCode}.png`}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download PNG
                  </a>
                </Button>
              ) : null}
            </div>
            <p role="status" className="visually-hidden">
              {copied ? "Copied join link" : ""}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Share this link on WhatsApp or Email or Scan to join class.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-[16px] border border-[var(--border-default)] bg-[#060708] p-4">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`QR Code to join class of ${subjectName}`}
                className="h-52 w-52 rounded-[12px] bg-[#F5F6F6] p-2"
              />
            ) : (
              <div className="flex h-52 w-52 items-center justify-center text-xs text-[var(--text-secondary)]">
                Generating QR...
              </div>
            )}
            <p className="mt-2.5 text-center text-xs text-[var(--text-secondary)]">
              QR Code for {subjectCode}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
