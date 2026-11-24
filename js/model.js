/* Модель ЭЦО: гипертония → инсульт. Полностью прозрачна: все формулы здесь и на странице «Методология». */
(function (root) {
  'use strict';

  function pick(p, which) { // which: 'v' | 'lo' | 'hi'
    if (typeof p !== 'object' || p === null) return p;
    return (p[which] != null ? p[which] : p.v);
  }

  /**
   * Расчёт для одной страны.
   * c    — запись страны из countries.json
   * M    — model.json
   * epi  — 'v' | 'lo' | 'hi' (набор эпидемиологических параметров: центр/низ/верх)
   * cost — 'v' | 'lo' | 'hi' (набор стоимостных параметров)
   */
  function compute(c, M, epi, cost) {
    epi = epi || 'v'; cost = cost || 'v';
    var o = c.obs, P = M.params, T = M.target, N = M.horizon_years, ramp = M.ramp;
    var need = ['pop3079', 'prev', 'diag', 'treat', 'ctrl', 'strokes'];
    for (var i = 0; i < need.length; i++) if (!o[need[i]]) return null;

    var pop = o.pop3079.v;
    // распространённость: для нижней границы эффекта берём нижнюю границу ИН, для верхней — верхнюю
    var prev = pick(o.prev, epi) / 100;
    var d0 = o.diag.v / 100, t0 = o.treat.v / 100, k0 = o.ctrl.v / 100;
    var H = pop * prev;                              // люди с АГ, 30–79
    var atTarget = k0 >= T.ctrl;
    // если контроль уже на уровне цели, сценарий ЭЦО = текущая ситуация (без доп. эффекта и затрат)
    var d1 = atTarget ? d0 : Math.max(d0, T.diag), t1 = atTarget ? t0 : Math.max(t0, T.treat), k1 = atTarget ? k0 : Math.max(k0, T.ctrl);
    // интенсивность доп. скрининга: доля взрослых без диагноза, которых нужно обследовать, пропорциональна разрыву до цели
    var sInt = d0 < 1 ? (d1 - d0) / (1 - d0) : 0;

    var strokesAll = pick(o.strokes, epi);           // новые инсульты в год, все возрасты (GBD 2021)
    var fAge = pick(P.f_age, epi), RR = pick(P.rr_unc, epi), RRR = pick(P.rrr, epi);
    var S = strokesAll * fAge;                       // инсульты в год, 30–79
    var u = prev * (1 - k0);                         // доля взрослых 30–79 с неконтролируемой АГ
    var rAvg = S / pop;
    var rUnc = rAvg * RR / (1 + u * (RR - 1));       // годовой риск у человека с неконтролируемой АГ
    var dCtrl = H * (k1 - k0);                       // дополнительно контролируемых при полном охвате
    var avertFull = dCtrl * rUnc * RRR;              // предотвращённых инсультов в год при полном охвате

    var effYears = 0, sumTreat = 0, sumScreen = 0, sumIntens = 0;
    for (var y = 0; y < N; y++) {
      var r = ramp[y] != null ? ramp[y] : 1;
      effYears += r;
      sumTreat += H * (t0 + (t1 - t0) * r);          // пациенто-лет лечения в сценарии ЭЦО
      sumIntens += dCtrl * r;                        // пациенто-лет интенсификации (доведение до целевого давления)
      var dy = d0 + (d1 - d0) * r;
      sumScreen += (pop - H * dy) * sInt / pick(P.screen_interval, 'v'); // доп. измерений давления в год
    }
    var strokesCur = S * N;
    var averted = avertFull * effYears;
    var strokesEco = strokesCur - averted;

    var res = {
      pop: pop, prev: prev, H: H, d0: d0, t0: t0, k0: k0, d1: d1, t1: t1, k1: k1,
      ctrl0: H * k0, ctrl1: H * k1, dCtrl: dCtrl, treated0: H * t0, treated1: H * t1,
      diag0: H * d0, diag1: H * d1,
      S: S, rUnc: rUnc, avertFull: avertFull, effYears: effYears,
      strokesCur: strokesCur, strokesEco: strokesEco, averted: averted,
      atTarget: atTarget, sInt: sInt, costs: null
    };

    if (o.gdppc) {
      var g = o.gdppc.v;
      var cT = g * pick(P.cost_treat_gdp, cost), cS = g * pick(P.cost_screen_gdp, cost),
          cC = g * pick(P.cost_confirm_gdp, cost), cK = g * pick(P.cost_stroke_gdp, cost);
      var progCur = H * t0 * N * cT;
      var intensEco = sumIntens * cT * pick(P.intensify_share, cost);
      var treatEco = sumTreat * cT + intensEco;
      var screenEco = sumScreen * cS;
      var confirmEco = H * (d1 - d0) * pick(P.confirm_ratio, 'v') * cC;
      var progEco = treatEco + screenEco + confirmEco;
      var strokeCostCur = strokesCur * cK, strokeCostEco = strokesEco * cK;
      res.costs = {
        progCur: progCur, progEco: progEco, treatEco: treatEco, intensEco: intensEco, screenEco: screenEco, confirmEco: confirmEco,
        strokeCur: strokeCostCur, strokeEco: strokeCostEco,
        totalCur: progCur + strokeCostCur, totalEco: progEco + strokeCostEco,
        perAverted: averted > 0 ? ((progEco - progCur) - (strokeCostCur - strokeCostEco)) / averted : null
      };
    }
    return res;
  }

  /** Центральная оценка + диапазон: «низ» — все параметры в сторону меньшего эффекта, «верх» — большего. */
  function run(c, M) {
    var mid = compute(c, M, 'v', 'v');
    if (!mid) return null;
    return { mid: mid, lo: compute(c, M, 'lo', 'v'), hi: compute(c, M, 'hi', 'v'),
             costLo: compute(c, M, 'v', 'lo'), costHi: compute(c, M, 'v', 'hi') };
  }

  root.EcoModel = { compute: compute, run: run };
})(typeof window !== 'undefined' ? window : globalThis);
