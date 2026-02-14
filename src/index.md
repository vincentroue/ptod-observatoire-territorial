```js
// Redirection automatique vers page Communes
if (typeof window !== 'undefined') {
  window.location.href = '/dash-exdtc-template-commune';
}
```

# OTTD — Observatoire des Trajectoires Territoriales

Comment les flux migratoires, les dynamiques économiques et les marchés du logement recomposent-ils les territoires français depuis 2011 ?

<div class="grid cols-2" style="gap: 1.2rem; margin: 1.5rem 0;">

<div class="card" style="padding: 1.2rem; border-left: 4px solid #2171b5;">

### [Exploration multi-échelle](/jottd-exd-explor-dyn)

Vue panoramique — 60+ indicateurs × 8 échelons géographiques

- Démographie, emploi, logement, revenus
- Scatter croisé, carte choroplèthe, tableau complet
- Comparaison inter-périodes (2011-16 vs 2016-22)

**287 ZE · 96 DEP · 1231 EPCI · 1681 BV · 682 AAV**

</div>

<div class="card" style="padding: 1.2rem; border-left: 4px solid #6366f1;">

### [Communes](/dash-exdtc-template-commune)

Vue infra-communale — 35 000 communes et arrondissements

- Carte France + zoom commune
- Indicateurs démographiques et socio-économiques
- Tableau avec seuils population

**35K communes · DuckDB Parquet**

</div>

<div class="card" style="padding: 1.2rem; border-left: 4px solid #d97706;">

### [Économie ZE](/dash-exdeco-ze)

Spécialisation et dynamiques sectorielles — Zones d'emploi

- Structure sectorielle FLORES A5/A21 + URSSAF A38
- Butterfly, treemap, indice 100 par secteur
- Krugman, IS, évolution emploi privé 2019-2024

**FLORES 2023 · URSSAF 2014-2024 · EAE205 1998-2023**

</div>

<div class="card" style="padding: 1.2rem; border-left: 4px solid #059669;">

### [Attractivité](/dash-exdattract-ze)

Attractivité résidentielle et productive — Quelles trajectoires depuis 2011 ?

- 2 cartes : indice résidentiel × indice productif
- 3 scatter switchables : niveau, trajectoire, combiné
- Quadrants : attractif global, résidentiel seul, productif seul

**Indices composites · MIGCOM + RP + URSSAF + SIDE + DVF**

</div>

<div class="card" style="padding: 1.2rem; border-left: 4px solid #e11d48;">

### [Logement](/dash-exdlog)

Marchés du logement et tensions foncières

- Prix DVF, vacance LOVAC, construction SITADEL
- Vue commune > 10K + tableau communes > 50K
- Croisement prix × attractivité résidentielle

**DVF 2016-2024 · LOVAC · SITADEL**

</div>

<div class="card" style="padding: 1.2rem; border-left: 4px solid #9ca3af;">

### Flux migratoires <span style="font-size:11px;color:#9ca3af;">(à venir)</span>

Mobilités résidentielles MIGCOM — Analyse OD

- Part Entrants / Sortants (PE, PS)
- Solde Migratoire par profil (âge, CSP)
- Taux de Renouvellement (TR)

**Source : INSEE MIGCOM 2016 / 2022**

</div>

</div>

---

## Sources

| Donnée | Source | Millésime |
|--------|--------|-----------|
| Population, Emploi, Logement | INSEE RP | 2011, 2016, 2022, 2023 |
| Flux migratoires | INSEE MIGCOM | 2015-16, 2021-22 |
| Emploi privé sectoriel | URSSAF | 2014-2024 |
| Emploi total sectoriel | INSEE FLORES | 2022-2023 |
| Créations d'entreprises | INSEE SIDE | 2017-2024 |
| Prix immobilier | DVF / CEREMA | 2016-2024 |
| Vacance logement | LOVAC / Fidéli | 2022 |
| Fonds de carte | IGN Admin Express | 2025 |

---

*Projet PTOD — Observatoire des Trajectoires Territoriales*
