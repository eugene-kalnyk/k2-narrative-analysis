# К-2 Media Dashboard

Інтерактивна візуалізація медіа-присутності 20-ї окремої бригади безпілотних систем «К-2» у порівнянні з «Птахи Мадяра» та «Азов».

**Період**: травень 2025 — травень 2026
**Датасет**: 573 статті, 27 кампаній, 7 наративів про К-2

🔗 **Live**: https://eugene-kalnyk.github.io/k2-narrative-analysis/

## Що тут є

### Огляд
4 KPI-картки: загальний обсяг покриття, Total MQS, Average MQS, частка К-2. Топ-5 кампаній + entity-розподіл + місячна динаміка з можливістю натиснути на будь-яку точку і отримати список статей.

### Кампанії
27 meta-кампаній (об'єднані тематичні події). Stacked bar з розподілом по бригадах + повна таблиця з Total/Avg MQS. Click → popup статей кампанії.

### Меседжі (наративи К-2)
7 ключових takeaway-наративів про К-2 (тільки для К-2-статей):

| ID | Наратив |
|----|---------|
| N1 | Піонер у впровадженні НРК на полі бою |
| N2 | Підрозділ, що дає конкретний результат на фронті |
| N3 | Ключовий елемент «Лінії дронів» / СБС |
| N4 | Технологічний інноватор у безпілотних системах |
| N5 | Кирило Верес — комбриг нового типу |
| N6 | Бригада з людським обличчям |
| N7 | Швидка еволюція (розвідгрупа → бригада → 414-та) |

Кожен наратив супроводжується **verbatim-цитатою** з тексту статті (evidence-grounded класифікація).

### 5 кореляційних heatmap
- Наратив × Тип матеріалу (де живуть інтервʼю vs новини)
- Наратив × Tier медіа
- Наратив × Тональність
- Наратив × Місяць (динаміка у часі)
- Наратив × Наратив (співпоява пар)

Кожна клітинка клікабельна.

## Фільтри і метрики

**Глобальні фільтри** (вгорі сторінки):
- Бригада (К-2 / Мадяр / Азов / Усі)
- Tier медіа (1-5)
- Тип матеріалу (News, Interview, Feature story...)
- Тональність (Positive / Neutral / Negative)

**Toggle метрика** (поряд з фільтрами):
- **Кількість статей** — обсяг покриття
- **Total MQS** — сумарна вага покриття (Media Quality Score)
- **Average MQS** — якість на одну статтю

## Методологія

1. **Збір даних** — Google News scraping (~2000 URLs) + Selenium URL resolution + newspaper3k body extraction
2. **PR Metrics analysis** (gpt-4.1-mini) — coverage type, tone, MQS, key messages, perception
3. **Clustering** — text-embedding-3-small + Agglomerative ward k=50 → manual meta-merge до 27 кампаній
4. **Narrative classification** (gpt-4o-mini, evidence-grounded) — для кожної з 183 К-2 статей × 7 наративів — verbatim quote з body тексту
5. **Manual overrides** для false negatives класифікатора

## Обмеження

- Наративи аналізовані лише для К-2 статей (для cross-entity порівняння — на рівні кампаній)
- 7 «ШАБЛЯ К-2 / Roboneers» статей виключені (це продукт компанії, не дії бригади)
- MQS — proprietary метрика [PR Metrics](https://prmetrics.ai), не universally calibrated
- 3-тя штурмова не включена як окрема entity

## Стек

Чистий статичний стек — жодного backend'у:

- **HTML + Vanilla JS** — `index.html` + `app.js`
- **Tailwind CSS** через CDN (з кастомними кольорами на основі дизайн-токенів PR Metrics 2.0)
- **Chart.js** через CDN для bar/donut/line чартів
- **CSS Grid** для heatmaps
- **JSON files** для даних

Деплой — GitHub Pages.

## Локальний запуск

```bash
cd viz/
python3 -m http.server 8000
# Відкрий http://localhost:8000
```

## Кольори (з PR Metrics design system)

- Primary: `#6D5BFF` — К-2 (purple)
- Lime: `#C8FF61` — Мадяр (accent)
- Warning: `#F59E0B` — Азов
- BG: `#F7F6FF` — м'який фіолетовий бекграунд

## Контекст проєкту

Цей дашборд — частина ТЗ для позиції **Media Cooperation Manager** у К-2 бригаді (травень 2026). Автор: Eugene Kalnyk.

---

*Усі цифри обчислені, не оцінені. Дані: `data/*.json`.*
