import { loadData } from "@/data/loader";
import { RecommendView } from "@/components/RecommendView";

export const dynamic = "force-static";

export default function RecommendPage() {
  const db = loadData();
  return <RecommendView db={db} />;
}
