# Configuration de l'API check-email en production

## 🚀 Configuration sur Vercel

### Étape 1 : Accéder aux variables d'environnement

1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous à votre compte
3. Sélectionnez votre projet (cartes_voeux_basic ou le nom de votre projet)
4. Allez dans **Settings** (Paramètres)
5. Cliquez sur **Environment Variables** (Variables d'environnement) dans le menu de gauche

### Étape 2 : Ajouter la variable SUPABASE_SERVICE_ROLE_KEY

1. Dans la section "Environment Variables", vous verrez un formulaire
2. Remplissez les champs :
   - **Name** : `SUPABASE_SERVICE_ROLE_KEY`
   - **Value** : Votre Service Role Key (commence par `eyJ...`)
   - **Environment** : Cochez au minimum **Production**
     - ✅ Production (obligatoire)
     - ✅ Preview (recommandé, pour tester avant la prod)
     - ✅ Development (optionnel, si vous voulez tester en dev Vercel)

3. Cliquez sur **Save** (Enregistrer)

### Étape 3 : Trouver votre Service Role Key

1. Allez sur [supabase.com](https://supabase.com)
2. Connectez-vous et sélectionnez votre projet
3. Allez dans **Settings** → **API**
4. Dans la section **Project API keys**, trouvez **service_role** (secret)
5. ⚠️ **ATTENTION** : C'est la clé **service_role**, pas **anon** ou **public**
6. Cliquez sur l'icône de copie pour copier la clé complète

### Étape 4 : Vérifier les autres variables

Assurez-vous d'avoir aussi ces variables configurées :

- ✅ `NEXT_PUBLIC_SUPABASE_URL` → Votre Project URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Votre anon/public key
- ✅ `SUPABASE_SERVICE_ROLE_KEY` → Votre service_role key (secret)

### Étape 5 : Redéployer l'application

⚠️ **IMPORTANT** : Après avoir ajouté/modifié des variables d'environnement, vous devez redéployer !

**Option A : Redéploiement automatique**
- Si vous avez activé le déploiement automatique depuis Git, faites un commit et push :
  ```bash
  git add .
  git commit -m "Add SUPABASE_SERVICE_ROLE_KEY configuration"
  git push
  ```
- Vercel redéploiera automatiquement

**Option B : Redéploiement manuel**
1. Dans Vercel, allez dans l'onglet **Deployments**
2. Trouvez le dernier déploiement
3. Cliquez sur les trois points (⋯) à droite
4. Sélectionnez **Redeploy**
5. Confirmez le redéploiement

### Étape 6 : Vérifier que ça fonctionne

1. Une fois le déploiement terminé, allez sur votre site en production
2. Allez sur `https://votre-domaine.com/test-api`
3. Testez l'API avec un email
4. Vous devriez voir "✅ API fonctionne correctement !"

## 🔒 Sécurité

⚠️ **IMPORTANT** : La Service Role Key est une clé **SECRÈTE** et **POWERFUL**

- ❌ **NE JAMAIS** la partager publiquement
- ❌ **NE JAMAIS** la commiter dans Git
- ❌ **NE JAMAIS** l'exposer côté client
- ✅ **TOUJOURS** la garder dans les variables d'environnement serveur uniquement
- ✅ Elle contourne toutes les politiques RLS, utilisez-la avec précaution

## 📋 Checklist de configuration

- [ ] Variable `SUPABASE_SERVICE_ROLE_KEY` ajoutée dans Vercel
- [ ] Variable configurée pour l'environnement **Production** (au minimum)
- [ ] Variable configurée pour l'environnement **Preview** (recommandé)
- [ ] Application redéployée après l'ajout de la variable
- [ ] Test de l'API en production réussi (`/test-api`)
- [ ] Test de création de compte avec email existant fonctionne

## 🐛 Dépannage

### L'API ne fonctionne pas en production

1. **Vérifiez que la variable est bien configurée** :
   - Allez dans Vercel → Settings → Environment Variables
   - Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` existe
   - Vérifiez qu'elle est activée pour "Production"

2. **Vérifiez que vous avez redéployé** :
   - Les variables d'environnement ne sont chargées qu'au build
   - Un simple redéploiement est nécessaire

3. **Vérifiez les logs** :
   - Dans Vercel → Deployments → votre déploiement
   - Cliquez sur "View Function Logs"
   - Cherchez les erreurs liées à "Configuration Supabase manquante"

4. **Testez l'API directement** :
   - Allez sur `https://votre-domaine.com/test-api`
   - Si vous voyez "Configuration serveur manquante", la variable n'est pas chargée

### La variable n'est pas chargée

- Vérifiez l'orthographe exacte : `SUPABASE_SERVICE_ROLE_KEY` (tout en majuscules)
- Vérifiez qu'il n'y a pas d'espaces avant/après le nom
- Vérifiez que la valeur est correcte (commence par `eyJ`)
- Redéployez l'application

## 📝 Notes

- Les variables d'environnement sont chargées au moment du build
- Si vous modifiez une variable, vous devez redéployer
- Les variables avec `NEXT_PUBLIC_` sont accessibles côté client
- Les variables sans `NEXT_PUBLIC_` sont uniquement côté serveur (comme `SUPABASE_SERVICE_ROLE_KEY`)


