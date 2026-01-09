# 💳 Intégration Stripe - Guide Principal

## 🎯 Bienvenue !

L'intégration Stripe est **complète et prête à l'emploi**. Ce guide vous aidera à démarrer rapidement.

---

## ⚠️ Prérequis - Avez-vous un compte Stripe ?

**Avant de commencer**, vous devez avoir :
- ✅ Un compte Stripe (gratuit)

**Si vous n'avez pas encore de compte Stripe**, commencez par :

**👉 [GUIDE_CREATION_COMPTE_STRIPE.md](./GUIDE_CREATION_COMPTE_STRIPE.md)** 📝
- Guide pas à pas pour créer un compte Stripe
- Comment obtenir vos clés API
- Configuration du mode TEST
- **Commencez par là si vous n'avez pas de compte !**

---

## 🚀 Démarrage rapide (5 minutes)

Si vous avez déjà un compte Stripe, suivez ce guide :

**👉 [QUICKSTART_STRIPE.md](./QUICKSTART_STRIPE.md)**

Vous aurez Stripe opérationnel en 5 minutes chrono !

---

## 📚 Documentation complète

### Pour créer un compte Stripe

0. **[GUIDE_CREATION_COMPTE_STRIPE.md](./GUIDE_CREATION_COMPTE_STRIPE.md)** 📝 ⭐
   - **Si vous n'avez pas encore de compte Stripe**
   - Guide complet pour créer un compte
   - Comment obtenir vos clés API
   - Configuration du mode TEST

### Pour l'installation

1. **[QUICKSTART_STRIPE.md](./QUICKSTART_STRIPE.md)** ⚡
   - Guide ultra-rapide (5 minutes)
   - Les commandes essentielles
   - **Commencez par là !**

2. **[INSTALLATION_STRIPE.md](./INSTALLATION_STRIPE.md)** 📖
   - Guide d'installation pas à pas
   - Configuration détaillée de Stripe Dashboard
   - Tests et vérifications

### Pour comprendre l'architecture

3. **[STRIPE_INTEGRATION_COMPLETE.md](./STRIPE_INTEGRATION_COMPLETE.md)** 🏗️
   - Documentation technique complète
   - Architecture de l'intégration
   - Flux d'activation et cycle de vie
   - Sécurité et bonnes pratiques

4. **[STRIPE_SETUP.md](./STRIPE_SETUP.md)** ⚙️
   - Configuration avancée
   - Variables d'environnement détaillées
   - Configuration Stripe CLI
   - Tests avec cartes de test

### Pour l'administration

5. **[STRIPE_ADMIN_QUERIES.sql](./STRIPE_ADMIN_QUERIES.sql)** 🔧
   - Requêtes SQL utiles
   - Activation manuelle d'entreprises
   - Statistiques et monitoring
   - Debug et maintenance

6. **[STRIPE_FILES_SUMMARY.md](./STRIPE_FILES_SUMMARY.md)** 📁
   - Liste de tous les fichiers créés
   - Structure du projet
   - Points d'entrée importants

---

## 🎯 Que fait cette intégration ?

### ✅ Fonctionnalités implémentées

1. **Gestion des abonnements**
   - Plans Standard et Premium
   - Facturation mensuelle ou annuelle
   - Utilisateurs supplémentaires

2. **Contrôle d'accès strict**
   - Paiement initial (one-shot) requis
   - Abonnement actif requis
   - Blocage automatique en cas de non-paiement

3. **Synchronisation automatique**
   - Webhooks Stripe
   - Mise à jour en temps réel des statuts
   - Suspension/réactivation automatique

4. **Interface utilisateur**
   - Page de gestion d'abonnement
   - Portail client Stripe intégré
   - Statuts en temps réel

5. **Sécurité**
   - Vérification des signatures webhook
   - Clés séparées test/production
   - Aucune clé exposée côté client

---

## 🏗️ Architecture simplifiée

```
Inscription
    ↓
Création Company + Customer Stripe
    ↓
has_paid_entry_fee = false ❌
    ↓
Paiement manuel (virement)
    ↓
Admin active manuellement ✅
    ↓
has_paid_entry_fee = true
    ↓
Souscription abonnement via Stripe
    ↓
subscription_status = active ✅
    ↓
Accès total à l'application 🎉
```

### Cycle de paiement

