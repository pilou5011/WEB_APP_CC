# 📝 Guide : Créer un compte Stripe

## ✅ Oui, vous devez créer un compte Stripe

C'est **gratuit** et prend environ **5 minutes**. Voici comment procéder.

---

## 🚀 Étape 1 : Créer le compte Stripe

### 1.1 Aller sur le site Stripe

Rendez-vous sur : **https://stripe.com/fr**

### 1.2 Cliquer sur "Commencer"

Cliquez sur le bouton **"Commencer"** ou **"Créer un compte"** en haut à droite.

### 1.3 Remplir le formulaire d'inscription

Vous devrez fournir :
- **Email** : Votre adresse email professionnelle
- **Mot de passe** : Un mot de passe sécurisé
- **Nom complet** : Votre nom et prénom
- **Type de compte** : Sélectionnez **"Entreprise"** ou **"Individu"** selon votre cas

### 1.4 Vérifier votre email

Stripe vous enverra un email de vérification. Cliquez sur le lien dans l'email pour confirmer votre compte.

---

## 🏢 Étape 2 : Compléter les informations de votre entreprise

### 2.1 Informations de base

Stripe vous demandera :
- **Nom de l'entreprise** (ou votre nom si individuel)
- **Pays** : France (ou votre pays)
- **Type d'activité** : Sélectionnez le plus approprié (ex: "Logiciel/SaaS")

### 2.2 Informations légales

- **Numéro de TVA** (si applicable)
- **Adresse complète** de l'entreprise
- **Téléphone**

### 2.3 Sélection du mode de paiement

Stripe vous demandera de choisir un mode de paiement parmi :
- **Liens de paiement à partager**
- **Formulaire de paiement préconfiguré**
- **Composants intégrés**

#### ⚠️ Important : Cette étape n'est pas critique pour notre intégration !

**Pourquoi ?** Notre intégration utilise l'**API Stripe directement** via le backend, pas ces options de configuration initiale.

