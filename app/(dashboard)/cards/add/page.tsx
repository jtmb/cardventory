"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createCard, checkDuplicate } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomSelect } from "@/components/cards/custom-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UploadIcon, XIcon, AlertTriangleIcon, SaveIcon, ScanIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { ImagePicker } from "@/components/cards/image-picker";
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

const GRADE_COMPANIES = ["PSA", "BGS", "CGC", "SGC", "HGA", "raw"];
const GRADE_COMPANY_OPTIONS = [
  { value: "none", label: "None / Raw" },
  ...GRADE_COMPANIES.filter((g) => g !== "raw").map((g) => ({ value: g, label: g })),
];
const CONDITIONS = ["Mint", "Near Mint", "Excellent", "Very Good", "Good", "Poor"];
const CONDITION_OPTIONS = [
  { value: "none", label: "—" },
  ...CONDITIONS.map((c) => ({ value: c.toLowerCase().replace(/ /g, "_"), label: c })),
];

export default function AddCardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"owned" | "wanted">("owned");
  const [isTradeBait, setIsTradeBait] = useState(false);
  const [genre, setGenre] = useState("other");
  const [gradeCompany, setGradeCompany] = useState("none");
  const [condition, setCondition] = useState("none");
  const [duplicate, setDuplicate] = useState<CardType | null>(null);
  const [forceSubmit, setForceSubmit] = useState(false);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scanFileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const setNameRef = useRef<HTMLInputElement>(null);
  const cardNumberRef = useRef<HTMLInputElement>(null);
  const variantRef = useRef<HTMLInputElement>(null);

  function getSearchQuery() {
    return [
      nameRef.current?.value,
      yearRef.current?.value,
      setNameRef.current?.value,
      cardNumberRef.current?.value ? `#${cardNumberRef.current.value}` : null,
      variantRef.current?.value,
    ].filter(Boolean).join(" ");
  }

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setScanning(true);

    // Also upload the image as the card photo
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
    setUploading(true);
    const uploadFd = new FormData();
    uploadFd.append("file", file);
    fetch("/api/upload", { method: "POST", body: uploadFd })
      .then((r) => r.ok ? r.json() : null)
      .then((d: { url?: string } | null) => {
        if (d?.url) {
          setPhotoUrl(d.url);
          setPhotoPreview(d.url);
        }
      })
      .catch(() => {})
      .finally(() => setUploading(false));

    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/cards/scan", { method: "POST", body: fd });
      const data = await res.json() as { card?: Record<string, unknown>; error?: string };
      if (!res.ok || data.error) {
        toast.error(data.error ?? "Scan failed");
        return;
      }
      const c = data.card ?? {};
      if (c.name && nameRef.current) nameRef.current.value = String(c.name);
      if (c.year && yearRef.current) yearRef.current.value = String(c.year);
      if (c.setName && setNameRef.current) setNameRef.current.value = String(c.setName);
      if (c.cardNumber && cardNumberRef.current) cardNumberRef.current.value = String(c.cardNumber);
      if (c.variant && variantRef.current) variantRef.current.value = String(c.variant);
      if (c.sportGenre && typeof c.sportGenre === "string") setGenre(c.sportGenre);
      if (c.gradeCompany && typeof c.gradeCompany === "string") setGradeCompany(c.gradeCompany);
      if (c.condition && typeof c.condition === "string") setCondition(c.condition);
      toast.success("Card details filled in — review and adjust as needed.");
    } catch {
      toast.error("Scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);

    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      setPhotoUrl(data.url);
      setPhotoPreview(data.url);
    } else {
      toast.error("Photo upload failed");
    }
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const gradeCompany = form.get("gradeCompany") as string;
    const name = form.get("name") as string;
    const year = form.get("year") ? parseInt(form.get("year") as string) : null;
    const setName = (form.get("setName") as string) || null;
    const gc = gradeCompany && gradeCompany !== "none" ? gradeCompany : null;
    const gv = (form.get("gradeValue") as string) || null;

    // Duplicate detection (unless already confirmed)
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
        photoUrl: photoUrl,
        status,
        isTradeBait: status === "owned" ? isTradeBait : false,
      });

      toast.success("Card added!");

      // Auto-fetch prices for owned cards
      if (status === "owned") {
        fetch(`/api/pricing/refresh/${card.id}`, { method: "POST" }).catch(() => {});
      }

      router.push(status === "wanted" ? "/watchlist" : `/cards/${card.id}`);
    } catch (err) {
      toast.error("Failed to add card");
      setLoading(false);
    }
  }

  return (
    <div className="px-6 pt-0 pb-24 md:p-6 md:pb-24 max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="type-headline-large font-bold">Add Card</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Add a card to your collection</p>
          </div>
          <button
            type="button"
            onClick={() => scanFileRef.current?.click()}
            disabled={scanning}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors disabled:opacity-60 shrink-0"
            title="Take a photo of your card and we'll fill in the details automatically"
          >
            <ScanIcon className="h-4 w-4" />
            {scanning ? "Scanning…" : "Scan Card"}
          </button>
          <input
            ref={scanFileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleScan}
          />
        </div>
      </div>

      {/* Status toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setStatus("owned")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
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
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
            status === "wanted"
              ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          Wanted (Watchlist)
        </button>
      </div>

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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex gap-4">
              {/* Portrait thumbnail */}
              <div className="shrink-0">
                {photoPreview ? (
                  <div className="relative w-[110px] aspect-[5/7] rounded-xl overflow-hidden border border-border bg-muted/20 group shadow-sm">
                    <Image
                      src={photoPreview}
                      alt="Card preview"
                      fill
                      className="object-contain"
                      unoptimized={photoPreview.startsWith("http")}
                    />
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
                    className="w-[110px] aspect-[5/7] flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-muted/10 hover:bg-muted/30 hover:border-primary/40 transition-all cursor-pointer group"
                  >
                    <div className="p-2 rounded-full bg-muted/60 group-hover:bg-muted mb-2 transition-colors">
                      <UploadIcon className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <span className="text-[10px] text-muted-foreground/50 text-center leading-tight px-2">
                      Click to<br />upload
                    </span>
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex-1 flex flex-col gap-2 justify-center">
                <div className="mb-1">
                  <p className="text-sm font-semibold text-foreground">Card Photo</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    Upload a file or search eBay sold listings to find a card image.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="self-start flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted hover:border-muted-foreground/30 transition-colors text-sm font-medium text-foreground disabled:opacity-50"
                >
                  <UploadIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {uploading ? "Uploading…" : photoPreview ? "Replace photo" : "Upload photo"}
                </button>

                <ImagePicker
                  getQuery={getSearchQuery}
                  onSelect={(url) => { setPhotoUrl(url); setPhotoPreview(url); }}
                />

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
            <div className="grid grid-cols-1 gap-4">
              <Field label="Card Name *">
                <Input ref={nameRef} name="name" required placeholder="e.g. Victor Wembanyama" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Sport / Category *">
                <CustomSelect
                  name="sportGenre"
                  value={genre}
                  onChange={setGenre}
                  options={GENRES}
                />
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
                <CustomSelect
                  name="gradeCompany"
                  value={gradeCompany}
                  onChange={setGradeCompany}
                  options={GRADE_COMPANY_OPTIONS}
                />
              </Field>
              <Field label="Grade">
                <Input name="gradeValue" placeholder="e.g. 10, 9.5, 9" />
              </Field>
            </div>
            <Field label="Condition (ungraded)">
              <CustomSelect
                name="condition"
                value={condition}
                onChange={setCondition}
                options={CONDITION_OPTIONS}
              />
            </Field>
          </CardContent>
        </Card>

        {/* Value */}
        {status === "owned" && (
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
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Available to Trade</p>
                <p className="text-xs text-muted-foreground">List this card on the Trade Board.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isTradeBait}
                onClick={() => setIsTradeBait((v) => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${isTradeBait ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${isTradeBait ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
          </CardContent>
        </Card>
        )}
        {status === "wanted" && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Field label="Notes">
              <Textarea name="notes" placeholder="Why you want this card, target price, etc…" rows={3} className="resize-none" />
            </Field>
          </CardContent>
        </Card>
        )}

        <div className="fixed bottom-0 left-0 md:left-60 right-0 z-10 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto w-full max-w-2xl px-6 py-3 flex items-center gap-3">
            <Button type="submit" disabled={loading || uploading} className="gap-2 ml-auto shadow-sm">
              <SaveIcon className="h-4 w-4" />
              {loading ? "Adding card…" : status === "wanted" ? "Add to Watchlist" : "Add Card"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => router.push(status === "wanted" ? "/watchlist" : "/cards")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </div>
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
