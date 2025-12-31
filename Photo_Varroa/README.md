<p align="center">
  <img src="docs/Scan_Varroa_sur_smartphone.png" alt="Varroa Scan – icône" width="200">
</p>

# Varroa Scan – Test de prise de vue par balayage

## Contexte

Le comptage des varroas sur lange gras est une opération cruciale en apiculture,
mais elle reste aujourd’hui largement manuelle, chronophage et sujette à une forte variabilité humaine.

Ce projet explore une approche basée sur :
- une **prise de vue par balayage manuel** à courte distance,
- une **analyse serveur a posteriori** (fusion, détection),
- avec pour objectif une **mesure fiable, reproductible et automatisable**.

---

## Objectif du dépôt

Ce dépôt vise à **valider expérimentalement la prise de vue**, avant toute implémentation d’intelligence artificielle.

La question centrale est :

> Est-il possible de produire, avec un smartphone, une série d’images exploitables
> d’un lange gras par balayage manuel, à courte distance, de manière répétable ?

---

## Principe général

- Le smartphone agit comme **capteur d’images uniquement**
- Aucune fusion, panorama ou IA n’est effectuée sur le téléphone
- Les images sont :
  - prises à distance fixe (10–15 cm),
  - avec recouvrement,
  - envoyées ou analysées ultérieurement côté serveur

Ce principe est proche de techniques utilisées en **microscopie mosaïque** ou en **imagerie scientifique par tuiles**.

---

## Hypothèses de travail

- Distance caméra ↔ lange : **10 à 15 cm**
- Caméra **fixée** (caisson, support, cadre)
- Mouvement par **translation du lange**, pas de rotation de la caméra
- Éclairage **stable et contrôlé**
- Recouvrement entre images : **≥ 25 %**
- Images conservées **brutes**, pleine résolution

---

## Ce que fait l’application de test

- Capture d’images pleine résolution
- Verrouillage des paramètres caméra :
  - focus
  - exposition
  - balance des blancs
  - zoom désactivé
- Guidage simple de l’utilisateur pour le balayage

