export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-6 bg-gray-100 rounded w-32 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-44" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 bg-gray-100 rounded-lg w-36" />
          <div className="h-9 bg-gray-100 rounded-lg w-36" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl p-4 h-20 bg-gray-100" />
        ))}
      </div>
      <div className="border rounded-xl h-80 bg-gray-50" />
    </div>
  )
}
