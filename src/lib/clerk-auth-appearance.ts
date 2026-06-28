/** Clerk theme aligned with Monzi aria design tokens (dark space UI). */
const authColors = {
  primary: "#7c3aed",
  primaryHover: "#6d28d9",
  inputBg: "#1a1a24",
  foreground: "#f1f5f9",
  muted: "#94a3b8",
  border: "#2a2a3e",
  danger: "#ef4444",
};

const sharedElements = {
  rootBox: "w-full mx-auto",
  card: "shadow-none bg-transparent p-0 gap-3! w-full",
  cardBox: "shadow-none bg-transparent w-full",
  main: "gap-3!",
  form: "gap-3!",
  header: "hidden",
  headerTitle: "hidden",
  headerSubtitle: "hidden",
  socialButtons: "hidden!",
  socialButtonsRoot: "hidden!",
  socialButtonsBlockButton: "hidden!",
  socialButtonsIconButton: "hidden!",
  dividerRow: "hidden!",
  dividerLine: "bg-[#2a2a3e]",
  dividerText: "text-[#64748b] text-xs tracking-wide",
  formFieldLabel:
    "text-[#94a3b8]! text-xs! font-medium! mb-1.5! block!",
  formFieldInput:
    "rounded-xl! h-11! px-4! border! border-[#2a2a3e]! bg-[#1a1a24]! text-[#f1f5f9]! text-sm! shadow-none! placeholder:text-[#64748b]! focus:ring-2! focus:ring-[#7c3aed]/30! focus:border-[#7c3aed]/50!",
  formButtonPrimary:
    "rounded-full! h-11! text-sm! font-semibold! bg-[#7c3aed]! hover:bg-[#6d28d9]! shadow-none! transition-colors",
  footer: "hidden",
  footerAction: "hidden",
  footerActionLink: "hidden",
  identityPreview: "rounded-xl border border-[#2a2a3e] bg-[#1a1a24]",
  formFieldInputShowPasswordButton: "text-[#94a3b8] hover:text-[#f1f5f9]",
  alert: "rounded-xl border border-[#2a2a3e] bg-[#1a1a24]",
  formFieldAction: "text-[#a78bfa] hover:text-[#c4b5fd]",
  otpCodeFieldInput:
    "rounded-xl! border-[#2a2a3e]! bg-[#1a1a24]! text-[#f1f5f9]!",
  formResendCodeLink: "text-[#a78bfa] hover:text-[#c4b5fd]",
  alternativeMethodsBlockButton:
    "text-[#a78bfa] hover:text-[#c4b5fd]",
  backLink: "text-[#94a3b8] hover:text-[#f1f5f9]",
};

const sharedVariables = {
  colorPrimary: authColors.primary,
  colorBackground: "transparent",
  colorInputBackground: authColors.inputBg,
  colorInput: authColors.inputBg,
  colorInputForeground: authColors.foreground,
  colorForeground: authColors.foreground,
  colorMutedForeground: authColors.muted,
  colorBorder: authColors.border,
  colorPrimaryForeground: "#ffffff",
  colorDanger: authColors.danger,
  borderRadius: "0.75rem",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
  fontSize: "0.875rem",
  spacingUnit: "1rem",
};

const sharedOptions = {
  socialButtonsVariant: "iconButton" as const,
  socialButtonsPlacement: "bottom" as const,
};

export const signInAppearance = {
  variables: sharedVariables,
  options: sharedOptions,
  elements: {
    ...sharedElements,
    formFieldAction:
      "text-[#94a3b8] text-sm hover:text-[#a78bfa] text-center w-full block mt-1",
  },
};

export const signUpAppearance = {
  variables: sharedVariables,
  options: sharedOptions,
  elements: sharedElements,
};
