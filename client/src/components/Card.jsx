export default function Card({ title, action, children }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <h2 className="text-sm font-medium text-neutral-800">
            {title}
          </h2>
          {action}
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
