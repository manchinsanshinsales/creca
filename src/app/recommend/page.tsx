import { Suspense } from "react";
import { loadData } from "@/data/loader";
import { RecommendView } from "@/components/RecommendView";

export const dynamic = "force-static";

export default function RecommendPage() {
  const db = loadData();
  return (
    <Suspense>
      <RecommendView db={db} />
    </Suspense>
  );
}
