import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

import { MonziLogo, MONZI_LOGO_PROMO_STYLE } from "@/components/brand/monzi-logo";

export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-aria-base">
      <MonziLogo style={MONZI_LOGO_PROMO_STYLE} />
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
