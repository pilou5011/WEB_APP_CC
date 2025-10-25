# 📧 Configuration Resend pour l'envoi d'emails

## ⚠️ IMPORTANT : Configuration requise

Pour que l'envoi d'emails fonctionne, vous devez créer un fichier `.env.local` à la racine du projet.

### Étape 1 : Créer le fichier `.env.local`

Créez un fichier nommé `.env.local` à la racine du projet (même niveau que `package.json`) avec le contenu suivant :

```env
# Resend API Key pour l'envoi d'emails
RESEND_API_KEY=votre_cle_api_ici
```

### Étape 2 : Remplacer la clé API

1. Connectez-vous sur [resend.com](https://resend.com)
2. Allez dans la section **"API Keys"**
3. Copiez votre clé API (elle commence par `re_`)
4. Remplacez `votre_cle_api_ici` dans le fichier `.env.local`

Exemple :
```env
RESEND_API_KEY=re_123abc456def789ghi012jkl345mno678
```

### Étape 3 : Redémarrer le serveur de développement

Après avoir configuré la clé API, redémarrez votre serveur :

```bash
# Arrêter le serveur (Ctrl+C)
# Puis relancer
npm run dev
```

## 🎯 Mode Test (Option A)

Vous utilisez actuellement le mode **test** de Resend :
- ✅ Aucune configuration de domaine requise
- ⚠️ Les emails ne peuvent être envoyés qu'à **votre propre adresse email** (celle du compte Resend)
- 📧 L'expéditeur sera : `onboarding@resend.dev`

### Test de la fonctionnalité

1. Renseignez votre email (celui du compte Resend) dans les informations d'un client
2. Générez une facture pour ce client
3. Cliquez sur "Envoyer par email"
4. Vérifiez votre boîte mail

## 🚀 Passer en Production

Pour envoyer des emails à vos clients :

1. Allez dans **"Domains"** sur Resend
2. Ajoutez votre domaine
3. Configurez les DNS (SPF, DKIM, DMARC)
4. Modifiez le fichier `app/api/send-invoice/route.ts` ligne 18 :

```typescript
// Remplacer
from: 'Cartes de Vœux <onboarding@resend.dev>',

// Par
from: 'Votre Nom <contact@votredomaine.com>',
```

## 🔒 Sécurité

- ⚠️ **NE JAMAIS** commiter le fichier `.env.local` sur Git
- ⚠️ **NE JAMAIS** partager votre clé API publiquement
- ✅ Le fichier `.env.local` est déjà dans le `.gitignore`

## 📊 Limites du plan gratuit

- 100 emails par jour
- 3 000 emails par mois

## ❓ Besoin d'aide ?

En cas de problème :
1. Vérifiez que la clé API est correctement copiée
2. Vérifiez que le serveur a été redémarré
3. Consultez les logs dans la console du navigateur (F12)
4. Consultez les logs Resend sur [resend.com/logs](https://resend.com/logs)

