import { loadData } from "@/data/loader";
import { HomeSearchView } from "@/components/HomeSearchView";

export default function HomePage() {
  const db = loadData();
  return <HomeSearchView db={db} />;
}
