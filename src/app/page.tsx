export default function Home() {
  return (
    <div className="min-h-screen bg-green-500 text-white p-8">
      <h1 className="text-4xl font-bold text-yellow-300 mb-4">
        Test Tailwind
      </h1>
      <p className="text-lg text-blue-200">
        Kalau ini hijau dengan teks kuning dan biru, Tailwind berhasil!
      </p>
      <button className="mt-4 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700">
        Tombol Ungu
      </button>
    </div>
  )
}
