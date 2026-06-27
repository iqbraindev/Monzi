import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";
import { signUpAppearance } from "@/lib/clerk-auth-appearance";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Sign Up"
      panel={{
        heading: "Welcome Back!",
        description:
          "Already have an account? Sign in and pick up right where you left off.",
        ctaLabel: "Sign In",
        ctaHref: "/sign-in",
      }}
    >
      <SignUp
        appearance={signUpAppearance}
        forceRedirectUrl="/onboarding"
        signInForceRedirectUrl="/dashboard"
      />
    </AuthShell>
  );
}
