export default function AppLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-900">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-neutral-500">
              {subtitle}
            </p>
          )}
        </header>

        {children}
      </div>
    </div>
  );
}
