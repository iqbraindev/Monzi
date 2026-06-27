import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="aria-scope relative flex min-h-screen flex-col overflow-hidden bg-aria-base font-sans text-[15px] text-aria-text antialiased">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="aria-mesh-blob"
          style={{
            top: "-20%",
            left: "5%",
            width: "55%",
            height: "70%",
            background:
              "radial-gradient(circle, rgba(124,58,237,0.16), transparent 65%)",
            animation: "aria-mesh 22s ease-in-out infinite",
          }}
        />
        <div
          className="aria-mesh-blob"
          style={{
            bottom: "-25%",
            right: 0,
            width: "55%",
            height: "75%",
            background:
              "radial-gradient(circle, rgba(6,182,212,0.12), transparent 65%)",
            animation: "aria-mesh 28s ease-in-out infinite reverse",
          }}
        />
      </div>

      <div className="relative z-[1] flex min-h-screen flex-col">{children}</div>
    </div>
  );
}
