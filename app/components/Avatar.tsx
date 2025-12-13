"use client";

import * as RadixAvatar from "@radix-ui/react-avatar";

type AvatarProps = {
	src?: string | null;
	alt?: string;
	fallback: string;
	size?: "sm" | "md" | "lg";
};

const sizeClasses = {
	sm: "h-8 w-8 text-xs",
	md: "h-10 w-10 text-sm",
	lg: "h-12 w-12 text-base",
};

export function Avatar({ src, alt = "Avatar", fallback, size = "md" }: AvatarProps) {
	return (
		<RadixAvatar.Root className={`inline-flex items-center justify-center rounded-full bg-slate-200 overflow-hidden ${sizeClasses[size]}`}>
			{src?.trim() && (
				<RadixAvatar.Image
					src={src}
					alt={alt}
					referrerPolicy="no-referrer"
					className="h-full w-full object-cover"
				/>
			)}
			<RadixAvatar.Fallback className="flex items-center justify-center h-full w-full bg-slate-300 text-slate-700 font-semibold">
				{fallback}
			</RadixAvatar.Fallback>
		</RadixAvatar.Root>
	);
}
