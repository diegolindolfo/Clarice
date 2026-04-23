export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto p-6 animate-pulse">
      <div className="flex items-center justify-between mb-7">
        <div>
          <div className="h-5 bg-gray-100 rounded w-28 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
        <div className="h-8 bg-gray-100 rounded-lg w-32" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl p-4 h-20 bg-gray-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        <div className="lg:col-span-3 rounded-2xl h-48 bg-gray-100" />
        <div className="lg:col-span-2 rounded-2xl h-48 bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl h-40 bg-gray-100" />
        ))}
      </div>
    </div>
  )
}
