import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Monzi</h1>
      <p className="max-w-lg text-muted-foreground">
        Your AI multi-agent personal and business assistant. Create agents,
        connect your apps, and control everything from one dashboard.
      </p>
      <div className="flex gap-3">
        <Link href="/sign-up">
          <Button>Get Started Free</Button>
        </Link>
        <Link href="/sign-in">
          <Button variant="outline">Sign In</Button>
        </Link>
      </div>
    </main>
  );
}
