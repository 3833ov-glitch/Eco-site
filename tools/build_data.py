#!/usr/bin/env python3
"""Сборка data/countries.json из первичных источников.
Входные файлы (скачаны в /workspace/eco-data):
  - WHO GHO OData: NCD_HYP_*_C.json (NCD-RisC 2021, данные за 2019 г.)
  - World Bank WDI API: wb/*.json (население по 5-летним группам, ВВП на душу в нац. валюте)
  - gbd21.txt: текст статьи GBD 2021 Stroke Risk Factor Collaborators, Lancet Neurol 2024, табл. 1
Запуск: venv/bin/python build_data.py <путь к eco-data> <путь к выходному json>
"""
import json, re, sys, gettext, datetime
import pycountry
from babel.numbers import get_territory_currencies, get_currency_name, get_currency_symbol

SRC = sys.argv[1]; OUT = sys.argv[2]
ru = gettext.translation('iso3166-1', pycountry.LOCALES_DIR, languages=['ru'])

NAME_OVERRIDE = {'USA':'США','RUS':'Россия','GBR':'Великобритания','KOR':'Южная Корея','PRK':'КНДР',
 'VEN':'Венесуэла','SYR':'Сирия','LAO':'Лаос','MDA':'Молдова','COD':'ДР Конго','COG':'Республика Конго',
 'IRN':'Иран','TZA':'Танзания','BOL':'Боливия','FSM':'Микронезия','VNM':'Вьетнам','CZE':'Чехия',
 'MKD':'Северная Македония','PSE':'Палестина','TUR':'Турция','CIV':"Кот-д’Ивуар",'ARE':'ОАЭ',
 'DOM':'Доминиканская Республика','CAF':'ЦАР','BRN':'Бруней','SWZ':'Эсватини','CPV':'Кабо-Верде',
 'KGZ':'Киргизия','TWN':'Тайвань','KNA':'Сент-Китс и Невис','VCT':'Сент-Винсент и Гренадины'}
FEATURED = ['RUS','KAZ','BLR','UZB','DEU','USA','IND','CHN','BRA']
# Валюта нестабильна/деноминирована — расчёт затрат не показываем
NO_COST = {'ZWE','VEN','SLE','LBN','SYR','SSD','SDN','YEM','ARG','IRN'}

GBD_NAME_FIX = {'Bosnia and':'BIH','Saint Vincent and':'VCT','Central African':'CAF','Democratic Republic':'COD',
 'Federated States of':'FSM','Northern Mariana':'MNP','Taiwan (province of':'TWN','Tongo':'TON','Congo (Brazzaville)':'COG',
 'Russia':'RUS','USA':'USA','UK':'GBR','South Korea':'KOR','North Korea':'PRK','Iran':'IRN','Syria':'SYR','Laos':'LAO',
 'Viet Nam':'VNM','Moldova':'MDA','Bolivia':'BOL','Venezuela':'VEN','Tanzania':'TZA','The Bahamas':'BHS','The Gambia':'GMB',
 'Palestine':'PSE','Brunei':'BRN','Cabo Verde':'CPV','Czechia':'CZE','Virgin Islands':'VIR','Eswatini':'SWZ',
 'Türkiye':'TUR','Turkey':'TUR',"Côte d’Ivoire":'CIV',"Côte d'Ivoire":'CIV','São Tomé and Príncipe':'STP','Micronesia':'FSM'}
GBD_REGIONS = {'Global','High income','Upper-middle income','Lower-middle income','Low income','High SDI','High-middle SDI',
 'Middle SDI','Low-middle SDI','Low SDI','Central Europe, eastern','Central Asia','Central Europe','Eastern Europe','Australasia',
 'High-income Asia','High-income North','Southern Latin America','Western Europe','Latin America and','Andean Latin America',
 'Caribbean','Central Latin America','Tropical Latin America','North Africa and Middle','South Asia','Southeast Asia, east Asia,',
 'East Asia','Oceania','Southeast Asia','Sub-Saharan Africa','Central sub-Saharan','Eastern sub-Saharan','Southern sub-Saharan',
 'Western sub-Saharan'}

def iso_from_name(n):
    if n in GBD_NAME_FIX: return GBD_NAME_FIX[n]
    try: return pycountry.countries.lookup(n).alpha_3
    except LookupError:
        try: return pycountry.countries.search_fuzzy(n)[0].alpha_3
        except Exception: return None

# ---------- GBD 2021 stroke incidence (Lancet Neurol 2024, Table 1) ----------
L = open(f'{SRC}/gbd21.txt', encoding='utf8').read().split('\n')
num = r'(\d{1,3}(?: \d{3})*|\d+)'
pat = re.compile(r'^\s{20,}(\S[^\d]*?)\s{2,}' + num + r'\s+([–-]?\d+·\d)%')
uip = re.compile(r'^\s*\(' + num + r' to ' + num + r'\)')
gbd = {}; unmatched = []
stop = False
for i, l in enumerate(L):
    if 'Ambient particulate matter' in l: break
    m = pat.match(l)
    if not m: continue
    name = m.group(1).strip()
    if name in GBD_REGIONS: continue
    iso = iso_from_name(name)
    if not iso: unmatched.append(name); continue
    u = None
    for j in range(i+1, min(i+10, len(L))):
        if pat.match(L[j]): break
        u = uip.match(L[j])
        if u: break
    gbd[iso] = {'v': int(m.group(2).replace(' ', '')),
                'lo': int(u.group(1).replace(' ', '')) if u else None,
                'hi': int(u.group(2).replace(' ', '')) if u else None, 'gbd_name': name}
