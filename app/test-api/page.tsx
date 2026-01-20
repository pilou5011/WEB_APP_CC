'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestAPIPage() {
  const [email, setEmail] = useState('test@example.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testAPI = async () => {
    if (!email) {
      setResult({ error: 'Veuillez entrer un email' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email }),
      });

      const data = await response.json();
      setResult({ status: response.status, data });
    } catch (error: any) {
      setResult({ error: error.message || 'Erreur réseau' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>🧪 Test API check-email</CardTitle>
          <CardDescription>
            Cet outil permet de tester si l'API <code>/api/check-email</code> fonctionne correctement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email à tester :
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  testAPI();
                }
              }}
            />
          </div>

          <Button onClick={testAPI} disabled={loading} className="w-full">
            {loading ? 'Test en cours...' : 'Tester l\'API'}
          </Button>

          {result && (
            <div className="mt-4">
              {result.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-2">❌ Erreur</h3>
                  <pre className="text-sm text-red-700 whitespace-pre-wrap">
                    {result.error}
                  </pre>
                  {result.error.includes('Failed to fetch') && (
                    <p className="mt-2 text-sm text-red-600">
                      💡 Vérifiez que le serveur Next.js tourne (npm run dev)
                    </p>
                  )}
                </div>
              ) : result.data?.error ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">
                    ⚠️ Erreur API ({result.status})
                  </h3>
                  <pre className="text-sm text-yellow-700 whitespace-pre-wrap">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                  {result.data.details && (
                    <p className="mt-2 text-sm text-yellow-600">{result.data.details}</p>
                  )}
                  {result.data.debug && (
                    <div className="mt-2 text-sm">
                      <p className="font-semibold">Info de débogage :</p>
                      <pre className="text-xs bg-yellow-100 p-2 rounded mt-1">
                        {JSON.stringify(result.data.debug, null, 2)}
                      </pre>
                    </div>
                  )}
                  {result.data.error === 'Configuration serveur manquante' && (
                    <div className="mt-3 p-3 bg-yellow-100 rounded">
                      <p className="text-sm font-semibold mb-1">💡 Solution :</p>
                      <ol className="text-sm list-decimal list-inside space-y-1">
                        <li>Vérifiez que <code>SUPABASE_SERVICE_ROLE_KEY</code> est dans <code>.env.local</code></li>
                        <li>Redémarrez le serveur Next.js (Ctrl+C puis <code>npm run dev</code>)</li>
                        <li>Vérifiez que la clé commence par <code>eyJ</code></li>
                      </ol>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">
                    ✅ API fonctionne correctement !
                  </h3>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>
                      <strong>Email :</strong> {result.data.email}
                    </p>
                    <p>
                      <strong>Existe :</strong> {result.data.exists ? 'Oui' : 'Non'}
                    </p>
                    <p className="mt-2">
                      {result.data.exists
                        ? '→ Cet email existe déjà dans la base de données.'
                        : '→ Cet email n\'existe pas encore dans la base de données.'}
                    </p>
                  </div>
                  <details className="mt-3">
                    <summary className="text-sm cursor-pointer text-green-600">
                      Voir la réponse complète
                    </summary>
                    <pre className="text-xs bg-green-100 p-2 rounded mt-2 overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

