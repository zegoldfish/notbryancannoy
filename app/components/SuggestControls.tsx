import { useId } from "react";

export default function SuggestControls({
	onSuggest,
	suggesting,
	temperature,
	setTemperature,
	disabled = false,
	idPrefix,
	context,
	setContext,
}: {
	onSuggest: () => void;
	suggesting: boolean;
	temperature: number;
	setTemperature: (value: number) => void;
	disabled?: boolean;
	idPrefix?: string;
	context?: string;
	setContext?: (value: string) => void;
}) {
	const generatedId = useId();
	const temperatureId = idPrefix ? `${idPrefix}-temperature` : `${generatedId}-temperature`;
	const contextId = idPrefix ? `${idPrefix}-context` : `${generatedId}-context`;
	return (
		<div className="space-y-3">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div className="text-sm text-slate-700">Need tags? Let Claude suggest them.</div>
				<button
					type="button"
					onClick={onSuggest}
					disabled={suggesting || disabled}
					className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{suggesting ? "Getting suggestions..." : "Suggest tags & description"}
				</button>
			</div>
			<div className="flex items-center gap-3">
				<label htmlFor={temperatureId} className="text-sm font-medium text-slate-700">
					Temperature: {temperature.toFixed(2)}
				</label>
				<input
					id={temperatureId}
					type="range"
					min="0"
					max="1"
					step="0.01"
					value={temperature}
					onChange={(e) => setTemperature(parseFloat(e.target.value))}
					className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
				/>
			</div>
			<p className="text-xs text-slate-500">Lower = more deterministic; higher = more creative.</p>
			{setContext && (
				<div className="space-y-2">
					<label htmlFor={contextId} className="text-sm font-medium text-slate-700">
						Context (optional)
					</label>
					<input
						id={contextId}
						type="text"
						value={context || ""}
						onChange={(e) => setContext(e.target.value)}
						className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
						placeholder="e.g. product photo, landscape, portrait"
					/>
				</div>
			)}
		</div>
	);
}
