"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createCard, checkDuplicate } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/cards/custom-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadIcon, XIcon, AlertTriangleIcon, SaveIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { ImagePicker } from "@/components/cards/image-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { Card as CardType } from "@/lib/db/schema";

const GENRES = [
  { value: "basketball", label: "Basketball" },
  { value: "baseball", label: "Baseball" },
  { value: "football", label: "Football" },
  { value: "soccer", label: "Soccer" },
  { value: "hockey", label: "Hockey" },
  { value: "pokemon", label: "Pokémon" },
  { value: "yugioh", label: "Yu-Gi-Oh!" },
  { value: "magic", label: "Magic: The Gathering" },
  { value: "other", label: "Other" },
];

const GRADE_COMPANY_OPTIONS = [
  { value: "none", label: "None / Raw" },
  ...["PSA", "BGS", "CGC", "SGC", "HGA"].map((g) => ({ value: g, label: g })),
];

const CONDITION_OPTIONS = [
  { value: "none", label: "—" },
  { value: "mint", label: "Mint" },
  { value: "near_mint", label: "Near Mint" },
  { value: "excellent", label: "Excellent" },
  { value: "very_good", label: "Very Good" },
  { value: "good", label: "Good" },
  { value: "poor", label: "Poor" },
];

interface AddCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: "owned" | "wanted";
}

