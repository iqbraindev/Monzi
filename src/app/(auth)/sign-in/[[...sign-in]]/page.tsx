import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthSocialButtons } from "@/components/auth/auth-social-buttons";
import { signInAppearance } from "@/lib/clerk-auth-appearance";

export default function SignInPage() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back — pick up where you left off with your agents and dashboard."
      footerLink={{
        prompt: "New to Monzi?",
        linkLabel: "Create free account",
        href: "/sign-up",
      }}
    >
      <AuthSocialButtons mode="sign-in" redirectUrl="/dashboard" />
      <div className="auth-form">
        <SignIn
          appearance={signInAppearance}
          forceRedirectUrl="/dashboard"
          signUpForceRedirectUrl="/dashboard"
        />
      </div>
    </AuthShell>
  );
}
