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
import { ArrowLeftIcon, UploadIcon, XIcon, AlertTriangleIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { ButtonLink } from "@/components/ui/button-link";
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
  const [genre, setGenre] = useState("other");
  const [gradeCompany, setGradeCompany] = useState("none");
  const [condition, setCondition] = useState("none");
  const [duplicate, setDuplicate] = useState<CardType | null>(null);
  const [forceSubmit, setForceSubmit] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <ButtonLink href="/cards" variant="ghost" size="sm" className="gap-2 -ml-2 inline-flex items-center">
        <ArrowLeftIcon className="h-4 w-4" /> Back
      </ButtonLink>

      <div>
        <h1 className="text-2xl font-bold">Add Card</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Add a card to your collection</p>
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
          <CardHeader><CardTitle className="text-base">Card Photo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-center">
              {photoPreview ? (
                <div className="relative w-full max-w-[220px] aspect-[5/7] rounded-lg overflow-hidden border border-border">
                  <Image src={photoPreview} alt="Preview" fill className="object-contain" />
                  <button
                    type="button"
                    onClick={() => { setPhotoPreview(null); setPhotoUrl(null); }}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-1 hover:bg-black"
                  >
                    <XIcon className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center justify-center w-full max-w-[220px] aspect-[5/7] border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <UploadIcon className="h-7 w-7 text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground text-center">Click to upload<br />or auto-fetched</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
            <ImagePicker
              getQuery={getSearchQuery}
              onSelect={(url) => { setPhotoUrl(url); setPhotoPreview(url); }}
            />
          </CardContent>
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
              <Field label="Year">
                <Input ref={yearRef} name="year" type="number" placeholder="2024" min={1900} max={2099} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Set Name">
                <Input ref={setNameRef} name="setName" placeholder="e.g. Prizm" />
              </Field>
              <Field label="Card Number">
                <Input ref={cardNumberRef} name="cardNumber" placeholder="e.g. 136" />
              </Field>
            </div>
            <Field label="Variant / Parallel">
              <Input ref={variantRef} name="variant" placeholder="e.g. Base, Holo, Silver Prizm" />
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

        <Button type="submit" disabled={loading || uploading} className="w-full h-11 text-base">
          {loading ? "Adding card…" : status === "wanted" ? "Add to Watchlist" : "Add Card"}
        </Button>
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
