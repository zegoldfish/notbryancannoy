"use client";

import { signOut } from "next-auth/react";

type SignOutButtonProps = {
	size?: "sm" | "md";
	label?: string;
};

export function SignOutButton({ size = "md", label = "Sign out" }: SignOutButtonProps) {
	const sizeClasses = size === "sm" 
		? "px-2 py-2 text-xs" 
		: "px-3 py-2 text-sm";

	return (
		<button
			onClick={() => signOut()}
			className={`inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white ${sizeClasses} font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50`}
		>
			{label}
		</button>
	);
}