```
Paiement réussi → Accès actif ✅
      ↓
Échec de paiement → Accès suspendu ❌
      ↓
Nouveau paiement → Accès rétabli ✅
```

---

## 📋 Checklist de démarrage

### Avant de commencer
- [ ] Compte Stripe créé (gratuit)
- [ ] Accès au dashboard Stripe
- [ ] Base de données Supabase opérationnelle

### Installation (5-10 minutes)
- [ ] `npm install stripe`
- [ ] Appliquer la migration DB
- [ ] Configurer `.env.local`
- [ ] Créer les produits Stripe
- [ ] Copier les Price IDs

### Tests (5 minutes)
- [ ] Créer un compte test
- [ ] Vérifier la redirection vers `/subscription`
- [ ] Activer manuellement l'entreprise
- [ ] Tester la page d'abonnement

### Webhooks (5 minutes)
- [ ] Installer Stripe CLI
- [ ] Lancer `stripe listen`
- [ ] Tester les événements

---

## 🆘 Problèmes courants

### "Missing Stripe secret key"
**Solution** : Vérifiez que `.env.local` contient `STRIPE_SECRET_KEY_TEST`

### "Webhook verification failed"
**Solution** : Lancez `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### Redirection infinie vers `/subscription`
**Solution** : Activez les frais d'entrée dans Supabase :
```sql
UPDATE companies SET has_paid_entry_fee = true WHERE name = 'Votre entreprise';
```

### "Missing Stripe price ID"
**Solution** : Créez les produits dans Stripe et copiez les Price IDs dans `.env.local`

---

## 🎓 Concepts clés

### has_paid_entry_fee
- Booléen dans la table `companies`
- Représente le paiement initial (one-shot)
- Activé **manuellement** par l'admin après virement
- **Requis** pour souscrire un abonnement

### subscription_status
- Statut d'accès à l'application
- Valeurs : `pending_payment`, `active`, `suspended`
- Mis à jour automatiquement par les webhooks
- Vérifié par le middleware à chaque requête

### Webhooks Stripe
- **CRITIQUES** pour la synchronisation
- Mettent à jour automatiquement les statuts
- Suspendent/réactivent les accès
- Vérifient la signature pour la sécurité

---

## 🔐 Sécurité

### ✅ Ce qui est sécurisé
- Clés secrètes jamais exposées côté client
- Vérification des signatures webhook
- Mode test isolé de la production
- RLS (Row Level Security) sur toutes les tables

### ❌ Ce qu'il NE faut JAMAIS faire
- Commiter `.env.local` dans Git
- Exposer `STRIPE_SECRET_KEY` côté client
- Utiliser les clés de production en test
- Ignorer les webhooks

---

## 📞 Ressources utiles

### Stripe
- **Dashboard** : https://dashboard.stripe.com
- **Documentation** : https://stripe.com/docs
- **API Reference** : https://stripe.com/docs/api
- **CLI** : https://stripe.com/docs/stripe-cli

### Supabase
- **Dashboard** : https://supabase.com/dashboard
- **Documentation** : https://supabase.com/docs

### Documentation locale
- Tous les guides sont dans ce dossier
- Commencez par `QUICKSTART_STRIPE.md`

---

## 🚀 Prochaines étapes

### Maintenant (Développement)
1. Suivre le [QUICKSTART_STRIPE.md](./QUICKSTART_STRIPE.md)
2. Tester avec des comptes et cartes de test
3. Créer un panel admin pour activer les entreprises

### Bientôt (Production)
1. Créer les produits en mode LIVE
2. Configurer les webhooks production
3. Tester avec de petits montants réels
4. Lancer ! 🎉

---

## 💡 Conseil final

**Commencez simple** :
1. Installez Stripe (`npm install stripe`)
2. Appliquez la migration DB
3. Configurez `.env.local`
4. Testez !

Tout le reste (produits, webhooks, etc.) peut se faire progressivement.

**👉 Commencez maintenant : [QUICKSTART_STRIPE.md](./QUICKSTART_STRIPE.md)**

---

## 🎉 Vous êtes prêt !

L'intégration Stripe est **complète**, **sécurisée** et **prête à l'emploi**.

**Questions ?** Consultez les guides ou la documentation Stripe.

**Bonne chance avec votre application ! 🚀**

