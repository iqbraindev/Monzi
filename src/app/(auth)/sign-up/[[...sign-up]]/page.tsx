import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthSocialButtons } from "@/components/auth/auth-social-buttons";
import { signUpAppearance } from "@/lib/clerk-auth-appearance";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Free to start — set up your workspace and first agent in under two minutes."
      footerLink={{
        prompt: "Already have an account?",
        linkLabel: "Sign in",
        href: "/sign-in",
      }}
    >
      <AuthSocialButtons mode="sign-up" redirectUrl="/onboarding" />
      <div className="auth-form">
        <SignUp
          appearance={signUpAppearance}
          forceRedirectUrl="/onboarding"
          signInForceRedirectUrl="/dashboard"
        />
      </div>
    </AuthShell>
  );
}
