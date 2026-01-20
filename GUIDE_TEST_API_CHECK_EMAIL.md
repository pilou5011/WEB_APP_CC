# Guide : Tester l'API check-email

## Étape 1 : Vérifier le fichier .env.local

1. Ouvrez le fichier `.env.local` à la racine du projet
2. Vérifiez que vous avez bien cette ligne (sans espaces avant/après le `=`) :
   ```env
   SUPABASE_SERVICE_ROLE_KEY=votre_clé_ici
   ```
3. ⚠️ **IMPORTANT** : 
   - Pas d'espaces autour du `=`
   - Pas de guillemets autour de la valeur
   - Pas de point-virgule à la fin
   - La clé doit commencer par `eyJ...` (c'est un JWT)

4. Vérifiez aussi que vous avez ces variables :
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
   SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
   ```

## Étape 2 : Vérifier où trouver la Service Role Key

1. Allez sur [supabase.com](https://supabase.com)
2. Connectez-vous et sélectionnez votre projet
3. Allez dans **Settings** → **API**
4. Dans la section **Project API keys**, trouvez **service_role** (secret)
5. ⚠️ **ATTENTION** : C'est la clé **service_role**, pas **anon** ou **public**
6. Copiez la clé complète (elle commence par `eyJ...`)

## Étape 3 : Redémarrer le serveur Next.js

⚠️ **CRITIQUE** : Next.js ne charge les variables d'environnement qu'au démarrage !

1. Arrêtez le serveur (Ctrl+C dans le terminal)
2. Redémarrez-le :
   ```bash
   npm run dev
   ```

## Étape 4 : Tester l'API directement

Ouvrez votre navigateur et allez sur :
```
http://localhost:3000/api/check-email
```

Vous devriez voir une erreur (c'est normal, l'API attend une requête POST).

## Étape 5 : Tester avec une requête POST

Ouvrez la console du navigateur (F12) et exécutez :

```javascript
fetch('/api/check-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email: 'chevallierpierrelouis@gmail.com' })
})
  .then(res => res.json())
  .then(data => console.log('Réponse:', data))
  .catch(err => console.error('Erreur:', err));
```

**Résultats attendus :**
- ✅ Si ça fonctionne : `{ exists: false, email: "test@example.com" }`
- ❌ Si ça ne fonctionne pas : `{ error: "Configuration serveur manquante", details: "..." }`

## Étape 6 : Vérifier les logs du serveur

Regardez le terminal où tourne `npm run dev`. Si vous voyez :
```
Configuration Supabase manquante: { hasUrl: true, hasServiceKey: false }
```
→ La variable `SUPABASE_SERVICE_ROLE_KEY` n'est pas chargée

## Étape 7 : Vérifier le format du fichier .env.local

Le fichier doit être exactement comme ça (exemple) :

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI4MCwiZXhwIjoxOTU0NTQzMjgwfQ.abcdefghijklmnopqrstuvwxyz1234567890
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM4OTY3MjgwLCJleHAiOjE5NTQ1NDMyODB9.abcdefghijklmnopqrstuvwxyz1234567890
```

⚠️ **Points importants :**
- Pas de ligne vide au début
- Pas de commentaires avec `#` sur la même ligne que la variable
- Chaque variable sur sa propre ligne
- Pas de virgule ou point-virgule à la fin

## Étape 8 : Créer un script de test

Créez un fichier `test-api.js` à la racine et exécutez-le :

```javascript
// test-api.js
const testEmail = 'test@example.com';

fetch('http://localhost:3000/api/check-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email: testEmail })
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ API fonctionne !');
    console.log('Réponse:', data);
  })
  .catch(err => {
    console.error('❌ Erreur:', err);
  });
```

Exécutez : `node test-api.js` (après avoir installé node-fetch si nécessaire)

## Problèmes courants

### Problème 1 : "Configuration serveur manquante"
**Solution :** 
- Vérifiez que `.env.local` existe à la racine (même niveau que `package.json`)
- Vérifiez le nom exact : `SUPABASE_SERVICE_ROLE_KEY` (pas `SUPABASE_SERVICE_KEY` ou autre)
- Redémarrez le serveur

### Problème 2 : "Erreur lors de la vérification"
**Solution :**
- Vérifiez que la clé service_role est correcte (copiez depuis Supabase Dashboard)
- Vérifiez que `NEXT_PUBLIC_SUPABASE_URL` est correcte

### Problème 3 : L'API ne répond pas
**Solution :**
- Vérifiez que le serveur Next.js tourne (`npm run dev`)
- Vérifiez que vous êtes sur `http://localhost:3000`
- Vérifiez la console du navigateur pour les erreurs CORS

## Vérification finale

Si tout fonctionne, vous devriez pouvoir :
1. Créer un compte avec un email qui n'existe pas → ✅ Succès
2. Créer un compte avec un email qui existe déjà → ❌ Message d'erreur approprié

