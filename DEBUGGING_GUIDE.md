# Guide de Débogage dans Cursor

## 🎯 Méthodes de Débogage pour Next.js/React/TypeScript

### 1. **Console.log avec contexte** ⚡ (Le plus rapide)

```typescript
// ✅ Bonne pratique - Ajouter du contexte
console.log('[StockReport] loadUserProfile:', { 
  clientId: client.id, 
  open,
  timestamp: new Date().toISOString() 
});

// ✅ Pour les tableaux
console.table(stockUpdates);

// ✅ Avec des couleurs (dans la console du navigateur)
console.log('%c[StockReport]', 'color: blue; font-weight: bold', data);

// ✅ Grouper les logs
console.group('[StockReport] Load Data');
console.log('User Profile:', userProfile);
console.log('Sub Products:', subProducts);
console.groupEnd();
```

### 2. **Points d'arrêt (Breakpoints)** 🛑 (Le plus puissant)

#### Dans Cursor/VS Code :
1. **Clic dans la marge gauche** (à gauche du numéro de ligne) pour ajouter un point d'arrêt
2. **F9** pour activer/désactiver un point d'arrêt sur la ligne courante
3. **F5** pour démarrer le débogage
4. **F10** (Step Over), **F11** (Step Into), **Shift+F11** (Step Out)

#### Points d'arrêt conditionnels :
- Clic droit sur un point d'arrêt → "Edit Breakpoint" → ajouter une condition
- Exemple : `client.id === "specific-id"`

#### Points d'arrêt logpoints (sans pause) :
- Clic droit → "Add Logpoint" → taper `{variable}` pour logger sans pause

### 3. **Débogueur intégré** 🐛

#### Configuration (.vscode/launch.json) :
- **Next.js: debug server-side** : Débogue le code serveur (API routes, Server Components)
- **Next.js: debug client-side** : Débogue le code client (Components React)
- **Next.js: debug full stack** : Débogue les deux simultanément

#### Utilisation :
1. Ouvrir le panneau Run and Debug (`Ctrl+Shift+D`)
2. Sélectionner la configuration
3. Cliquer sur "Start Debugging" (F5)
4. Ouvrir `http://localhost:3000` dans le navigateur

### 4. **React DevTools** 🔧 (Pour React)

1. Installer l'extension Chrome/Firefox "React Developer Tools"
2. Ouvrir les DevTools du navigateur (F12)
3. Onglet "Components" pour inspecter :
   - Props, State, Hooks
   - Re-renders (Profiler)
   - Arbre des composants

### 5. **Network Tab** 🌐 (Pour les requêtes)

Dans les DevTools du navigateur :
- **Network** : Voir toutes les requêtes HTTP/WebSocket
- Filtrer par type (Fetch/XHR, WS, etc.)
- Inspecter les requêtes/réponses Supabase

### 6. **Debugger Statement** 💻

Insérer directement dans le code :

```typescript
const loadUserProfile = async () => {
  debugger; // Le navigateur s'arrêtera ici si les DevTools sont ouverts
  try {
    const { data, error } = await supabase
      .from('user_profile')
      .select('*')
      // ...
  }
};
```

⚠️ **Important** : Retirer les `debugger` avant de commiter !

### 7. **Erreurs TypeScript** 📝

Dans Cursor :
- Les erreurs TypeScript apparaissent directement dans l'éditeur (rouge souligné)
- Hover sur l'erreur pour voir les détails
- Ouvrir les "Problems" (`Ctrl+Shift+M`) pour voir toutes les erreurs

### 8. **Console du Terminal** 💻

Pour le code serveur (API routes, Server Components) :
```typescript
// Les console.log apparaîtront dans le terminal où tourne `npm run dev`
console.log('[API] Request received:', req.body);
```

### 9. **Variables et Watch** 👁️

Pendant le débogage :
- **Variables** : Voir toutes les variables dans le scope actuel
- **Watch** : Ajouter des expressions à surveiller (ex: `stockUpdates.length`)
- **Call Stack** : Voir la pile d'appels des fonctions

### 10. **Tips spécifiques Next.js** ⚡

#### Debugger les Server Components :
- Utiliser `console.log` dans les Server Components (apparaît dans le terminal)
- Utiliser les points d'arrêt avec la config "debug server-side"

#### Debugger les Client Components :
- Utiliser React DevTools
- Points d'arrêt dans le navigateur
- Console.log dans la console du navigateur

#### Debugger les API Routes :
```typescript
// app/api/send-invoice/route.ts
export async function POST(req: Request) {
  console.log('[API] POST /send-invoice'); // Terminal
  const body = await req.json();
  console.log('[API] Body:', body); // Terminal
  debugger; // Avec "debug server-side" config
  // ...
}
```

### 11. **Outils utiles** 🛠️

- **Supabase Studio** : Pour voir directement les données en base
- **Postman/Thunder Client** : Tester les API routes
- **React Query DevTools** : Si vous utilisez React Query

### 12. **Bonnes pratiques** ✅

1. **Retirer les console.log** avant de commiter (ou utiliser un outil qui les retire automatiquement)
2. **Utiliser des identifiants uniques** dans vos logs : `[ComponentName] [Action]`
3. **Logger les erreurs** avec `console.error` plutôt que `console.log`
4. **Grouper les logs** avec `console.group()` pour plus de clarté
5. **Utiliser TypeScript** pour éviter les erreurs avant même l'exécution

### 13. **Workflow recommandé** 🔄

1. **Découvrir le problème** : Voir l'erreur dans la console/UI
2. **Identifier la source** : Stack trace ou console.log stratégiques
3. **Poser un point d'arrêt** : Sur la ligne suspecte
4. **Inspecter les variables** : Dans le débogueur ou avec console.log
5. **Tester la solution** : Modifier et re-tester
6. **Nettoyer** : Retirer les console.log/debugger temporaires

## 🎓 Exemples pratiques pour votre projet

### Déboguer `stock-report-dialog.tsx` :

```typescript
// Ajouter dans loadUserProfile :
const loadUserProfile = async () => {
  console.log('[StockReport] loadUserProfile started', { 
    clientId: client.id,
    timestamp: new Date().toISOString()
  });
  
  try {
    const { data, error } = await supabase
      .from('user_profile')
      .select('*')
      .limit(1)
      .maybeSingle();

    console.log('[StockReport] Profile query result:', { 
      data, 
      error,
      hasData: !!data 
    });

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    setUserProfile(data);
    console.log('[StockReport] Profile set successfully');
  } catch (error) {
    console.error('[StockReport] Profile load error:', error);
    toast.error('Erreur lors du chargement du profil');
  } finally {
    setLoadingProfile(false);
    console.log('[StockReport] loadUserProfile finished');
  }
};
```

### Déboguer un useEffect :

```typescript
useEffect(() => {
  console.log('[StockReport] useEffect triggered', {
    open,
    loadingProfile,
    loadingSubProducts,
    loadingPreviousInvoice,
    pdfGenerated
  });
  
  if (open && !loadingProfile && !loadingSubProducts && !loadingPreviousInvoice && !pdfGenerated) {
    console.log('[StockReport] Conditions met, generating PDF...');
    setPdfGenerated(true);
    generatePDFPreview();
  }
}, [open, loadingProfile, loadingSubProducts, loadingPreviousInvoice, pdfGenerated]);
```

