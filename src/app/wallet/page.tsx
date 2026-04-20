import { loadData } from "@/data/loader";
import { WalletEditor } from "@/components/WalletEditor";

export default function WalletPage() {
  const db = loadData();
  return (
    <div className="space-y-4 pt-2">
      <WalletEditor db={db} />
    </div>
  );
}
