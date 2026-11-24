/* Главная страница: выбор страны и сравнение */
(function () {
  'use strict';
  var E = window.Eco, Model = window.EcoModel;
  var C = [], M = null, byIso = {};
  var input = document.getElementById('country-input');
  var list = document.getElementById('country-list');
  var quick = document.querySelector('.quick');
  var out = document.getElementById('result');
  var active = -1, shown = [];

  var ALIASES = { RUS: 'рф russia российская федерация', USA: 'сша америка штаты united states america', GBR: 'англия британия uk britain',
    DEU: 'германия фрг germany deutschland', CHN: 'кнр china', KOR: 'корея', BLR: 'белоруссия belarus', KGZ: 'кыргызстан',
    MDA: 'молдавия', TUR: 'türkiye турция', CZE: 'чешская республика', ARE: 'эмираты', IND: 'india бхарат' };

  var LEGEND = '<div class="legend" aria-label="Обозначения типов данных"><span><span class="b b-obs">Наблюдение</span> опубликованные данные</span><span><span class="b b-mod">Модель</span> расчёт</span><span><span class="b b-ill">Иллюстрация</span> условные цены</span><span><span class="b b-miss">Нет данных</span></span></div>';
  var STATUS_TEXT = { full: '', model: 'без затрат', partial: 'данных пока нет', none: 'данных пока нет' };

  function norm(s) { return String(s).toLowerCase().replace(/ё/g, 'е').replace(/[’'`]/g, '').trim(); }

  function badge(kind) {
    var m = { obs: ['b-obs', 'Наблюдение'], mod: ['b-mod', 'Модель'], ill: ['b-ill', 'Иллюстрация'], miss: ['b-miss', 'Нет данных'], tgt: ['b-mod', 'Цель сценария'] }[kind];
    return '<span class="b ' + m[0] + '">' + m[1] + '</span>';
  }
  function srcRef(id, year) {
    var s = M.sources[id]; if (!s) return '';
    return '<a href="method.html#src-' + id + '">' + E.esc(shortSrc(id)) + '</a>' + (year ? ', данные за ' + year + ' г.' : '');
  }
  function shortSrc(id) {
    return { ncdrisc: 'NCD-RisC / ВОЗ, 2021', gbd21: 'GBD 2021, Lancet Neurology 2024', wb: 'Всемирный банк, WDI (обновл. 11.11.2026)', wbgdp: 'Всемирный банк, WDI (обновл. 11.11.2026)' }[id] || id;
  }

  /* ---------- выбор страны (ARIA combobox) ---------- */
  function filter(q) {
    q = norm(q);
    var res = C.filter(function (c) {
      if (!q) return true;
      return c._s.indexOf(q) !== -1;
    });
    res.sort(function (a, b) {
      if (!q && a.featured !== b.featured) return a.featured ? -1 : 1;
      var as = norm(a.name).indexOf(q) === 0, bs = norm(b.name).indexOf(q) === 0;
      if (as !== bs) return as ? -1 : 1;
      return a.name.localeCompare(b.name, 'ru');
    });
    return res;
  }
  function renderList(q) {
    shown = filter(q);
    var html = '', groupDone = false;
    if (!q) html += '<li class="grp" role="presentation">Основные страны</li>';
    shown.forEach(function (c, i) {
      if (!q && !c.featured && !groupDone) { html += '<li class="grp" role="presentation">Все страны (А–Я)</li>'; groupDone = true; }
      var st = STATUS_TEXT[c.status];
      html += '<li role="option" id="opt-' + c.iso3 + '" data-i="' + i + '" aria-selected="false">' +
        '<span>' + E.esc(c.name) + '</span>' + (st ? '<span class="st">' + st + '</span>' : '') + '</li>';
    });
    if (!shown.length) html = '<li class="grp" role="presentation">Ничего не найдено</li>';
    list.innerHTML = html;
    active = shown.length ? 0 : -1;
    highlight();
  }
  function open() { list.hidden = false; input.setAttribute('aria-expanded', 'true'); }
  function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
  function highlight() {
    var opts = list.querySelectorAll('[role="option"]');
    opts.forEach(function (o) { o.setAttribute('aria-selected', 'false'); });
    if (active < 0 || !opts[active]) { input.removeAttribute('aria-activedescendant'); return; }
    opts[active].setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', opts[active].id);
    opts[active].scrollIntoView({ block: 'nearest' });
  }
  function choose(c) {
    if (!c) return;
    input.value = c.name;
    close();
    if (location.hash !== '#' + c.iso3) history.replaceState(null, '', '#' + c.iso3);
    render(c);
  }
  input.addEventListener('input', function () { renderList(input.value); open(); });
  input.addEventListener('focus', function () { input.select(); renderList(''); open(); });
  input.addEventListener('click', function () { if (list.hidden) { renderList(''); open(); } });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) { renderList(input.value); open(); } else if (active < shown.length - 1) { active++; highlight(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (active > 0) { active--; highlight(); } }
    else if (e.key === 'Home' && !list.hidden) { active = 0; highlight(); }
    else if (e.key === 'End' && !list.hidden) { active = shown.length - 1; highlight(); }
    else if (e.key === 'Enter') { if (!list.hidden && shown[active]) { e.preventDefault(); choose(shown[active]); } }
    else if (e.key === 'Escape') { close(); }
    else if (e.key === 'Tab') { close(); }
  });
  list.addEventListener('mousedown', function (e) { e.preventDefault(); });
  list.addEventListener('click', function (e) {
    var li = e.target.closest('[role="option"]'); if (li) choose(shown[+li.dataset.i]);
  });
  document.addEventListener('click', function (e) { if (!document.getElementById('picker').contains(e.target)) close(); });
  window.addEventListener('hashchange', function () { var c = byIso[location.hash.slice(1).toUpperCase()]; if (c) { input.value = c.name; render(c); } });

  function renderQuick(cur) {
    quick.innerHTML = ['RUS', 'KAZ', 'BLR', 'UZB', 'DEU', 'USA', 'IND', 'CHN', 'BRA'].map(function (i) { return byIso[i]; }).map(function (c) {
      return '<li><button type="button" data-iso="' + c.iso3 + '" aria-pressed="' + (cur && cur.iso3 === c.iso3) + '">' + E.esc(c.name) + '</button></li>';
    }).join('');
  }
  quick.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) choose(byIso[b.dataset.iso]); });

  /* ---------- вывод результата ---------- */
  function range(lo, hi, f) { return '<span class="rng">' + f(lo) + ' – ' + f(hi) + '</span>'; }

  function render(c) {
    renderQuick(c);
    out.setAttribute('aria-busy', 'true');
    var o = c.obs, r = Model.run(c, M), h = '';
    var title = '<div class="res-head"><h2 id="res-title">' + E.esc(c.name) + ': текущая программа и сценарий ЭЦО</h2>' +
      '<p class="lead">Взрослые 30–79 лет · горизонт ' + M.horizon_years + ' лет · одна и та же численность населения в обоих вариантах.</p></div>';

    if (!r) { out.innerHTML = title + renderMissing(c); out.setAttribute('aria-busy', 'false'); return; }
    var m = r.mid, lo = r.lo, hi = r.hi, cur = c.currency, k = m.costs;

    // ключевые цифры
    h += '<div class="kpis">';
    h += '<div class="kpi"><p class="t">Ожидаемые инсульты за ' + M.horizon_years + ' лет ' + badge('mod') + '</p><p class="v">' + E.people(m.strokesCur) + ' → ' + E.people(m.strokesEco) + '</p><p class="s">текущая программа → сценарий ЭЦО</p></div>';
    h += '<div class="kpi"><p class="t">Предотвращено инсультов ' + badge('mod') + '</p><p class="v">' + (m.averted > 0 ? '≈' + E.people(m.averted) : '0') + '</p><p class="s">' + (m.averted > 0 ? 'диапазон ' + E.people(lo.averted) + ' – ' + E.people(hi.averted) + ' · ' + E.pct(m.averted / m.strokesCur).replace('%', '') + '% ожидаемых' : 'контроль уже на уровне цели') + '</p></div>';
    h += '<div class="kpi"><p class="t">Давление под контролем ' + badge('obs') + ' → ' + badge('tgt') + '</p><p class="v">' + E.pct(m.k0) + ' → ' + E.pct(m.k1) + '</p><p class="s">' + (m.dCtrl > 0 ? '+' + E.people(m.dCtrl) + ' человек с контролируемым давлением' : 'без изменений') + '</p></div>';
    if (k) {
      var fm = function (x) { return E.money(x, cur); };
      h += '<div class="kpi kpi-wide kpi-cost"><p class="t">Затраты за ' + M.horizon_years + ' лет: программа + лечение инсультов ' + badge('ill') + '</p><p class="v">' + fm(k.totalCur) + ' → ' + fm(k.totalEco) + '</p><p class="s">программа: ' + fm(k.progCur) + ' → ' + fm(k.progEco) + ' · инсульты: ' + fm(k.strokeCur) + ' → ' + fm(k.strokeEco) + '</p></div>';
    }
    h += '</div>';

    if (m.atTarget) h += '<p class="notice"><strong>Контроль давления здесь уже выше цели 80-80-80 (≈51%).</strong> В этой версии модели сценарий ЭЦО для такой страны совпадает с текущей ситуацией. Для неё нужна более высокая цель — это запланировано.</p>';

    h += LEGEND;
    // таблица
    var curLabel = cur ? E.esc(cur.name) + ' (' + E.esc(cur.code) + ')' : '';
    h += '<div class="tablewrap"><table aria-describedby="tbl-note"><caption>Сравнение для страны «' + E.esc(c.name) + '»: взрослые 30–79 лет, ' + M.horizon_years + ' лет' + (k ? '; деньги — в национальной валюте: ' + curLabel : '') + '</caption>';
    h += '<thead><tr><th scope="col">Показатель <span class="sr">(тип данных и источник)</span></th><th scope="col" class="num">Текущая программа</th><th scope="col" class="num">Сценарий ЭЦО</th></tr></thead><tbody>';
    function row(label, a, b, type, src) { h += '<tr><th scope="row">' + label + '<span class="meta">' + type + (src ? ' ' + src : '') + '</span></th><td class="num">' + a + '</td><td class="num">' + b + '</td></tr>'; }

    row('Взрослые 30–79 лет', E.people(m.pop), E.people(m.pop), badge('obs'), srcRef('wb', o.pop3079.year));
    row('Из них с повышенным давлением (АГ)', E.people(m.H) + range(r.lo.H, r.hi.H, E.people), E.people(m.H), badge('obs'), srcRef('ncdrisc', 2019) + '; доля ' + E.p1(o.prev.v) + ' (' + E.p1(o.prev.lo) + '–' + E.p1(o.prev.hi) + ') × население ' + o.pop3079.year + ' г.');
    row('Знают о своём диагнозе', E.pct(m.d0) + '<span class="rng">' + E.people(m.diag0) + ' чел.</span>', E.pct(m.d1) + '<span class="rng">' + E.people(m.diag1) + ' чел.</span>', badge('obs') + ' → ' + badge('tgt'), srcRef('ncdrisc', 2019));
    row('Получают лечение', E.pct(m.t0) + '<span class="rng">' + E.people(m.treated0) + ' чел.</span>', E.pct(m.t1) + '<span class="rng">' + E.people(m.treated1) + ' чел.</span>', badge('obs') + ' → ' + badge('tgt'), srcRef('ncdrisc', 2019));
    row('Давление под контролем (&lt;140/90)', E.pct(m.k0) + '<span class="rng">' + E.people(m.ctrl0) + ' чел.</span>', E.pct(m.k1) + '<span class="rng">' + E.people(m.ctrl1) + ' чел.</span>', badge('obs') + ' → ' + badge('tgt'), srcRef('ncdrisc', 2019));
    row('Новые инсульты в год, все возрасты', E.people(o.strokes.v) + (o.strokes.lo ? range(o.strokes.lo, o.strokes.hi, E.people) : ''), '—', badge('obs'), srcRef('gbd21', o.strokes.year) + '; первые в жизни инсульты');
    row('Новые инсульты за ' + M.horizon_years + ' лет, 30–79 лет', E.people(m.strokesCur) + range(lo.strokesCur, hi.strokesCur, E.people), E.people(m.strokesEco) + range(lo.strokesEco, hi.strokesEco, E.people), badge('mod'), 'доля 30–79 лет и эффект контроля — см. методологию');
    row('Предотвращено инсультов за ' + M.horizon_years + ' лет', '—', '<strong>' + E.people(m.averted) + '</strong>' + (m.averted > 0 ? range(lo.averted, hi.averted, E.people) : ''), badge('mod'), 'снижение риска на ' + Math.round(M.params.rrr.v * 100) + '% (' + Math.round(M.params.rrr.lo * 100) + '–' + Math.round(M.params.rrr.hi * 100) + '%) у людей, чьё давление стало контролируемым');
    if (k) {
      var cl = r.costLo.costs, ch = r.costHi.costs;
      var f = function (x) { return E.money(x, cur); };
      row('Затраты на программу за ' + M.horizon_years + ' лет', f(k.progCur) + range(cl.progCur, ch.progCur, f), f(k.progEco) + range(cl.progEco, ch.progEco, f) +
        '<span class="rng">лечение ' + f(k.treatEco) + ', скрининг ' + f(k.screenEco) + ', подтверждение ' + f(k.confirmEco) + '</span>', badge('ill'), 'условные цены как доля ВВП на душу (' + E.int(o.gdppc.v) + ' ' + E.esc(cur.code) + ', ' + o.gdppc.year + ' г.)');
      row('Затраты на лечение инсультов за ' + M.horizon_years + ' лет', f(k.strokeCur) + range(cl.strokeCur, ch.strokeCur, f), f(k.strokeEco) + range(cl.strokeEco, ch.strokeEco, f), badge('ill'), 'первый год после инсульта ≈ ' + M.params.cost_stroke_gdp.v.toLocaleString('ru-RU') + ' ВВП на душу (' + M.params.cost_stroke_gdp.lo.toLocaleString('ru-RU') + '–' + M.params.cost_stroke_gdp.hi.toLocaleString('ru-RU') + ')');
      row('Всего: программа + инсульты', '<strong>' + f(k.totalCur) + '</strong>', '<strong>' + f(k.totalEco) + '</strong>', badge('ill'), '');
      if (k.perAverted != null) row('Чистые доп. затраты на 1 предотвращённый инсульт', '—', f(k.perAverted) + range(cl.perAverted, ch.perAverted, f), badge('ill'), 'без учёта инфарктов, сердечной недостаточности и смертей, которые также предотвращаются');
    } else {
      row('Затраты', '<span class="b b-miss">Нет данных</span>', '<span class="b b-miss">Нет данных</span>', badge('miss'), E.esc(c.no_cost_reason || 'нет данных Всемирного банка о ВВП на душу в национальной валюте'));
    }
    h += '</tbody></table></div>';
    h += '<p id="tbl-note" class="hint"><small>Мелким шрифтом под числом — диапазон: расчёт, когда все параметры сдвинуты в пессимистичную или оптимистичную сторону. Это не статистический доверительный интервал. Проценты охвата — среди всех людей с АГ 30–79 лет (грубые, не стандартизованные по возрасту).</small></p>';

    h += explain(c, r);
    h += sources(c);
    out.innerHTML = title + h;
    out.setAttribute('aria-busy', 'false');
    document.title = c.name + ' — гипертония и инсульт: сравнение с ЭЦО';
  }

  function explain(c, r) {
    var m = r.mid, k = m.costs, cur = c.currency, N = M.horizon_years;
    var s = '<section class="explain" aria-labelledby="ex-h"><h3 id="ex-h" style="margin-top:0">Что это значит простыми словами</h3>';
    s += '<p>В стране «' + E.esc(c.name) + '» примерно у ' + E.people(m.H) + ' взрослых 30–79 лет повышенное давление. Знают об этом ' + E.pct(m.d0) + ', лечатся ' + E.pct(m.t0) + ', а давление в норме лишь у ' + E.pct(m.k0) + ' (данные 2019 г.). Неконтролируемое давление — главный устранимый фактор риска инсульта.</p>';
    if (m.atTarget) {
      s += '<p>Здесь контроль давления уже выше цели, которую мы взяли для сценария ЭЦО. Поэтому модель не показывает дополнительного эффекта: следующая версия будет сравнивать с более высокой целью.</p>';
    } else {
      s += '<p><strong>Решение о финансировании.</strong> Сценарий ЭЦО оплачивает три шага: регулярно измерять давление у взрослых, подтверждать диагноз и давать постоянный доступ к эффективному лечению — до уровня «80-80-80». Тогда давление станет нормальным ещё примерно у ' + E.people(m.dCtrl) + ' человек.</p>';
      s += '<p><strong>Что это даёт людям.</strong> По модели за ' + N + ' лет удаётся избежать около ' + E.people(m.averted) + ' инсультов (диапазон ' + E.people(r.lo.averted) + ' – ' + E.people(r.hi.averted) + '), то есть примерно ' + Math.round(m.averted / m.strokesCur * 100) + '% ожидаемых. Это люди, которые не потеряют речь, подвижность или жизнь из-за инсульта.</p>';
      if (k) {
        var dProg = k.progEco - k.progCur, dStroke = k.strokeCur - k.strokeEco;
        s += '<p><strong>Что это стоит (условно).</strong> Расходы на программу вырастают примерно на ' + E.money(dProg, cur) + ' за ' + N + ' лет, а расходы на лечение инсультов снижаются примерно на ' + E.money(dStroke, cur) + '. ' +
          (dStroke >= dProg ? 'Даже только по инсультам программа окупается.' : 'Только за счёт инсультов программа не окупается: её главный результат — сохранённое здоровье и жизни. Кроме того, контроль давления предотвращает инфаркты и сердечную недостаточность, которые здесь не посчитаны.') +
          ' Цены здесь иллюстративные: для решения нужна местная калькуляция.</p>';
      }
    }
    s += '</section>';
    return s;
  }

  function sources(c) {
    var o = c.obs, s = '<details><summary>Откуда эти цифры (источники и даты)</summary><dl class="src">';
    if (o.pop3079) s += '<dt>Население 30–79 лет: ' + E.int(o.pop3079.v) + ' ' + badge('obs') + '</dt><dd>' + E.esc(M.sources.wb.title) + '. Данные за ' + o.pop3079.year + ' г., загружены ' + E.fdate(M.sources.wb.accessed) + '.</dd>';
    if (o.prev) s += '<dt>Гипертония: доля ' + E.p1(o.prev.v) + ', диагноз ' + (o.diag ? E.p1(o.diag.v) : '—') + ', лечение ' + (o.treat ? E.p1(o.treat.v) : '—') + ', контроль ' + (o.ctrl ? E.p1(o.ctrl.v) : '—') + ' ' + badge('obs') + '</dt><dd>' + E.esc(M.sources.ncdrisc.title) + ', опубл. ' + E.fdate(M.sources.ncdrisc.date) + '. Данные за 2019 г. ' + E.esc(M.sources.ncdrisc.via) + '.</dd>';
    if (o.strokes) s += '<dt>Новые инсульты: ' + E.int(o.strokes.v) + ' в ' + o.strokes.year + ' г.' + (o.strokes.lo ? ' (95% ИН ' + E.int(o.strokes.lo) + '–' + E.int(o.strokes.hi) + ')' : '') + ' ' + badge('obs') + '</dt><dd>' + E.esc(M.sources.gbd21.title) + '. Это модельная оценка GBD, принятая здесь за исходные данные.</dd>';
    if (o.gdppc) s += '<dt>ВВП на душу: ' + E.int(o.gdppc.v) + ' ' + E.esc(c.currency.code) + ' ' + badge('obs') + '</dt><dd>' + E.esc(M.sources.wbgdp.title) + ', ' + o.gdppc.year + ' г. Используется только для пересчёта условных цен в местную валюту.</dd>';
    var x = (M.crosscheck || []).filter(function (z) { return z.iso3 === c.iso3; })[0];
    if (x) s += '<dt>Сверка с национальными данными</dt><dd>' + E.esc(x.national) + ' — <a href="' + E.esc(M.sources[x.src].url) + '">' + E.esc(M.sources[x.src].title) + '</a>, ' + E.fdate(M.sources[x.src].date) + '.</dd>';
    s += '</dl><p><a href="method.html">Как устроен расчёт и какие допущения сделаны →</a></p></details>';
    return s;
  }

  function renderMissing(c) {
    var names = { pop3079: 'население 30–79 лет (Всемирный банк)', prev: 'доля людей с АГ (NCD-RisC/ВОЗ)', diag: 'доля знающих о диагнозе', treat: 'доля лечащихся', ctrl: 'доля с контролируемым давлением', strokes: 'число новых инсультов (GBD 2021)', gdppc: 'ВВП на душу в национальной валюте' };
    var s = '<div class="missing" role="status"><p><span class="b b-miss">Данных пока нет</span></p><p><strong>Для страны «' + E.esc(c.name) + '» сравнение пока не строим</strong>: в открытых первичных источниках не хватает показателей. Мы не подставляем выдуманные числа.</p><p>Не хватает:</p><ul>';
    c.missing.forEach(function (k) { s += '<li>' + names[k] + '</li>'; });
    s += '</ul>';
    var have = Object.keys(c.obs);
    if (have.length) {
      s += '<p>Что есть:</p><ul>';
      if (c.obs.pop3079) s += '<li>Население 30–79 лет: ' + E.people(c.obs.pop3079.v) + ' (' + c.obs.pop3079.year + ' г., Всемирный банк) ' + badge('obs') + '</li>';
      if (c.obs.prev) s += '<li>Доля людей с АГ: ' + E.p1(c.obs.prev.v) + ' (2019 г., NCD-RisC) ' + badge('obs') + '</li>';
      if (c.obs.strokes) s += '<li>Новые инсульты: ' + E.int(c.obs.strokes.v) + ' (2021 г., GBD) ' + badge('obs') + '</li>';
      if (c.obs.gdppc) s += '<li>ВВП на душу: ' + E.int(c.obs.gdppc.v) + ' ' + E.esc(c.currency.code) + ' (' + c.obs.gdppc.year + ' г.) ' + badge('obs') + '</li>';
      s += '</ul>';
    }
    s += '<p>Если у вас есть официальные данные по этой стране, их можно добавить — см. «Методология», раздел «Как обновить данные».</p></div>';
    return s;
  }

  /* ---------- старт ---------- */
  E.load().then(function (d) {
    C = d[0].countries; M = d[1];
    C.forEach(function (c) { byIso[c.iso3] = c; c._s = norm(c.name + ' ' + c.name_en + ' ' + c.iso3 + ' ' + (ALIASES[c.iso3] || '')); });
    var start = byIso[(location.hash || '').slice(1).toUpperCase()] || byIso.RUS;
    input.value = start.name;
    render(start);
  }).catch(function (err) {
    out.innerHTML = '<p class="notice">Не удалось загрузить данные: ' + E.esc(err.message) + '. Если вы открыли файл напрямую с диска, запустите локальный сервер (см. README).</p>';
    out.setAttribute('aria-busy', 'false');
    console.error(err);
  });
})();
