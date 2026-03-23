import { AlertTriangle } from 'lucide-react';

export default function RootNotFound() {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Page Not Found</h2>
            <p className="text-sm text-gray-400">The page you are looking for does not exist.</p>
          </div>
        </div>
      </body>
    </html>
  );
}
