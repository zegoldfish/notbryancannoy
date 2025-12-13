export default function SubmitButton({
	loading,
	loadingText,
	children,
	disabled = false,
	fullWidth = true,
}: {
	loading: boolean;
	loadingText: string;
	children: React.ReactNode;
	disabled?: boolean;
	fullWidth?: boolean;
}) {
	return (
		<button
			type="submit"
			disabled={loading || disabled}
			className={`inline-flex ${
				fullWidth ? "w-full" : ""
			} items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50`}
		>
			{loading ? loadingText : children}
		</button>
	);
}
