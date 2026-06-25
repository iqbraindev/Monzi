import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";
import { signInAppearance } from "@/lib/clerk-auth-appearance";

export default function SignInPage() {
  return (
    <AuthShell
      title="Sign In"
      panel={{
        heading: "Hey There!",
        description:
          "Create your account now and step into an amazing new journey.",
        ctaLabel: "Sign Up",
        ctaHref: "/sign-up",
      }}
    >
      <SignIn
        appearance={signInAppearance}
        forceRedirectUrl="/dashboard"
        signUpForceRedirectUrl="/dashboard"
      />
    </AuthShell>
  );
}
