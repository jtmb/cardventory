import { getCard } from "@/lib/actions";
import { notFound } from "next/navigation";
import { EditCardOverlay } from "@/components/cards/edit-card-overlay";

export default async function EditCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) notFound();

  return <EditCardOverlay card={card} />;
}
