export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto p-6 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2">
          <div className="h-6 bg-gray-100 rounded w-20 mb-4" />
          <div className="h-9 bg-gray-100 rounded-[10px] mb-3" />
          <div className="border rounded-2xl overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-none">
                <div className="w-9 h-9 rounded-full bg-gray-100" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-100 rounded w-32 mb-1" />
                  <div className="h-3 bg-gray-100 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-3">
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
