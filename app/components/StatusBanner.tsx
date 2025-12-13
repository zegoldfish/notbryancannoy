export default function StatusBanner({
	message,
	isError,
}: {
	message?: string;
	isError: boolean;
}) {
	if (!message) return null;

	return (
		<div
			className={`mb-4 rounded-lg p-4 text-sm ${
				isError ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
			}`}
			role="alert"
		>
			{message}
		</div>
	);
}