print('GBD countries:', len(gbd), 'unmatched:', unmatched, file=sys.stderr)

# ---------- WHO GHO / NCD-RisC cascade, 2019, both sexes, crude ----------
def gho(code):
    d = json.load(open(f'{SRC}/{code}.json'))['value']
    return {r['SpatialDim']: r for r in d if r['SpatialDimType']=='COUNTRY' and r['TimeDim']==2019 and r['Dim1']=='SEX_BTSX'}
prev, diag, treat, ctrl = (gho(c) for c in ['NCD_HYP_PREVALENCE_C','NCD_HYP_DIAGNOSIS_C','NCD_HYP_TREATMENT_C','NCD_HYP_CONTROL_C'])

# ---------- World Bank ----------
def wb(ind):
    d = json.load(open(f'{SRC}/wb/{ind}.json'))[1] or []
    out = {}
    for r in d:
        if r['value'] is None: continue
        iso = r['countryiso3code']; y = int(r['date'])
        if iso and (iso not in out or y > out[iso][1]): out[iso] = (r['value'], y)
    return out
ages = ['3034','3539','4044','4549','5054','5559','6064','6569','7074','7579']
pop_m, pop_f = wb('SP.POP.TOTL.MA.IN'), wb('SP.POP.TOTL.FE.IN')
pct = {(a,s): wb(f'SP.POP.{a}.{s}.5Y') for a in ages for s in ['MA','FE']}
gdp = wb('NY.GDP.PCAP.CN')

def pop3079(iso):
    if iso not in pop_m or iso not in pop_f: return None
    y = min(pop_m[iso][1], pop_f[iso][1]); tot = 0
    for a in ages:
        for s, base in (('MA', pop_m), ('FE', pop_f)):
            p = pct[(a,s)].get(iso)
            if not p or p[1] != y: return None
            tot += p[0]/100 * base[iso][0]
    return round(tot), y

def g(rec):
    return None if not rec or rec['NumericValue'] is None else {'v': rec['NumericValue'], 'lo': rec['Low'], 'hi': rec['High']}

isos = set(prev) | set(gbd) | set(c.alpha_3 for c in pycountry.countries)
countries = []
for iso in sorted(isos):
    pc = pycountry.countries.get(alpha_3=iso)
    if not pc: continue
    has_any = iso in prev or iso in gbd
    # пропускаем мелкие территории без каких-либо данных
    if not has_any and not hasattr(pc, 'official_name') and iso not in ('TWN','XKX'):
        pass
    name_ru = NAME_OVERRIDE.get(iso) or ru.gettext(pc.name)
    try:
        cur = get_territory_currencies(pc.alpha_2, tender=True, non_tender=False)[:1]
    except Exception: cur = []
    cur = cur[0] if cur else None
    obs = {}
    p = pop3079(iso)
    if p: obs['pop3079'] = {'v': p[0], 'year': p[1], 'src': 'wb'}
    for key, src in (('prev', prev), ('diag', diag), ('treat', treat), ('ctrl', ctrl)):
        x = g(src.get(iso))
        if x: x.update(year=2019, src='ncdrisc'); obs[key] = x
    if iso in gbd:
        s = gbd[iso]; obs['strokes'] = {'v': s['v'], 'lo': s['lo'], 'hi': s['hi'], 'year': 2021, 'src': 'gbd21'}
    if iso in gdp and iso not in NO_COST and cur:
        obs['gdppc'] = {'v': round(gdp[iso][0]), 'year': gdp[iso][1], 'src': 'wbgdp'}
    need = ['pop3079','prev','diag','treat','ctrl','strokes']
    missing = [k for k in need + ['gdppc'] if k not in obs]
    status = 'full' if not missing else ('model' if all(k in obs for k in need) else ('partial' if obs else 'none'))
    if status == 'none' and iso not in FEATURED:
        # список держим разумным: страны ООН без данных всё равно показываем, территории — нет
        if not getattr(pc, 'official_name', None) and len(pc.name) > 0 and iso not in prev: 
            pass
    countries.append({'iso3': iso, 'name': name_ru, 'name_en': pc.name, 'featured': iso in FEATURED,
        'currency': {'code': cur, 'name': get_currency_name(cur, locale='ru'), 'symbol': get_currency_symbol(cur, locale='ru')} if cur else None,
        'obs': obs, 'status': status, 'missing': missing,
        'no_cost_reason': 'Курс/деноминация национальной валюты нестабильны — затраты в местной валюте не показываем' if iso in NO_COST else None})

# оставляем: все страны с хоть какими-то данными + члены ООН без данных (state "данных пока нет")
UN_EXTRA = {'TWN','XKX','VAT','LIE','MCO','SMR','AND','NRU','TUV','PLW','MHL','KIR'}
countries = [c for c in countries if c['obs'] or c['iso3'] in UN_EXTRA]
countries.sort(key=lambda c: c['name'])
json.dump({'generated': datetime.date.today().isoformat(), 'countries': countries}, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
from collections import Counter
print(Counter(c['status'] for c in countries), file=sys.stderr)
for c in countries:
    if c['featured']: print(c['name'], c['status'], c['missing'], c['obs'].get('pop3079'), c['obs'].get('strokes'), c['obs'].get('gdppc'), file=sys.stderr)
