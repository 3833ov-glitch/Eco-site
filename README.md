# Сайт ЭЦО — гипертония и инсульт (версия 0.1, 24.11.2026)

Статический сайт (HTML/CSS/JS без сборки). Страницы: `index.html` (выбор страны + сравнение), `project.html` (О проекте, с местами для авторского текста), `method.html` (Методология).

## Запуск локально
```
cd eco-site && python3 -m http.server 8765
# открыть http://localhost:8765/
```
(Открывать файл напрямую с диска нельзя: браузер не даст загрузить JSON через fetch.)

## Хостинг
Подходит любой статический хостинг (GitHub Pages, Netlify, Cloudflare Pages): загрузить папку целиком.

## Данные
- `data/countries.json` — страны: наблюдаемые данные с годом и ключом источника.
- `data/model.json` — параметры модели (значение, диапазон, тип: допущение / из исследований / иллюстрация), источники с датами, сверка с национальными цифрами.
- `js/model.js` — формулы модели (тот же код работает на сайте).

## Обновление данных
`tools/build_data.py` собирает `countries.json` из:
- ВОЗ GHO OData: `NCD_HYP_PREVALENCE_C`, `NCD_HYP_DIAGNOSIS_C`, `NCD_HYP_TREATMENT_C`, `NCD_HYP_CONTROL_C` (https://ghoapi.azureedge.net/api/<код>);
- Всемирный банк API: `SP.POP.<возраст>.<MA|FE>.5Y`, `SP.POP.TOTL.<MA|FE>.IN`, `NY.GDP.PCAP.CN`;
- текст таблицы 1 статьи GBD 2021 Stroke (Lancet Neurol 2024), `pdftotext -layout`.
Нужны Python-пакеты `pycountry` и `babel`. Исходные выгрузки на рабочей машине лежат в `/workspace/eco-data`.
