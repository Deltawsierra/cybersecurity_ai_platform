import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { toArray, toText } from "@/lib/safe";

const fallbackNews = [
  "Athena AI monitoring active",
  "Connecting to threat intelligence feed...",
];

export function NewsTicker() {
  const { data: newsData } = useQuery<string[]>({
    queryKey: ["/api/dashboard/news"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/dashboard/news", { credentials: "include" });
        if (!res.ok) return null;
        return await res.json();
      } catch { return null; }
    },
    refetchInterval: 60000,
    retry: false,
  });

  const doubled = useMemo(() => {
    const items = toArray<unknown>(newsData).map(toText).filter(Boolean);
    const base = items.length > 0 ? items : fallbackNews;
    return [...base, ...base];
  }, [newsData]);

  return (
    <div className="w-full bg-muted/50 dark:bg-[rgba(2,8,25,0.8)] border-b dark:border-b-[rgba(255,0,180,0.15)] overflow-hidden" data-testid="news-ticker">
      <div className="flex animate-ticker whitespace-nowrap py-2">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-2 px-6 text-xs text-muted-foreground">
            <Shield className="h-3 w-3 text-primary flex-shrink-0" />
            {item}
            <span className="text-muted-foreground/40 ml-4">&middot;</span>
          </span>
        ))}
      </div>
    </div>
  );
}
