const authColors = {
  primary: "#1a4d3e",
  primaryHover: "#153d32",
  inputBg: "#e4eaf3",
  foreground: "#1a1a2e",
  muted: "#6b7280",
  border: "#d1d9e6",
};

const sharedElements = {
  rootBox: "w-full max-w-sm mx-auto",
  card: "shadow-none bg-transparent p-0 gap-5 w-full",
  cardBox: "shadow-none bg-transparent w-full",
  header: "hidden",
  headerTitle: "hidden",
  headerSubtitle: "hidden",
  socialButtons: "justify-center gap-3",
  socialButtonsIconButton:
    "flex! size-11! rounded-full! border! border-[#d1d9e6]! bg-white! shadow-none! transition-colors hover:bg-[#f8fafc]!",
  dividerRow: "my-1",
  dividerLine: "bg-[#d1d9e6]",
  dividerText: "text-[#9ca3af] text-xs uppercase tracking-wide",
  formFieldLabel: "hidden",
  formFieldInput:
    "rounded-full! h-12! px-5! border! border-[#d1d9e6]! bg-[#e4eaf3]! text-base! shadow-none! focus:ring-2! focus:ring-[#1a4d3e]/20!",
  formButtonPrimary:
    "rounded-full! h-12! text-base! font-semibold! bg-[#1a4d3e]! hover:bg-[#153d32]! shadow-none! transition-colors",
  footer: "hidden",
  footerAction: "hidden",
  footerActionLink: "hidden",
  identityPreview: "rounded-2xl",
  formFieldInputShowPasswordButton: "text-[#6b7280]",
  alert: "rounded-2xl",
  formFieldAction: "text-[#1a4d3e] hover:text-[#153d32]",
  otpCodeFieldInput: "rounded-xl! border-[#d1d9e6]! bg-[#e4eaf3]!",
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
  borderRadius: "0.75rem",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
  fontSize: "0.95rem",
  spacingUnit: "1rem",
};

const sharedOptions = {
  socialButtonsVariant: "iconButton" as const,
  socialButtonsPlacement: "top" as const,
};

export const signInAppearance = {
  variables: sharedVariables,
  options: sharedOptions,
  elements: {
    ...sharedElements,
    formFieldAction: "text-[#6b7280] text-sm hover:text-[#1a4d3e]",
  },
};

export const signUpAppearance = {
  variables: sharedVariables,
  options: sharedOptions,
  elements: sharedElements,
};
