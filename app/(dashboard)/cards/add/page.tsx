"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createCard } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const GRADE_COMPANIES = ["PSA", "BGS", "CGC", "SGC", "HGA", "raw"];
const CONDITIONS = ["Mint", "Near Mint", "Excellent", "Very Good", "Good", "Poor"];

export default function AddCardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
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

    try {
      const card = await createCard({
        name: form.get("name") as string,
        setName: (form.get("setName") as string) || null,
        year: form.get("year") ? parseInt(form.get("year") as string) : null,
        sportGenre: (form.get("sportGenre") as string) || "other",
        cardNumber: (form.get("cardNumber") as string) || null,
        variant: (form.get("variant") as string) || null,
        gradeCompany: gradeCompany && gradeCompany !== "none" ? gradeCompany : null,
        gradeValue: (form.get("gradeValue") as string) || null,
        condition: (form.get("condition") as string) || null,
        purchasePrice: parseFloat((form.get("purchasePrice") as string) || "0"),
        notes: (form.get("notes") as string) || null,
        photoUrl: photoUrl,
      });

      toast.success("Card added!");

      // Auto-fetch prices
      fetch(`/api/pricing/refresh/${card.id}`, { method: "POST" }).catch(() => {});

      router.push(`/cards/${card.id}`);
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo */}
        <Card>
          <CardHeader><CardTitle className="text-base">Card Photo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {photoPreview ? (
              <div className="relative w-40 h-56 rounded-lg overflow-hidden border border-border">
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
                className="flex flex-col items-center justify-center w-40 h-56 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
              >
                <UploadIcon className="h-6 w-6 text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground text-center">Click to upload<br />or auto-fetched</p>
              </div>
            )}
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
                <Select name="sportGenre" defaultValue="other">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GENRES.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                <Select name="gradeCompany" defaultValue="none">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None / Raw</SelectItem>
                    {GRADE_COMPANIES.filter(g => g !== "raw").map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Grade">
                <Input name="gradeValue" placeholder="e.g. 10, 9.5, 9" />
              </Field>
            </div>
            <Field label="Condition (ungraded)">
              <Select name="condition" defaultValue="none">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {CONDITIONS.map(c => <SelectItem key={c} value={c.toLowerCase().replace(/ /g, "_")}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        {/* Value */}
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

        <Button type="submit" disabled={loading || uploading} className="w-full h-11 text-base">
          {loading ? "Adding card…" : "Add Card"}
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
