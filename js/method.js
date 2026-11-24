(function () {
  'use strict';
  var E = window.Eco;
  var KIND = { assumption: '<span class="b b-mod">Допущение</span>', literature: '<span class="b b-obs">Из исследований</span>', illustrative: '<span class="b b-ill">Иллюстрация</span>' };
  function fmt(x, unit) {
    if (x == null) return '—';
    if (unit === 'доля') return Math.round(x * 100) + '%';
    if (unit === 'доля ВВП/чел.') return (x < 0.1 ? (x * 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + '% ВВП на душу' : x.toLocaleString('ru-RU') + ' × ВВП на душу');
    return x.toLocaleString('ru-RU') + (unit ? ' ' + unit : '');
  }
  E.load().then(function (d) {
    var C = d[0].countries, M = d[1];
    // параметры
    var h = '<div class="tablewrap" tabindex="0" role="region" aria-label="Параметры модели, таблица прокручивается по горизонтали"><table><caption>Параметры модели</caption><thead><tr><th scope="col">Параметр</th><th scope="col" class="num">Значение</th><th scope="col" class="num">Диапазон</th><th scope="col">Тип и обоснование</th></tr></thead><tbody>';
    Object.keys(M.params).forEach(function (k) {
      var p = M.params[k];
      var src = (p.src || []).map(function (s) { return '<a href="#src-' + s + '">[' + (Object.keys(M.sources).indexOf(s) + 1) + ']</a>'; }).join(' ');
      h += '<tr><th scope="row">' + E.esc(p.label) + '</th><td class="num">' + fmt(p.v, p.unit) + '</td><td class="num">' + (p.lo != null ? fmt(p.lo, p.unit) + ' – ' + fmt(p.hi, p.unit) : '—') + '</td><td>' + KIND[p.kind] + (p.note ? '<br><small>' + E.esc(p.note) + '</small>' : '') + (src ? ' ' + src : '') + '</td></tr>';
    });
    h += '</tbody></table></div>';
    document.getElementById('params-table').innerHTML = h;
    // сверка
    var byIso = {}; C.forEach(function (c) { byIso[c.iso3] = c; });
    h = '<div class="tablewrap"><table><caption>Новые инсульты в год: GBD 2021 и национальные данные</caption><thead><tr><th scope="col">Страна</th><th scope="col" class="num">GBD 2021 (первые инсульты)</th><th scope="col">Национальные данные</th></tr></thead><tbody>';
    M.crosscheck.forEach(function (x) {
      var c = byIso[x.iso3], s = c.obs.strokes, src = M.sources[x.src];
      h += '<tr><th scope="row">' + E.esc(c.name) + '</th><td class="num">' + E.int(s.v) + (s.lo ? '<span class="rng">' + E.int(s.lo) + '–' + E.int(s.hi) + '</span>' : '') + '</td><td>' + E.esc(x.national) + '<br><small><a href="' + E.esc(src.url) + '">' + E.esc(src.title) + '</a>, ' + E.fdate(src.date) + '</small></td></tr>';
    });
    h += '</tbody></table></div>';
    document.getElementById('check-table').innerHTML = h;
    // покрытие
    var grp = { full: [], model: [], partial: [] };
    C.forEach(function (c) { (c.status === 'none' ? grp.partial : grp[c.status]).push(c.name); });
    document.getElementById('coverage').innerHTML =
      '<p><strong>Полный расчёт (инсульты и затраты): ' + grp.full.length + ' стран.</strong></p>' +
      '<p><strong>Только инсульты, без затрат: ' + grp.model.length + '</strong> — ' + E.esc(grp.model.join(', ')) + '. Причина: нет данных о ВВП в национальной валюте или валюта нестабильна.</p>' +
      '<p><strong>Данных пока нет: ' + grp.partial.length + '</strong> — ' + E.esc(grp.partial.join(', ')) + '.</p>';
    // источники
    document.getElementById('refs').innerHTML = Object.keys(M.sources).map(function (k) {
      var s = M.sources[k];
      return '<li id="src-' + k + '">' + E.esc(s.title) + '. ' + (s.date ? 'Дата публикации/обновления: ' + E.fdate(s.date) + '. ' : '') + (s.data_year ? 'Год данных: ' + s.data_year + '. ' : '') + (s.accessed ? 'Загружено: ' + E.fdate(s.accessed) + '. ' : '') +
        '<a href="' + E.esc(s.url) + '">' + E.esc(s.url) + '</a>' + (s.via ? ' <br><small>' + E.esc(s.via) + '</small>' : '') + '</li>';
    }).join('');
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }).catch(function (e) { console.error(e); });
})();
