/*
  # Ajout du champ cards_quantities pour les clients

  1. Nouvelle colonne ajoutée à la table clients
    - cards_quantities (jsonb) : liste d'objets décrivant les quantités de cartes par événement

  Exemple de structure :
  [
    { "event": "saint_valentin", "value": 50 },
    { "event": "communion", "value": 30 },
    { "event": "paques", "value": 40 },
    { "event": "premier_mai", "value": 20 },
    { "event": "fete_des_meres", "value": 60 },
    { "event": "fete_des_peres", "value": 35 },
    { "event": "bapteme", "min": 10, "max": 50 },
    { "event": "mariage", "min": 20, "max": 100 },
    { "event": "anniversaire_mariage", "min": 5, "max": 30 },
    { "event": "retraite", "min": 5, "max": 20 }
  ]
*/

alter table public.clients
  add column if not exists cards_quantities jsonb;

comment on column public.clients.cards_quantities is
  'Quantités de cartes par événement, stockées sous forme de liste d''objets JSON';

