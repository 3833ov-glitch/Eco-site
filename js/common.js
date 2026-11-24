/* Общие функции форматирования и загрузки данных */
(function (root) {
  'use strict';
  var nf0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

  function sig(n, d) { // округление до d значащих цифр
    if (!isFinite(n) || n === 0) return n;
    var p = Math.pow(10, d - Math.ceil(Math.log10(Math.abs(n))));
    return Math.round(n * p) / p;
  }
  function int(n) { return nf0.format(Math.round(n)); }
  function approx(n) { return nf0.format(sig(n, 3)); }
  function people(n) {
    var a = Math.abs(n);
    if (a >= 1e9) return nf1.format(sig(n, 3) / 1e9) + ' млрд';
    if (a >= 1e6) return nf1.format(sig(n, 3) / 1e6) + ' млн';
    if (a >= 1e4) return nf0.format(sig(n, 3) / 1e3) + ' тыс.';
    return nf0.format(sig(n, 2));
  }
  function p1(x) { return nf1.format(x) + '%'; }
  function pct(x) { return nf0.format(Math.round(x * 100)) + '%'; }
  function money(n, cur) {
    if (n == null || !isFinite(n)) return '—';
    var sym = cur ? (cur.symbol && cur.symbol !== cur.code ? cur.symbol : cur.code) : '';
    var a = Math.abs(n), s;
    if (a >= 1e12) s = nf1.format(sig(n, 3) / 1e12) + ' трлн';
    else if (a >= 1e9) s = nf1.format(sig(n, 3) / 1e9) + ' млрд';
    else if (a >= 1e6) s = nf1.format(sig(n, 3) / 1e6) + ' млн';
    else if (a >= 1e3) s = nf0.format(sig(n, 3) / 1e3) + ' тыс.';
    else s = nf0.format(sig(n, 3));
    return s + '\u00a0' + sym;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fdate(d) { // 2021-08-24 → 24.08.2021; 2024-10 → 10.2024
    if (!d) return '';
    var p = String(d).split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : (p.length === 2 ? p[1] + '.' + p[0] : p[0]);
  }
  function load() {
    return Promise.all([
      fetch('data/countries.json').then(function (r) { if (!r.ok) throw new Error('countries.json ' + r.status); return r.json(); }),
      fetch('data/model.json').then(function (r) { if (!r.ok) throw new Error('model.json ' + r.status); return r.json(); })
    ]);
  }
  root.Eco = { sig: sig, int: int, approx: approx, people: people, pct: pct, p1: p1, money: money, esc: esc, fdate: fdate, load: load };
})(window);
