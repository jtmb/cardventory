export default function CardsLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="h-24 w-24 rounded-full border-[6px] border-border border-t-primary animate-spin" />
    </div>
  );
}
