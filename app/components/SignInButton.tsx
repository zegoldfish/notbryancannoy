import Link from "next/link";

type SignInButtonProps = {
  href?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
};

const sizeClasses: Record<NonNullable<SignInButtonProps["size"]>, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-2 text-sm",
};

export function SignInButton({
  href = "/signin",
  label = "Sign in",
  size = "md",
  fullWidth = false,
  className,
}: SignInButtonProps) {
  const classes = [
    "inline-flex items-center justify-center rounded-lg bg-blue-600 font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
    sizeClasses[size],
    fullWidth ? "w-full" : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      href={href}
      className={classes}
    >
      {label}
    </Link>
  );
}
