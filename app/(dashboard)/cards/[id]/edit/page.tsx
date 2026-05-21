import { getCard } from "@/lib/actions";
import { notFound } from "next/navigation";
import { EditCardForm } from "@/components/cards/edit-card-form";

export default async function EditCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id);
  if (!card) notFound();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <EditCardForm card={card} />
    </div>
  );
}
