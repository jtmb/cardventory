"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateCard } from "@/lib/actions";
import type { Card } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomSelect } from "@/components/cards/custom-select";
import { Card as UiCard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeftIcon, UploadIcon, XIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { ButtonLink } from "@/components/ui/button-link";
import { ImagePicker } from "@/components/cards/image-picker";

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

const GRADE_COMPANIES = ["PSA", "BGS", "CGC", "SGC", "HGA"];
const GRADE_COMPANY_OPTIONS = [
  { value: "none", label: "None / Raw" },
  ...GRADE_COMPANIES.map((g) => ({ value: g, label: g })),
];
const CONDITIONS = ["Mint", "Near Mint", "Excellent", "Very Good", "Good", "Poor"];
const CONDITION_OPTIONS = [
  { value: "none", label: "—" },
  ...CONDITIONS.map((c) => ({ value: c.toLowerCase().replace(/ /g, "_"), label: c })),
];

export function EditCardForm({ card, inOverlay = false }: { card: Card; inOverlay?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(card.photoUrl);
  const [photoUrl, setPhotoUrl] = useState<string | null>(card.photoUrl);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"owned" | "wanted">((card.status as "owned" | "wanted") ?? "owned");
  const [isTradeBait, setIsTradeBait] = useState(card.isTradeBait ?? false);
  const [genre, setGenre] = useState(card.sportGenre ?? "other");
  const [gradeCompany, setGradeCompany] = useState(card.gradeCompany ?? "none");
  const [condition, setCondition] = useState(card.condition ?? "none");
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const setNameRef = useRef<HTMLInputElement>(null);
  const cardNumberRef = useRef<HTMLInputElement>(null);
  const variantRef = useRef<HTMLInputElement>(null);

  function getSearchQuery() {
    return [
      nameRef.current?.value ?? card.name,
      yearRef.current?.value ?? card.year,
      setNameRef.current?.value ?? card.setName,
      (cardNumberRef.current?.value ?? card.cardNumber) ? `#${cardNumberRef.current?.value ?? card.cardNumber}` : null,
      variantRef.current?.value ?? card.variant,
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
    const condition = form.get("condition") as string;

    try {
      await updateCard(card.id, {
        name: form.get("name") as string,
        setName: (form.get("setName") as string) || null,
        year: form.get("year") ? parseInt(form.get("year") as string) : null,
        sportGenre: (form.get("sportGenre") as string) || "other",
        cardNumber: (form.get("cardNumber") as string) || null,
        variant: (form.get("variant") as string) || null,
        gradeCompany: gradeCompany && gradeCompany !== "none" ? gradeCompany : null,
        gradeValue: (form.get("gradeValue") as string) || null,
        condition: condition && condition !== "none" ? condition : null,
        purchasePrice: status === "wanted" ? 0 : parseFloat((form.get("purchasePrice") as string) || "0"),
        notes: (form.get("notes") as string) || null,
        photoUrl,
        status,
        isTradeBait: status === "owned" ? isTradeBait : false,
      });
      toast.success("Card updated");
      if (inOverlay) {
        router.back();
      } else {
        router.push(`/cards/${card.id}`);
      }
    } catch {
      toast.error("Update failed");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {!inOverlay && (
        <>
          <ButtonLink href={`/cards/${card.id}`} variant="ghost" size="sm" className="gap-2 -ml-2 inline-flex items-center">
            <ArrowLeftIcon className="h-4 w-4" /> Back
          </ButtonLink>
          <div>
            <h1 className="text-2xl font-bold">Edit Card</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{card.name}</p>
          </div>
        </>
      )}
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
      <form onSubmit={handleSubmit} className="space-y-6">
        <UiCard>
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
        </UiCard>

        <UiCard>
          <CardHeader><CardTitle className="text-base">Card Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Card Name *">
              <Input ref={nameRef} name="name" required defaultValue={card.name} />
            </Field>
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
                <Input ref={yearRef} name="year" type="number" defaultValue={card.year ?? ""} min={1900} max={2099} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Set Name">
                <Input ref={setNameRef} name="setName" defaultValue={card.setName ?? ""} />
              </Field>
              <Field label="Card Number">
                <Input ref={cardNumberRef} name="cardNumber" defaultValue={card.cardNumber ?? ""} />
              </Field>
            </div>
            <Field label="Variant / Parallel">
              <Input ref={variantRef} name="variant" defaultValue={card.variant ?? ""} />
            </Field>
          </CardContent>
        </UiCard>

        <UiCard>
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
                <Input name="gradeValue" defaultValue={card.gradeValue ?? ""} placeholder="e.g. 10, 9.5" />
              </Field>
            </div>
            <Field label="Condition">
              <CustomSelect
                name="condition"
                value={condition}
                onChange={setCondition}
                options={CONDITION_OPTIONS}
              />
            </Field>
          </CardContent>
        </UiCard>

        <UiCard>
          <CardHeader><CardTitle className="text-base">Value</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {status === "owned" && (
              <Field label="Purchase Price (USD)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input name="purchasePrice" type="number" step="0.01" min="0" defaultValue={card.purchasePrice} className="pl-7" />
                </div>
              </Field>
            )}
            <Field label="Notes">
              <Textarea name="notes" defaultValue={card.notes ?? ""} rows={3} className="resize-none" />
            </Field>
            {status === "owned" && (
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
            )}
          </CardContent>
        </UiCard>

        <Button type="submit" disabled={loading || uploading} className="w-full h-11 text-base">
          {loading ? "Saving…" : "Save Changes"}
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
