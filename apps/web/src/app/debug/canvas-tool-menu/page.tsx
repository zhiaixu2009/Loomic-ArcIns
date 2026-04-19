export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function DebugCanvasToolMenuPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-8 text-slate-700">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          Canvas Tool Menu Debug
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This route is reserved for local tool-menu debugging and intentionally
          kept out of production indexing.
        </p>
      </div>
    </main>
  );
}
