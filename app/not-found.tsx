import Link from "next/link";

export default function NotFound(){return <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6"><div className="text-center"><p className="text-sm font-semibold text-gray-500">404</p><h1 className="mt-2 text-3xl font-bold">Page not found</h1><p className="mt-2 text-gray-500">The page you requested does not exist.</p><Link href="/" className="mt-6 inline-block rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">Back to Dashboard</Link></div></main>}
