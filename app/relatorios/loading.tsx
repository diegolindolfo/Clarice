export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto p-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-6 bg-gray-100 rounded w-28 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-52" />
        </div>
        <div className="h-9 bg-gray-100 rounded-lg w-32" />
      </div>
      <div className="flex gap-2 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-100 rounded-full w-24" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl p-6 h-20 bg-gray-100" />
        ))}
      </div>
      <div className="h-48 bg-gray-100 rounded-xl" />
    </div>
  )
}