**Que choisir ?** 
- Vous pouvez choisir **"Composants intégrés"** ou **"Formulaire de paiement préconfiguré"** (c'est le plus proche de notre utilisation avec Stripe Checkout)
- Ou **n'importe quelle option** - cela n'affectera pas notre intégration
- Si possible, **passez cette étape** pour l'instant

**Note** : Cette configuration est principalement pour les utilisateurs qui veulent utiliser les outils Stripe prêts à l'emploi. Nous, nous utilisons l'API pour avoir un contrôle total.

### 2.4 Informations bancaires (pour recevoir les paiements)

⚠️ **Pas besoin de remplir maintenant en mode test !**

Vous pourrez ajouter vos coordonnées bancaires plus tard quand vous serez prêt pour la production.

Pour l'instant, en **mode TEST**, vous n'avez besoin que des clés API.

---

## 🔑 Étape 3 : Obtenir les clés API (ESSENTIEL)

### 3.1 Accéder au Dashboard

Une fois connecté, vous serez sur votre **Dashboard Stripe**.

### 3.2 Aller dans Developers

1. Cliquez sur **"Developers"** en haut à droite de la page
   - Ou allez directement sur : https://dashboard.stripe.com/test/apikeys

### 3.3 Récupérer les clés TEST (pour le développement)

⚠️ **Important** : Vous devez être en **mode TEST** (bouton en haut à droite du dashboard)

#### Clé Publique (Publishable Key)

1. Dans la section **"Publishable key"**
2. Vous verrez une clé qui commence par `pk_test_...`
3. **COPIEZ cette clé** → Ce sera votre `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST`

#### Clé Secrète (Secret Key)

1. Dans la section **"Secret key"**
2. Cliquez sur le bouton **"Reveal test key"** ou **"Révéler la clé"**
3. Une clé qui commence par `sk_test_...` apparaîtra
4. **COPIEZ cette clé** → Ce sera votre `STRIPE_SECRET_KEY_TEST`
5. ⚠️ **Important** : Cette clé ne s'affichera qu'une seule fois. Copiez-la immédiatement !

### 3.4 Résumé des clés à copier

Vous devriez avoir maintenant :
- ✅ `pk_test_xxxxxxxxxxxxxxxxxxxx` → Clé publique (Publishable key)
- ✅ `sk_test_xxxxxxxxxxxxxxxxxxxx` → Clé secrète (Secret key)

---

## 📝 Étape 4 : Configurer vos clés dans l'application

### 4.1 Créer le fichier .env.local

Créez un fichier `.env.local` à la racine de votre projet (à côté de `package.json`).

### 4.2 Ajouter les clés

```bash
# Stripe - Mode TEST (développement)
STRIPE_SECRET_KEY_TEST=sk_test_votre_cle_secrete_ici
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_votre_cle_publique_ici

# Mode actuel
STRIPE_MODE=test

# Webhook secret (on le configurera plus tard)
STRIPE_WEBHOOK_SECRET_TEST=

# Prix Stripe (on les remplira après avoir créé les produits)
STRIPE_PRICE_STANDARD_MONTHLY_TEST=
STRIPE_PRICE_STANDARD_YEARLY_TEST=
STRIPE_PRICE_PREMIUM_MONTHLY_TEST=
STRIPE_PRICE_PREMIUM_YEARLY_TEST=
STRIPE_PRICE_EXTRA_USER_MONTHLY_TEST=
STRIPE_PRICE_EXTRA_USER_YEARLY_TEST=
```

⚠️ **Important** : Remplacez `votre_cle_secrete_ici` et `votre_cle_publique_ici` par les vraies clés que vous venez de copier.

### 4.3 Vérifier que .env.local est dans .gitignore

Assurez-vous que `.env.local` est dans votre `.gitignore` pour ne pas commiter vos clés secrètes !

```bash
# Vérifier dans .gitignore
echo ".env.local" >> .gitignore  # Si ce n'est pas déjà dedans
```

---


## 🎯 Ce que vous pouvez faire MAINTENANT

Maintenant que vous avez un compte Stripe et vos clés :

✅ Vous pouvez tester l'intégration en mode développement
✅ Créer des produits et prix en mode TEST
✅ Utiliser des cartes de test pour les paiements
✅ Recevoir des webhooks en local

❌ Vous **ne pouvez PAS** encore :
- Recevoir de vrais paiements (c'est le mode TEST)
- Activer les paiements en production

---

## 🔄 Mode TEST vs Mode LIVE (Production)

### Mode TEST (actuel)

- ✅ **Gratuit et illimité**
- ✅ Utilise des cartes de test (4242 4242 4242 4242)
- ✅ Parfait pour développer et tester
- ✅ Aucun paiement réel ne sera effectué
- ✅ Données séparées du mode production

### Mode LIVE (plus tard, pour la production)

- ✅ Permet de recevoir de vrais paiements
- ⚠️ Nécessite une vérification d'identité complète
- ⚠️ Nécessite d'ajouter des coordonnées bancaires
- ⚠️ Nécessite de créer les produits à nouveau (en mode LIVE)
- ⚠️ Les clés sont différentes (commencent par `pk_live_` et `sk_live_`)

**Pour l'instant, restez en mode TEST !** C'est parfait pour développer.

---

## 🧪 Tester votre compte Stripe

### Utiliser des cartes de test

Stripe fournit des cartes de test pour tester différents scénarios :

| Scénario | Numéro de carte | CVC | Date |
|----------|----------------|-----|------|
| **Succès** | 4242 4242 4242 4242 | Tout | Future |
| **Échec** | 4000 0000 0000 0002 | Tout | Future |
| **3D Secure** | 4000 0027 6000 3184 | Tout | Future |
| **Visa débit** | 4000 0566 5566 5556 | Tout | Future |

Vous pouvez utiliser ces cartes dans votre application pour tester les paiements.

---

## 🆘 Problèmes courants

### "Je ne trouve pas les clés API"

**Solution** :
1. Assurez-vous d'être en **mode TEST** (bouton en haut à droite)
2. Allez dans **Developers > API keys**
3. Si vous ne voyez pas "Reveal test key", déconnectez-vous et reconnectez-vous

### "Je ne peux pas révéler la clé secrète"

**Solution** :
- La clé secrète est masquée par sécurité
- Cliquez sur **"Reveal test key"** pour la voir
- Elle ne s'affichera qu'une fois, copiez-la immédiatement !

### "Mon compte nécessite une vérification"

**Solution** :
- Pour le mode TEST, pas besoin de vérification complète
- Pour le mode LIVE (production), vous devrez compléter la vérification
- Pour l'instant, restez en mode TEST

### "Je dois ajouter mes coordonnées bancaires maintenant ?"

**Réponse** : **Non !**
- En mode TEST, pas besoin de coordonnées bancaires
- Vous les ajouterez plus tard quand vous passerez en production
- Pour l'instant, concentrez-vous sur le développement

---

## ✅ Checklist après création du compte

Vérifiez que vous avez :

- [ ] Compte Stripe créé et vérifié
- [ ] Accès au Dashboard Stripe
- [ ] Clé publique TEST copiée (`pk_test_...`)
- [ ] Clé secrète TEST copiée (`sk_test_...`)
- [ ] Clés ajoutées dans `.env.local`
- [ ] `.env.local` dans `.gitignore`
- [ ] Mode TEST activé dans le Dashboard

---

## 🚀 Prochaines étapes

Maintenant que vous avez un compte Stripe :

1. ✅ **Continuez avec le guide** : `QUICKSTART_STRIPE.md`
2. ✅ **Créez les produits** dans Stripe Dashboard (mode TEST)
3. ✅ **Testez l'intégration** dans votre application
4. ✅ **Plus tard**, quand vous serez prêt pour la production :
   - Complétez la vérification Stripe
   - Ajoutez vos coordonnées bancaires
   - Créez les produits en mode LIVE
   - Changez `STRIPE_MODE=production`

---

## 📞 Besoin d'aide ?

### Documentation Stripe

- **Guide de démarrage Stripe** : https://stripe.com/docs/get-started
- **Dashboard Stripe** : https://dashboard.stripe.com
- **Support Stripe** : https://support.stripe.com

### Documentation locale

- `QUICKSTART_STRIPE.md` - Guide de démarrage rapide
- `INSTALLATION_STRIPE.md` - Installation détaillée
- `README_STRIPE.md` - Guide principal

---

## 🎉 Félicitations !

Vous avez maintenant un compte Stripe et vos clés API configurées.

**Vous pouvez maintenant suivre le guide** : `QUICKSTART_STRIPE.md` pour continuer l'intégration !

---

## 💡 Conseils

1. **Gardez vos clés secrètes... secrètes !** Ne les partagez jamais
2. **Utilisez le mode TEST** pour tous vos développements
3. **Testez avec les cartes de test** avant de passer en production
4. **Ne commitez JAMAIS** `.env.local` dans Git
5. **Les clés TEST et LIVE sont différentes** - vérifiez toujours le mode

**Bonne chance ! 🚀**

