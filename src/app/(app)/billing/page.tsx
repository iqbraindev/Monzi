import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { BillingView } from "@/components/billing/billing-view";

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-aria-primary" />
        </div>
      }
    >
      <BillingView />
    </Suspense>
  );
}
