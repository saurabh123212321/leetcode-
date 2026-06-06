import { createFileRoute } from "@tanstack/react-router";
import { DsaVisualizer } from "@/components/dsa-visualizer";

export const Route = createFileRoute("/_authenticated/visualize")({
  component: VisualizePage,
  head: () => ({ meta: [{ title: "DSA Visualizer — CodeLearn AI" }] }),
});

function VisualizePage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">DSA Visualizer</h1>
        <p className="text-sm text-slate-400">See sorting algorithms run step by step. Pick an algorithm, hit Play, and watch comparisons (pink) and sorted positions (green).</p>
      </div>
      <DsaVisualizer />
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-sm text-slate-300 space-y-1">
        <div className="font-semibold text-slate-100">Legend</div>
        <div>🟦 Unsorted · 🟪 Being compared / swapped · 🟩 In final position</div>
        <div className="text-xs text-slate-500">Tip: Use this alongside the workspace to step through what your code is doing.</div>
      </div>
    </div>
  );
}
