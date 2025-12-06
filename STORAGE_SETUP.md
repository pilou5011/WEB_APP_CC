# Configuration Supabase Storage pour les documents PDF

## Étapes de configuration

### 1. Créer le bucket dans Supabase

1. Allez dans votre dashboard Supabase
2. Naviguez vers **Storage** dans le menu de gauche
3. Cliquez sur **New bucket**
4. Nom du bucket : `documents`
5. Options :
   - **Public bucket** : Désactivé (privé)
   - **File size limit** : 10 MB
   - **Allowed MIME types** : `application/pdf`

### 2. Configurer les politiques RLS (Row Level Security)

**Important** : Si votre application n'utilise pas d'authentification (accès public), vous devez créer des politiques qui permettent l'accès public. Sinon, utilisez les politiques pour les utilisateurs authentifiés.

#### Option A : Accès public (si pas d'authentification)

Dans l'onglet **Policies** du bucket `documents`, ajoutez les politiques suivantes :

```sql
-- Politique d'insertion (Upload) - Public
CREATE POLICY "Allow public upload to documents"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'documents');

-- Politique de lecture (Download) - Public
CREATE POLICY "Allow public read from documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Politique de mise à jour (Update) - Public
CREATE POLICY "Allow public update to documents"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'documents');
```

#### Option B : Accès authentifié (si vous utilisez l'authentification)

```sql
-- Politique d'insertion (Upload) - Authentifié
CREATE POLICY "Allow authenticated users to upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Politique de lecture (Download) - Authentifié
CREATE POLICY "Allow authenticated users to read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Politique de mise à jour (Update) - Authentifié
CREATE POLICY "Allow authenticated users to update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');
```

**Note** : Pour créer ces politiques, allez dans Supabase Dashboard > Storage > documents > Policies > New Policy

### 3. Structure des fichiers

Les PDFs seront stockés dans la structure suivante :
```
documents/
  invoices/
    {invoice_id}/
      invoice_{date}.pdf
      stock_report_{date}.pdf
      deposit_slip_{date}.pdf
```

### 4. Notes importantes

- Les PDFs sont générés et sauvegardés automatiquement lors de la création d'une facture
- Les anciens documents (créés avant cette mise à jour) seront régénérés à la demande
- Les nouveaux documents sont figés dans le temps et ne changeront jamais, même si les données changent

