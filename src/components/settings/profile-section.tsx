"use client";

import { useUser } from "@clerk/nextjs";
import { Mail } from "lucide-react";

import {
  formatClerkRole,
  getConnectedAuthAccounts,
  getUserDisplayName,
  getUserInitials,
  usesEmailSignIn,
  type ConnectedAuthAccount,
} from "@/lib/clerk/user-profile";

function ProfileSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-5">
      <div className="flex items-center gap-4">
        <div className="size-16 rounded-full bg-aria-border" />
        <div className="h-9 w-28 rounded-full bg-aria-border" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="h-3 w-16 rounded bg-aria-border" />
            <div className="h-[42px] rounded-[11px] bg-aria-border" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectedAccountRow({ account }: { account: ConnectedAuthAccount }) {
  return (
    <div className="flex items-center gap-3 rounded-[11px] border border-aria-border bg-aria-surface px-3.5 py-3">
      {account.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={account.imageUrl}
          alt={account.label}
          className="size-9 rounded-full object-cover"
        />
      ) : (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-aria-elevated text-xs font-semibold text-aria-text">
          {account.label.slice(0, 1)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-aria-text">{account.label}</p>
        {account.detail && (
          <p className="truncate text-xs text-aria-text-secondary">
            {account.detail}
          </p>
        )}
      </div>
      <span className="rounded-full bg-aria-primary/15 px-2.5 py-1 text-[11px] font-semibold text-aria-primary-light">
        Connected
      </span>
    </div>
  );
}

export function ProfileSection() {
  const { isLoaded, user } = useUser();

  if (!isLoaded) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return (
      <p className="text-sm text-aria-text-secondary">
        Sign in to view your profile.
      </p>
    );
  }

  const displayName = getUserDisplayName(user);
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const role = formatClerkRole(user.publicMetadata?.role as string | undefined);
  const connectedAccounts = getConnectedAuthAccounts(user);
  const initials = getUserInitials(displayName);

  return (
    <>
      <div className="flex items-center gap-4">
        {user.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.imageUrl}
            alt={displayName}
            className="size-16 rounded-full object-cover"
          />
        ) : (
          <span
            className="flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#6366F1,#06B6D4)" }}
          >
            {initials}
          </span>
        )}
        <button
          type="button"
          disabled
          title="Avatar changes are managed through your connected accounts"
          className="h-9 cursor-not-allowed rounded-full border border-aria-border bg-aria-elevated px-4 text-[13px] font-semibold text-aria-text-secondary opacity-70"
        >
          Change avatar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" value={displayName} />
        <Field label="Email" value={email} />
        <Field label="Role" value={role} disabled />
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold text-aria-text">
            Sign-in methods
          </h3>
          <p className="mt-1 text-xs text-aria-text-secondary">
            Accounts you used to sign in through Clerk.
          </p>
        </div>

        {connectedAccounts.length > 0 ? (
          <div className="flex flex-col gap-2">
            {connectedAccounts.map((account) => (
              <ConnectedAccountRow key={account.id} account={account} />
            ))}
          </div>
        ) : usesEmailSignIn(user) ? (
          <div className="flex items-center gap-3 rounded-[11px] border border-aria-border bg-aria-surface px-3.5 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-aria-elevated text-aria-text-secondary">
              <Mail className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-aria-text">Email</p>
              <p className="truncate text-xs text-aria-text-secondary">
                {email}
              </p>
            </div>
            <span className="rounded-full bg-aria-primary/15 px-2.5 py-1 text-[11px] font-semibold text-aria-primary-light">
              Connected
            </span>
          </div>
        ) : (
          <p className="text-sm text-aria-text-secondary">
            No connected sign-in methods found.
          </p>
        )}
      </div>
    </>
  );
}

function Field({
  label,
  value,
  disabled,
}: {
  label: string;
  value: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-aria-text-secondary">
        {label}
      </span>
      <input
        readOnly
        value={value}
        disabled={disabled}
        className="h-[42px] rounded-[11px] border border-aria-border bg-aria-surface px-3.5 text-sm text-aria-text outline-none transition-all focus:border-aria-primary focus:shadow-[0_0_0_3px_rgba(124,58,237,0.14)] disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}