export function AddCardDialog({ open, onOpenChange, defaultStatus = "owned" }: AddCardDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"owned" | "wanted">(defaultStatus);
  const [genre, setGenre] = useState("other");
  const [gradeCompany, setGradeCompany] = useState("none");
  const [condition, setCondition] = useState("none");
  const [duplicate, setDuplicate] = useState<CardType | null>(null);
  const [forceSubmit, setForceSubmit] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [confirmingReplace, setConfirmingReplace] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const setNameRef = useRef<HTMLInputElement>(null);
  const cardNumberRef = useRef<HTMLInputElement>(null);
  const variantRef = useRef<HTMLInputElement>(null);
  const gradeValueRef = useRef<HTMLInputElement>(null);
  const scanAbortRef = useRef<AbortController | null>(null);

  function resetForm() {
    scanAbortRef.current?.abort();
    scanAbortRef.current = null;
    setScanning(false);
    setUploading(false);
    setPhotoPreview(null);
    setPhotoUrl(null);
    setStatus(defaultStatus);
    setGenre("other");
    setGradeCompany("none");
    setCondition("none");
    setDuplicate(null);
    setForceSubmit(false);
    setConfirmingReplace(false);
  }

  function clearOcrFields() {
    if (nameRef.current) nameRef.current.value = "";
    if (yearRef.current) yearRef.current.value = "";
    if (setNameRef.current) setNameRef.current.value = "";
    if (cardNumberRef.current) cardNumberRef.current.value = "";
    if (variantRef.current) variantRef.current.value = "";
    if (gradeValueRef.current) gradeValueRef.current.value = "";
    setGenre("other");
    setGradeCompany("none");
    setCondition("none");
    setPhotoPreview(null);
    setPhotoUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function getSearchQuery() {
    return [
      nameRef.current?.value,
      yearRef.current?.value,
      setNameRef.current?.value,
      cardNumberRef.current?.value ? `#${cardNumberRef.current.value}` : null,
      variantRef.current?.value,
    ].filter(Boolean).join(" ");
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoPreview(URL.createObjectURL(file));

    // Upload + OCR run in parallel
    setUploading(true);
    const uploadFd = new FormData();
    uploadFd.append("file", file);
    fetch("/api/upload", { method: "POST", body: uploadFd })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { url?: string } | null) => { if (d?.url) setPhotoUrl(d.url); })
      .catch(() => toast.error("Photo upload failed"))
      .finally(() => setUploading(false));

    const abortController = new AbortController();
    scanAbortRef.current?.abort();
    scanAbortRef.current = abortController;

    setScanning(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/cards/scan", { method: "POST", body: fd, signal: abortController.signal });
      const data = await res.json() as { card?: Record<string, unknown>; error?: string };
      if (res.ok && !data.error) {
        const c = data.card ?? {};
        if (c.name && nameRef.current) nameRef.current.value = String(c.name);
        if (c.year && yearRef.current) yearRef.current.value = String(c.year);
        if (c.setName && setNameRef.current) setNameRef.current.value = String(c.setName);
        if (c.cardNumber && cardNumberRef.current) cardNumberRef.current.value = String(c.cardNumber);
        if (c.variant && variantRef.current) variantRef.current.value = String(c.variant);
        if (c.gradeValue && gradeValueRef.current) gradeValueRef.current.value = String(c.gradeValue);
        if (c.sportGenre && typeof c.sportGenre === "string") setGenre(c.sportGenre);
        if (c.gradeCompany && typeof c.gradeCompany === "string") setGradeCompany(c.gradeCompany);
        if (c.condition && typeof c.condition === "string") setCondition(c.condition);
        toast.success("Card scanned — review and adjust the details as needed.", { duration: 8000 });
      } else if (!abortController.signal.aborted) {
        // Scan returned an error — let the user know so they can fill in manually
        console.error("[scan] server error:", data.error ?? `HTTP ${res.status}`);
        toast.info("Couldn't read the card automatically — fill in the details below.", { duration: 5000 });
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return; // dialog closed — discard silently
      console.error("[scan] fetch error:", err);
      toast.info("Couldn't read the card automatically — fill in the details below.", { duration: 5000 });
    } finally {
      if (!abortController.signal.aborted) {
        setScanning(false);
        scanAbortRef.current = null;
      }
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const gc_raw = form.get("gradeCompany") as string;
    const name = form.get("name") as string;
    const year = form.get("year") ? parseInt(form.get("year") as string) : null;
    const setName = (form.get("setName") as string) || null;
    const gc = gc_raw && gc_raw !== "none" ? gc_raw : null;
    const gv = (form.get("gradeValue") as string) || null;

    if (!forceSubmit) {
      const dup = await checkDuplicate(name, year, setName, gc, gv);
      if (dup) {
        setDuplicate(dup);
        setLoading(false);
        return;
      }
    }

    try {
      const card = await createCard({
        name,
        setName,
        year,
        sportGenre: (form.get("sportGenre") as string) || "other",
        cardNumber: (form.get("cardNumber") as string) || null,
        variant: (form.get("variant") as string) || null,
        gradeCompany: gc,
        gradeValue: gv,
        condition: (form.get("condition") as string) || null,
        purchasePrice: status === "wanted" ? 0 : parseFloat((form.get("purchasePrice") as string) || "0"),
        notes: (form.get("notes") as string) || null,
        photoUrl,
        status,
      });

      toast.success("Card added!");
      if (status === "owned") {
        fetch(`/api/pricing/refresh/${card.id}`, { method: "POST" }).catch(() => {});
      }

      onOpenChange(false);
      resetForm();
      router.refresh();
      if (status === "wanted") router.push("/watchlist");
    } catch {
      toast.error("Failed to add card");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Card</DialogTitle>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatus("owned")}
              className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                status === "owned"
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              Owned
            </button>
            <button
              type="button"
              onClick={() => setStatus("wanted")}
              className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                status === "wanted"
                  ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              Watchlist
            </button>
            <DialogClose className="ml-2 flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <XIcon className="h-4 w-4" />
            </DialogClose>
          </div>
        </DialogHeader>

        <form id="add-card-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <DialogBody>
            {/* Duplicate warning */}
            {duplicate && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/40 bg-amber-500/8">
                <AlertTriangleIcon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-500">Possible duplicate</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    You already have{" "}
                    <Link href={`/cards/${duplicate.id}`} className="underline text-foreground hover:text-primary">
                      {duplicate.name}
                      {duplicate.year ? ` (${duplicate.year})` : ""}
                      {duplicate.setName ? ` — ${duplicate.setName}` : ""}
                    </Link>{" "}
                    in your collection.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => { setForceSubmit(true); setDuplicate(null); }}
                      className="text-xs px-3 py-1.5 rounded-md bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 transition-colors font-medium"
                    >
                      Add anyway
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicate(null)}
                      className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Photo */}
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex gap-4">
                  <div className="shrink-0">
                    {photoPreview ? (
                      <div className="relative w-[90px] aspect-[5/7] rounded-xl overflow-hidden border border-border bg-muted/20 group shadow-sm">
                        <Image src={photoPreview} alt="Card preview" fill className="object-contain" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors rounded-xl" />
                        <button
                          type="button"
                          onClick={() => { setPhotoPreview(null); setPhotoUrl(null); }}
                          className="absolute top-1.5 right-1.5 bg-black/70 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
                        >
                          <XIcon className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="w-[90px] aspect-[5/7] flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-muted/10 hover:bg-muted/30 hover:border-primary/40 transition-all cursor-pointer group"
                      >
                        <div className="p-2 rounded-full bg-muted/60 group-hover:bg-muted mb-2 transition-colors">
                          <UploadIcon className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                        <span className="text-[10px] text-muted-foreground/50 text-center leading-tight px-2">Click to<br />upload</span>
                      </button>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-2 justify-center">
                    <div className="mb-1">
                      <p className="text-sm font-semibold">Card Photo</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Upload a file or search eBay sold listings.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (photoPreview) {
                          setConfirmingReplace(true);
                        } else {
                          fileRef.current?.click();
                        }
                      }}
                      disabled={uploading || confirmingReplace}
                      className="self-start flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted hover:border-muted-foreground/30 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      <UploadIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {uploading ? "Uploading…" : photoPreview ? "Replace photo" : "Upload photo"}
                    </button>
                    {confirmingReplace && (
                      <div className="flex flex-col gap-2 p-3 rounded-lg border border-amber-500/40 bg-amber-500/8">
                        <p className="text-xs text-amber-500 font-medium leading-snug">
                          Replacing the photo will clear all scanned details. Continue?
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmingReplace(false);
                              clearOcrFields();
                              fileRef.current?.click();
                            }}
                            className="text-xs px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 transition-colors font-medium"
                          >
                            Replace &amp; clear
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingReplace(false)}
                            className="text-xs px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:bg-muted transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    <ImagePicker getQuery={getSearchQuery} onSelect={(url) => { setPhotoUrl(url); setPhotoPreview(url); }} />
                    {uploading && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full w-2/3 bg-primary/50 rounded-full animate-pulse" />
                        </div>
                        <span className="text-[10px] text-muted-foreground">Uploading…</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </Card>

            {/* Card Info */}
            <Card>
              <CardHeader><CardTitle className="text-base">Card Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Field label="Card Name *">
                  <Input ref={nameRef} name="name" required placeholder="e.g. Victor Wembanyama" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Sport / Category *">
                    <CustomSelect name="sportGenre" value={genre} onChange={setGenre} options={GENRES} />
                  </Field>
                  <Field label="Year *">
                    <Input ref={yearRef} name="year" type="number" placeholder="2024" min={1900} max={2099} required />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Set Name *">
                    <Input ref={setNameRef} name="setName" placeholder="e.g. Prizm" required />
                  </Field>
                  <Field label="Card Number *">
                    <Input ref={cardNumberRef} name="cardNumber" placeholder="e.g. 136" required />
                  </Field>
                </div>
                <Field label="Variant / Parallel *">
                  <Input ref={variantRef} name="variant" placeholder="e.g. Base, Holo, Silver Prizm" required />
                </Field>
              </CardContent>
            </Card>

            {/* Grade & Condition */}
            <Card>
              <CardHeader><CardTitle className="text-base">Grade &amp; Condition</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Grading Company">
                    <CustomSelect name="gradeCompany" value={gradeCompany} onChange={setGradeCompany} options={GRADE_COMPANY_OPTIONS} />
                  </Field>
                  <Field label="Grade">
                    <Input ref={gradeValueRef} name="gradeValue" placeholder="e.g. 10, 9.5, 9" />
                  </Field>
                </div>
                <Field label="Condition (ungraded)">
                  <CustomSelect name="condition" value={condition} onChange={setCondition} options={CONDITION_OPTIONS} />
                </Field>
              </CardContent>
            </Card>

            {/* Value / Notes */}
            {status === "owned" ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Value</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Field label="Purchase Price (USD)">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input name="purchasePrice" type="number" step="0.01" min="0" defaultValue="0" placeholder="0.00" className="pl-7" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Set to $0 for personal collection / keepsakes</p>
                  </Field>
                  <Field label="Notes">
                    <Textarea name="notes" placeholder="Any notes about this card…" rows={3} className="resize-none" />
                  </Field>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <Field label="Notes">
                    <Textarea name="notes" placeholder="Why you want this card, target price, etc…" rows={3} className="resize-none" />
                  </Field>
                </CardContent>
              </Card>
            )}
          </DialogBody>

          <DialogFooter>
            <DialogClose
              className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={resetForm}
            >
              Cancel
            </DialogClose>
            <Button type="submit" form="add-card-form" disabled={loading || uploading} className="gap-2">
              <SaveIcon className="h-4 w-4" />
              {loading ? "Adding…" : status === "wanted" ? "Add to Watchlist" : "Add Card"}
            </Button>
          </DialogFooter>
        </form>

        {/* Scanning overlay — blocks interaction while OCR is running */}
        {scanning && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 px-10 py-8 rounded-2xl bg-card border border-border shadow-2xl">
              <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-semibold">Scanning card&hellip;</p>
                <p className="text-xs text-muted-foreground mt-1">Analyzing your image and extracting card details</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
