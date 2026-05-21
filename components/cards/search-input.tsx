import { SearchIcon } from "lucide-react";

export function SearchInput({
  defaultValue,
  genre,
}: {
  defaultValue?: string;
  genre?: string;
}) {
  return (
    <form action="/cards" method="get" className="relative flex items-center shrink-0">
      {genre && genre !== "all" && (
        <input type="hidden" name="genre" value={genre} />
      )}
      <SearchIcon className="absolute left-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue ?? ""}
        placeholder="Search cards..."
        className="h-8 w-52 rounded-md bg-background border border-border pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </form>
  );
}
