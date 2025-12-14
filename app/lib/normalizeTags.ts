export function normalizeTags(raw: string): string[] {
	return Array.from(
		new Set(
			raw
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean)
		)
	);
}
