export default function CardsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100dvh-3.5rem)] md:min-h-dvh">
      <div className="h-24 w-24 rounded-full border-[6px] border-border border-t-primary animate-spin" style={{ animationDuration: "0.4s" }} />
    </div>
  );
}
