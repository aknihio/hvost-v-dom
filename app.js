/* Хвост в дом — логика сайта (без зависимостей) */
(function () {
  'use strict';

  /* Вставьте сюда ссылку на ваш опрос (Google Forms, Яндекс Формы). Пока строка пустая, блок опроса не показывается. */
  var SURVEY_URL = '';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var rub = function (n) { return Math.round(n).toLocaleString('ru-RU') + ' ₽'; };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };

  /* ============ КВИЗ ============ */
  var QUESTIONS = [
    { key: 'housing', text: 'Где вы живёте?', hint: 'Если квартира съёмная, важно письменное согласие хозяина.',
      opts: [['Снимаю, хозяин не знает или против', 0], ['Снимаю, хозяин не против', 1], ['Своё жильё', 2]] },
    { key: 'space', text: 'Какая площадь жилья?', hint: 'Для собак важен не только метраж, но и возможность выгуливать рядом.',
      opts: [['Менее 30 м²', 0], ['30–60 м²', 1], ['Более 60 м² или дом с участком', 2]] },
    { key: 'time', text: 'Сколько часов в будни вас не бывает дома?', hint: 'Считайте работу или учёбу вместе с дорогой.',
      opts: [['Более 10 часов', 0], ['6–10 часов', 1], ['Менее 6 часов или удалённая работа', 2]] },
    { key: 'budget', text: 'Сколько вы готовы тратить на питомца каждый месяц?', hint: 'Корм, наполнитель, профилактика, мелкие покупки.',
      opts: [['Менее 2 000 ₽', 0], ['2 000 – 5 000 ₽', 1], ['Более 5 000 ₽', 2]] },
    { key: 'reserve', text: 'Есть ли у вас запас на непредвиденное лечение?', hint: 'Приём, анализы и лекарства при болезни могут стоить 10–20 тыс. ₽ и больше.',
      opts: [['Нет, придётся занимать', 0], ['Есть небольшой, до 10 000 ₽', 1], ['Есть от 15 000 ₽ и больше', 2]] },
    { key: 'exp', text: 'Был ли у вас опыт ухода за животным?', hint: 'Подойдёт и опыт семьи, если вы участвовали в уходе.',
      opts: [['Нет', 0], ['Был в детстве или у родных', 1], ['Был свой питомец во взрослом возрасте', 2]] },
    { key: 'family', text: 'Что с домашними?', hint: 'Все, кто живёт с вами, должны быть «за». Аллергия обычно выясняется уже после взятия, поэтому проверьте её заранее.',
      opts: [['Не обсуждали или кто-то против', 0], ['В целом согласны, но аллергию не проверяли', 1], ['Все согласны, аллергии нет или проверена', 2]] },
    { key: 'act', text: 'Какой у вас ритм жизни?', hint: 'Собакам нужно гулять не меньше двух раз в день, и в любую погоду.',
      opts: [['Спокойный, прогулки не люблю', 0], ['Умеренный, час в день пешком', 1], ['Активный, готов гулять 2 часа и больше', 2]] },
    { key: 'commit', text: 'Как насчёт сроков?', hint: 'Кошки живут 12–18 лет, собаки 10–15. Уезд на учёбу, переезд, ребёнок, всё это случается.',
      opts: [['Планы на ближайшие годы неопределённы', 0], ['Скорее всего, ничего не изменится, но не уверен(а)', 1], ['Готов(а) к 10–15 годам и имею запасной план', 2]] }
  ];

  var TAGS = { housing: 'Жильё', space: 'Жильё', time: 'Время', budget: 'Деньги', reserve: 'Деньги', exp: 'Опыт', family: 'Семья', act: 'Образ жизни', commit: 'Планы' };
  var quizState = { i: 0, a: {} };

  function renderQuiz() {
    var box = $('#quizBox');
    if (!box) return;
    if (quizState.i >= QUESTIONS.length) { renderResult(box); return; }
    var q = QUESTIONS[quizState.i];
    var chosen = quizState['p' + q.key];
    var paws = '';
    for (var p = 0; p < QUESTIONS.length; p++) {
      paws += '<svg viewBox="0 0 64 64" class="' + (p < quizState.i ? 'on' : p === quizState.i ? 'now' : '') + '" aria-hidden="true"><use href="#paw"/></svg>';
    }
    var html = '' +
      '<div class="quiz__meta"><span>Вопрос ' + (quizState.i + 1) + ' из ' + QUESTIONS.length + '</span><span class="quiz__tag">' + esc(TAGS[q.key] || '') + '</span></div>' +
      '<div class="paws" role="img" aria-label="Пройдено вопросов: ' + quizState.i + ' из ' + QUESTIONS.length + '">' + paws + '</div>' +
      '<h3 class="q__text">' + esc(q.text) + '</h3>' +
      '<p class="q__hint">' + esc(q.hint) + '</p>' +
      '<div class="opts">';
    q.opts.forEach(function (o, idx) {
      html += '<button type="button" class="opt' + (chosen === idx ? ' sel' : '') + '" data-idx="' + idx + '">' + esc(o[0]) + '</button>';
    });
    html += '</div><div class="quiz__nav">' +
      (quizState.i > 0 ? '<button type="button" class="linkbtn" id="qBack">← Предыдущий вопрос</button>' : '') +
      '</div>';
    box.innerHTML = html;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $$('.opt', box).forEach(function (b) {
      b.addEventListener('click', function () {
        if (quizState.lock) return;
        var idx = +b.getAttribute('data-idx');
        quizState.a[q.key] = q.opts[idx][1];
        quizState['p' + q.key] = idx;
        quizState.lock = true;
        $$('.opt', box).forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel');
        setTimeout(function () {
          quizState.lock = false;
          quizState.i++;
          renderQuiz();
          scrollToQuiz();
        }, reduce ? 0 : 220);
      });
    });
    var back = $('#qBack', box);
    if (back) back.addEventListener('click', function () { quizState.i = Math.max(0, quizState.i - 1); renderQuiz(); });
  }

  function scrollToQuiz() {
    var el = $('#quiz');
    if (!el) return;
    var r = el.getBoundingClientRect();
    if (r.top < 0 || r.top > 200) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }

  function evaluate(a) {
    var keys = ['housing', 'time', 'budget', 'reserve', 'family', 'commit', 'exp'];
    var score = keys.reduce(function (s, k) { return s + (a[k] || 0); }, 0);
    var max = keys.length * 2;
    var level = score >= 11 ? 'hi' : score >= 7 ? 'mid' : 'lo';

    var blockers = [];
    if (a.housing === 0) blockers.push('Получите письменное согласие арендодателя. Без него животное придётся отдавать при первой же проверке.');
    if (a.family === 0) blockers.push('Обсудите решение со всеми, кто живёт с вами, и проверьте аллергию: проведите несколько часов рядом с животным или сдайте анализ.');
    if (a.commit === 0) blockers.push('Питомец живёт 10–15 лет. Если планы на ближайшие годы неопределённы, начните с волонтёрства в приюте или с передержки.');

    var tips = [];
    if (a.reserve === 0) tips.push('Сначала накопите резерв хотя бы 15–20 тыс. ₽ на непредвиденное лечение.');
    if (a.reserve === 1) tips.push('Увеличьте резерв до 15–20 тыс. ₽ на лечение до взятия питомца.');
    if (a.budget === 0) tips.push('Посчитайте реальные расходы в калькуляторе ниже: 2 000 ₽ в месяц на питомца хватает не всегда.');
    if (a.time === 0) tips.push('Подумайте, кто будет заходить к питомцу днём (родственник, выгульщик) и сколько это стоит.');
    if (a.exp === 0) tips.push('Для первого раза выбирайте взрослое спокойное животное с известным характером, а не щенка или котёнка.');

    // подсказка по виду
    var dogOk = a.time >= 1 && a.act >= 1;
    var pet, why, alt = [], avoid = [];
    if (dogOk && a.space === 2 && a.time === 2 && a.act === 2 && a.exp >= 1) {
      pet = 'Взрослая собака среднего размера';
      why = 'У вас есть место, время и активный ритм жизни, поэтому собаке будет с кем и где двигаться.';
      alt = ['Взрослая собака малого размера', 'Взрослая кошка'];
    } else if (dogOk && a.space >= 1) {
      pet = 'Взрослая собака малого или среднего размера (до ~15 кг)';
      why = 'Вы готовы гулять и бываете дома достаточно, а метраж позволяет держать небольшую собаку.';
      alt = ['Взрослая спокойная кошка'];
    } else if (dogOk) {
      pet = 'Взрослая кошка или собака малого размера (до 8 кг)';
      why = 'Места немного, но график подходит. Собаке такого размера хватит небольшой квартиры при хороших прогулках.';
      alt = ['Взрослая кошка'];
    } else {
      pet = 'Взрослая спокойная кошка или кот';
      why = 'При вашем графике и ритме кошка переносит одиночество лучше, чем собака, но день без людей всё равно не должен быть слишком долгим.';
      alt = ['Пара взрослых кошек, которые уже живут вместе (двойные расходы)'];
    }
    if (a.exp === 0 || a.time < 2) avoid.push('Щенок или котёнок: им нужно много времени, особенно в первые месяцы');
    if (a.space < 2 || a.time < 2 || a.act < 2) avoid.push('Крупные энергичные собаки: им нужны место и ежедневная серьёзная нагрузка');
    if (a.exp === 0) avoid.push('Животные со сложным поведением (о нём вам расскажут волонтёры): сначала накопите опыт');

    return { score: score, max: max, level: level, blockers: blockers, tips: tips, pet: pet, why: why, alt: alt, avoid: avoid };
  }

  function renderResult(box) {
    var r = evaluate(quizState.a);
    var meta = {
      hi: ['Готовы', 'Основные условия есть. Осталось подготовить дом и спокойно выбрать животное.'],
      mid: ['Почти готовы', 'Есть сильные стороны, но кое-что стоит решить заранее.'],
      lo: ['Пока рано', 'Сейчас велик риск, что питомец снова окажется в приюте. Но подготовка обычно даёт результат быстро.']
    }[r.level];

    var html = '<div class="res"><div><span class="stamp stamp--' + r.level + '">' + meta[0] + '</span></div>' +
      '<div class="res__score">' + r.score + ' из ' + r.max + '<small>' + meta[1] + '</small></div></div>';

    if (r.blockers.length) {
      html += '<div class="note note--bad"><h4>Решите до визита в приют</h4><ul>' +
        r.blockers.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    }
    html += '<div class="note note--pet"><h4>Вам может подойти</h4><p class="note__pet">' + esc(r.pet) + '</p><p>' + esc(r.why) + '</p>' +
      (r.alt.length ? '<p style="margin-top:8px"><small>Также можно рассмотреть: ' + r.alt.map(esc).join('; ') + '.</small></p>' : '') + '</div>';
    if (r.avoid.length) {
      html += '<div class="note note--warn"><h4>Лучше не брать на первый раз</h4><ul>' +
        r.avoid.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    }
    if (r.tips.length) {
      html += '<div class="note"><h4>Что улучшить</h4><ul>' +
        r.tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    }
    if (r.level !== 'hi') {
      html += '<div class="note"><h4>Хотите попробовать без обязательств?</h4><p>Станьте волонтёром приюта (выгул, фото, помощь на выезде) или возьмите животное на временную передержку. Это лучший способ понять, подходит ли вам такая жизнь.</p></div>';
    }
    if (SURVEY_URL) {
      html += '<div class="note no-print"><h4>Помогите улучшить сайт</h4><p>Ответьте на несколько коротких вопросов, это займёт две минуты.</p>' +
        '<p style="margin-top:10px"><a class="btn btn--yellow btn--sm" href="' + esc(SURVEY_URL) + '" target="_blank" rel="noopener">Пройти опрос</a></p></div>';
    }
    var ans = QUESTIONS.map(function (q) {
      var idx = quizState['p' + q.key];
      return '<li><b>' + esc(q.text) + '</b> ' + esc(idx !== undefined ? q.opts[idx][0] : '') + '</li>';
    }).join('');
    html += '<div class="print-only"><h4>Ваши ответы</h4><ul>' + ans + '</ul></div>';
    html = '<p class="print-only print-head">Хвост в дом. Результат квиза от ' + new Date().toLocaleDateString('ru-RU') + '</p>' + html;
    html += '<div class="res__actions no-print"><a class="btn" href="#calc">Посчитать расходы</a><a class="textlink" href="#lists">Открыть чек-листы</a>' +
      '<button type="button" class="linkbtn" id="qSave">Сохранить результат в PDF</button>' +
      '<button type="button" class="linkbtn" id="qAgain">Пройти квиз заново</button></div>' +
      '<p class="tiny" style="margin:16px 0 0">Квиз даёт ориентир и не заменяет консультацию волонтёров приюта и специалистов.</p>';
    box.innerHTML = html;
    $('#qAgain').addEventListener('click', function () { quizState = { i: 0, a: {} }; renderQuiz(); scrollToQuiz(); });
    $('#qSave').addEventListener('click', function () {
      document.body.classList.add('print-result');
      var done = function () { document.body.classList.remove('print-result'); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      window.print();
    });
  }

  /* ============ КАЛЬКУЛЯТОР ============ */
  var FIELDS = [
    ['food', 'Корм, ₽ в месяц'],
    ['supplies', 'Наполнитель, пелёнки, пакеты, ₽ в месяц'],
    ['vet', 'Ветеринар: осмотр, прививки, паразиты, ₽ в год'],
    ['reserve', 'Резерв на непредвиденное, ₽ в год'],
    ['start', 'Стартовый набор (лежанка, миски, переноска и т. д.), ₽'],
    ['training', 'Дрессировка / консультация специалиста, ₽'],
    ['boardDays', 'Дней в году, когда нужна передержка или няня'],
    ['boardPrice', 'Цена передержки, ₽ за день']
  ];
  /* Ориентировочные значения: опираются на публикации 2025–2026 гг. (см. «Источники»), округлены */
  var PROFILES = {
    cat:  { food: 1500, supplies: 700, vet: 5000,  reserve: 10000, start: 12000, training: 0,     boardDays: 14, boardPrice: 500,  ster: 5000 },
    dogS: { food: 2500, supplies: 400, vet: 7000,  reserve: 15000, start: 15000, training: 8000,  boardDays: 14, boardPrice: 900,  ster: 7000 },
    dogM: { food: 4500, supplies: 500, vet: 10000, reserve: 20000, start: 18000, training: 10000, boardDays: 14, boardPrice: 1100, ster: 9000 },
    dogL: { food: 9000, supplies: 600, vet: 17000, reserve: 30000, start: 25000, training: 15000, boardDays: 14, boardPrice: 1500, ster: 12000 }
  };
  var calcType = 'cat';
  var calcVals = {};

  function renderCalcFields() {
    var wrap = $('#calcFields');
    if (!wrap) return;
    var p = PROFILES[calcType];
    calcVals = {};
    wrap.innerHTML = FIELDS.map(function (f) {
      calcVals[f[0]] = p[f[0]];
      return '<div class="field"><label for="f_' + f[0] + '">' + esc(f[1]) + '</label>' +
        '<input type="number" min="0" step="100" inputmode="numeric" id="f_' + f[0] + '" data-k="' + f[0] + '" value="' + p[f[0]] + '"></div>';
    }).join('');
    $$('input', wrap).forEach(function (inp) {
      inp.addEventListener('input', function () {
        var v = parseFloat(inp.value);
        calcVals[inp.getAttribute('data-k')] = isFinite(v) && v >= 0 ? v : 0;
        updateCalc();
      });
    });
    updateCalc();
  }

  function updateCalc() {
    var v = calcVals;
    var p = PROFILES[calcType];
    var steril = $('#sterDone').checked ? 0 : p.ster;
    var parts = [
      ['Корм', v.food * 12],
      ['Наполнитель и гигиена', v.supplies * 12],
      ['Ветеринар', v.vet],
      ['Резерв', v.reserve],
      ['Передержка / няня', v.boardDays * v.boardPrice],
      ['Стартовый набор', v.start],
      ['Дрессировка', v.training]
    ];
    if (steril) parts.push(['Стерилизация', steril]);
    var total = parts.reduce(function (s, x) { return s + x[1]; }, 0);
    var oneTime = v.start + v.training + steril;
    var monthly = (v.food * 12 + v.supplies * 12 + v.vet + v.reserve + v.boardDays * v.boardPrice) / 12;

    $('#resYear').textContent = rub(total);
    $('#resMonth').textContent = rub(monthly);
    $('#resStart').textContent = rub(oneTime);

    $('#bars').innerHTML = parts.filter(function (x) { return x[1] > 0; }).map(function (x) {
      return '<div class="line"><span>' + esc(x[0]) + '</span><i></i><b>' + rub(x[1]) + '</b></div>';
    }).join('');

    var budget = parseFloat($('#budget').value) || 0;
    var vd = $('#verdict');
    var diff = budget - monthly;
    vd.className = 'verdict';
    if (budget <= 0) {
      vd.textContent = 'Укажите, сколько готовы тратить в месяц, и мы сравним.';
    } else if (diff >= 0) {
      vd.classList.add('ok');
      vd.textContent = 'Ваш бюджет покрывает постоянные расходы с запасом ' + rub(diff) + ' в месяц. Не забудьте и про разовые траты на старте: ' + rub(oneTime) + '.';
    } else if (diff > -0.15 * monthly) {
      vd.classList.add('warn');
      vd.textContent = 'Бюджета почти хватает: не хватает ' + rub(-diff) + ' в месяц. Подумайте, где можно сэкономить, или увеличьте бюджет.';
    } else {
      vd.classList.add('bad');
      vd.textContent = 'Не хватает ' + rub(-diff) + ' в месяц. Лучше пока выбрать более скромный вариант или подготовиться финансово.';
    }
  }

  function initCalc() {
    if (!$('#calcFields')) return;
    $$('input[name="ptype"]').forEach(function (r) {
      r.addEventListener('change', function () { calcType = r.value; renderCalcFields(); });
    });
    $('#sterDone').addEventListener('change', updateCalc);
    $('#budget').addEventListener('input', updateCalc);
    renderCalcFields();
  }

  /* ============ ЧЕК-ЛИСТЫ ============ */
  var LISTS = [
    { id: 'before', title: 'До визита в приют', items: [
      ['Обсудил(а) решение со всеми домашними', 'Если кто-то против, питомец окажется в центре конфликта.'],
      ['Проверил(а) аллергию', 'Проведите несколько часов рядом с животным или сдайте анализ у аллерголога.'],
      ['Есть письменное согласие арендодателя (если съём)', 'Устная договорённость не защитит, если хозяин передумает.'],
      ['Посчитал(а) расходы и отложил(а) резерв', 'Калькулятор выше покажет сумму на первый год.'],
      ['Нашёл(ла) ветклинику рядом и узнал(а) цены', 'Заодно выясните, есть ли круглосуточная помощь.'],
      ['Выбрал(а) 2–3 приюта и прочитал(а) их правила и договор', 'Узнайте, что приют требует при передаче и при возврате.'],
      ['Решил(а), кто будет выгуливать и ухаживать в будни', 'Запишите имя и график: «мы вместе» часто значит «никто».'],
      ['Взял(а) отпуск или свободные дни на первую неделю', 'Первые дни животному нужен человек рядом.'],
      ['Убрал(а) провода, химию, мелкие предметы и ядовитые растения', 'Лилии опасны для кошек. Незнакомые комнатные растения лучше убрать.'],
      ['Закрыл(а) окна и балкон (антикошка-сетка)', 'Обычная москитная сетка кошку не удержит.']
    ] },
    { id: 'week', title: 'Первая неделя', items: [
      ['Привёз(ла) животное в переноске или на шлейке с поводком', 'Кошку везут только в переноске: в руках она может вырваться.'],
      ['Выделил(а) тихое место для сна и укрытия', 'Не вытаскивайте животное из укрытия силой.'],
      ['Корм дал(а) тот же, что был в приюте. Меняю постепенно 7–10 дней', 'Резкая смена корма может вызвать расстройство пищеварения.'],
      ['Показал(а) ветеринару и обсудил(а) прививки и обработку от паразитов', 'Схему вакцинации определяет врач по состоянию животного.'],
      ['Установил(а) режим кормления и прогулок', 'Распорядок помогает животному быстрее привыкнуть.'],
      ['Надел(а) адресник и записал(а) контакты приюта', 'В новом месте животные чаще пытаются убежать.'],
      ['Не устраивал(а) шумных гостей и знакомств', null],
      ['Не оставляю надолго в первые дни', null],
      ['Не наказываю за «ошибки»: животное учится жить в новом доме', null]
    ] },
    { id: 'month', title: 'Первый месяц', items: [
      ['Уточнил(а) в своём регионе требования к чипированию и регистрации', 'Правила зависят от региона: спросите ветслужбу или приют.'],
      ['Прошёл(ла) осмотр и план вакцинации с ветеринаром', null],
      ['Нашёл(ла) замену на случай моего отъезда: няню, передержку или друзей', 'Договоритесь заранее, а не за день до поездки.'],
      ['Занимаюсь командами, консультируюсь с кинологом при необходимости', null],
      ['Подписался(ась) на соцсети приюта и сообщил(а), как дела у питомца', 'Волонтёрам важно знать, что животное прижилось.'],
      ['Оформил(а) заметки: чем кормлю, какие прививки, контакты врача', null],
      ['Оценил(а) расходы за месяц и сравнил(а) с планом', 'Если выходит больше, пересмотрите бюджет сразу.']
    ] }
  ];
  var KEY = 'hvost.lists.v1';

  function renderLists() {
    var box = $('#lists-box');
    if (!box) return;
    var saved = store.get(KEY, {});
    box.innerHTML = LISTS.map(function (l) {
      var done = saved[l.id] || [];
      return '<article class="list list--' + l.id + '" data-id="' + l.id + '">' +
        '<h3>' + esc(l.title) + ' <span class="cnt"></span></h3>' +
        '<div class="meter"><i></i></div><ul>' +
        l.items.map(function (t, i) {
          return '<li><label><input type="checkbox" data-i="' + i + '"' + (done.indexOf(i) > -1 ? ' checked' : '') + '><span><b>' + esc(t[0]) + '</b>' + (t[1] ? '<small class="hint">' + esc(t[1]) + '</small>' : '') + '</span></label></li>';
        }).join('') + '</ul></article>';
    }).join('');
    $$('.list', box).forEach(updateProgress);
    box.addEventListener('change', function (e) {
      if (e.target.type !== 'checkbox') return;
      var list = e.target.closest('.list');
      var id = list.getAttribute('data-id');
      var s = store.get(KEY, {});
      s[id] = $$('input:checked', list).map(function (x) { return +x.getAttribute('data-i'); });
      store.set(KEY, s);
      updateProgress(list);
    });
    $('#resetLists').addEventListener('click', function () {
      store.set(KEY, {});
      renderLists();
    });
    $('#printBtn').addEventListener('click', function () { window.print(); });
  }

  function updateProgress(list) {
    var all = $$('input', list).length;
    var done = $$('input:checked', list).length;
    $('.cnt', list).textContent = done + ' / ' + all;
    $('.meter i', list).style.width = (all ? Math.round(done / all * 100) : 0) + '%';
  }

  /* ============ ОКНО «ПАСПОРТ ПРОЕКТА» ============ */
  function initAbout() {
    var dlg = $('#about');
    if (!dlg) return;
    function open() {
      if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); }
      else { dlg.setAttribute('open', ''); }
      document.body.classList.add('lock');
    }
    function close() {
      if (typeof dlg.close === 'function') { dlg.close(); } else { dlg.removeAttribute('open'); }
    }
    dlg.addEventListener('close', function () {
      document.body.classList.remove('lock');

    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
    $('#aboutClose').addEventListener('click', close);
    $('#aboutX').addEventListener('click', close);
    var openBtn = $('#aboutOpen');
    if (openBtn) openBtn.addEventListener('click', open);


    open(); /* карточка показывается при каждой загрузке страницы */
  }

  function initReceiptMeta() {
    var d = $('#rcDate');
    if (d) d.textContent = new Date().toLocaleDateString('ru-RU');
  }

  /* ============ ДЛЯ ПРИЮТОВ: готовое сообщение ============ */
  function initShelters() {
    var box = $('#shelterText'), btn = $('#copyShelter'), state = $('#copyState');
    if (!box || !btn) return;
    var url = /^https?:/.test(location.protocol) ? location.href.split('#')[0] : '[адрес сайта]';
    var text = 'Здравствуйте! Прежде чем приехать знакомиться с животным, пройдите короткий квиз «Хвост в дом» (3 минуты). ' +
      'Он покажет, к чему стоит подготовиться, и посчитает расходы на первый год. Ссылка: ' + url;
    box.textContent = text;
    btn.addEventListener('click', function () {
      var ok = function () { state.textContent = 'Скопировано'; setTimeout(function () { state.textContent = ''; }, 2500); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, fallback);
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); ok(); } catch (e) { state.textContent = 'Выделите текст и скопируйте вручную'; }
        document.body.removeChild(ta);
      }
    });
  }

  /* ============ СТАРТ ============ */
  renderQuiz();
  initCalc();
  renderLists();
  initReceiptMeta();
  initShelters();
  initAbout();

  // для автотестов
  window.__hvost = { evaluate: evaluate, PROFILES: PROFILES, QUESTIONS: QUESTIONS };
})();
