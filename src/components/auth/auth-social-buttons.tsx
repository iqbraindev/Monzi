"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import {
  FacebookIcon,
  GoogleIcon,
  LinkedInIcon,
} from "@/components/auth/auth-provider-icons";
import { cn } from "@/lib/utils";

type AuthMode = "sign-in" | "sign-up";

type OAuthStrategy =
  | "oauth_google"
  | "oauth_facebook"
  | "oauth_linkedin";

const PROVIDERS: {
  strategy: OAuthStrategy;
  label: string;
  Icon: typeof GoogleIcon;
}[] = [
  { strategy: "oauth_google", label: "Google", Icon: GoogleIcon },
  { strategy: "oauth_facebook", label: "Facebook", Icon: FacebookIcon },
  { strategy: "oauth_linkedin", label: "LinkedIn", Icon: LinkedInIcon },
];

interface AuthSocialButtonsProps {
  mode: AuthMode;
  redirectUrl: string;
}

export function AuthSocialButtons({
  mode,
  redirectUrl,
}: AuthSocialButtonsProps) {
  const { signIn, fetchStatus: signInStatus } = useSignIn();
  const { signUp, fetchStatus: signUpStatus } = useSignUp();
  const [pending, setPending] = useState<OAuthStrategy | null>(null);

  const isBusy =
    pending !== null ||
    signInStatus === "fetching" ||
    signUpStatus === "fetching";

  async function handleOAuth(strategy: OAuthStrategy) {
    const authObject = mode === "sign-in" ? signIn : signUp;
    if (!authObject?.sso) return;

    setPending(strategy);
    const { error } = await authObject.sso({
      strategy,
      redirectUrl,
      redirectCallbackUrl: "/sso-callback",
    });

    if (error) setPending(null);
  }

  return (
    <>
      <div className="flex items-center justify-center gap-3">
        {PROVIDERS.map(({ strategy, label, Icon }) => {
          const loading = pending === strategy;
          return (
            <button
              key={strategy}
              type="button"
              disabled={isBusy}
              aria-label={`Continue with ${label}`}
              title={label}
              onClick={() => handleOAuth(strategy)}
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl border border-aria-border bg-aria-elevated transition-colors",
                "hover:border-aria-border-subtle hover:bg-aria-subtle",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aria-primary/40",
                "disabled:pointer-events-none disabled:opacity-50"
              )}
            >
              {loading ? (
                <Loader2 className="size-5 animate-spin text-aria-text-muted" />
              ) : (
                <Icon className="size-5" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-aria-border" />
        <span className="text-xs text-aria-text-muted">or</span>
        <div className="h-px flex-1 bg-aria-border" />
      </div>
    </>
  );
}
