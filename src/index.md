```js
// Redirection automatique vers page Communes
if (typeof window !== 'undefined') {
  window.location.href = '/dash-exdtc-template-commune';
}
```

# Observatoire Territorial France

POC Observable Framework — Dynamiques démographiques et migratoires des territoires français.

**→ [Accéder au dashboard Communes](/dash-exdtc-template-commune)**

<div class="grid cols-2" style="gap: 1.5rem; margin: 2rem 0;">

<div class="card" style="padding: 1.5rem; border-left: 4px solid #2171b5;">

## [Exploration Dynamique](/jottd-exd-explor-dyn)

Vue multi-indicateurs complète (8 échelons géographiques)

- TCAM Population, Emploi, Logement
- Décomposition Solde Naturel / Migratoire
- Vieillissement (Part 60+, 75+, Indice)
- Comparaison 2011-2016 vs 2016-2022

**287 ZE · 96 DEP · 1231 EPCI · 1681 BV · 682 AAV**

</div>

<div class="card" style="padding: 1.5rem; border-left: 4px solid #41ab5d;">

## [POC Scatter](/poc-exd-scatter)

Test scatter plot dynamique

- Sélection 2 indicateurs X/Y
- Sélection période
- Points par échelon

**POC phase 2**

</div>

<!-- DÉSACTIVÉ TEMPORAIREMENT : Nécessite communes_unified.csv
<div class="card" style="padding: 1.5rem; border-left: 4px solid #888;">

## Flux Migratoires (désactivé)

Analyse MIGCOM — Mobilités résidentielles

- Part Entrants / Sortants (PE, PS)
- Solde Migratoire absolu (SM)
- Taux de Renouvellement (TR)
- Évolution 2015-2016 → 2021-2022

**Source : INSEE MIGCOM**

</div>
-->

</div>

---

## Sources

| Donnée | Source | Millésime |
|--------|--------|-----------|
| Population, Emploi, Logement | INSEE RP | 2011, 2016, 2022, 2023 |
| Flux migratoires | INSEE MIGCOM | 2015-16, 2021-22 |
| Prix immobilier | DVF/CEREMA | 2016-2024 |
| Fonds de carte | IGN Admin Express | 2025 |

---

*Projet PTOD — Observatoire Territorial*
