// app/community/loading.tsx
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-transparent rounded-full" />
    </div>
  );
}
