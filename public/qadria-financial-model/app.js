(() => {
  'use strict';

  const model = window.QADRIA_FINANCIAL_DATA;
  if (!model) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const integer = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
  const decimal = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const oneDecimal = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const money = (value) => `$${integer.format(Math.round(value))}`;
  const moneyCompact = (value) => {
    const absolute = Math.abs(value);
    if (absolute >= 1_000_000) return `$${decimal.format(value / 1_000_000)} млн`;
    if (absolute >= 1_000) return `$${oneDecimal.format(value / 1_000)} тыс.`;
    return money(value);
  };
  const percent = (value, digits = 0) => `${new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value * 100)}%`;
  const ratio = (value) => `${decimal.format(value)}×`;

  function svgElement(name, attributes = {}, text = '') {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
    if (text) node.textContent = text;
    return node;
  }

  function linePath(points) {
    return points.map((point, index) => `${index ? 'L' : 'M'}${point[0].toFixed(2)},${point[1].toFixed(2)}`).join(' ');
  }

  function niceCeiling(value) {
    const magnitude = 10 ** Math.floor(Math.log10(value));
    return Math.ceil(value / magnitude) * magnitude;
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function renderRevenueMix() {
    const rows = [
      { prefix: 'mix-y1', item: model.annual[0] },
      { prefix: 'mix-y5', item: model.annual[4] },
    ];

    rows.forEach(({ prefix, item }) => {
      const roomShare = item.roomRevenue / item.netRevenue;
      const rentShare = item.rentRevenue / item.netRevenue;
      const bar = document.getElementById(`${prefix}-bar`);
      bar.replaceChildren(
        segment('room', roomShare, percent(roomShare)),
        segment('rent', rentShare, percent(rentShare)),
      );
      bar.setAttribute('aria-label', `Номера ${percent(roomShare)}, аренда ${percent(rentShare)}`);
      setText(`${prefix}-total`, moneyCompact(item.netRevenue));
      setText(`${prefix}-room`, moneyCompact(item.roomRevenue));
      setText(`${prefix}-rent`, moneyCompact(item.rentRevenue));
    });

    function segment(type, share, label) {
      const node = document.createElement('div');
      node.className = `mix-segment mix-segment--${type}`;
      node.style.width = `${share * 100}%`;
      const text = document.createElement('span');
      text.textContent = label;
      node.append(text);
      return node;
    }

    setText('kpi-adr', money(model.inputs.weightedAdr));
    setText('kpi-occ-start', percent(model.annual[0].occupancy));
    setText('kpi-occ-stable', percent(model.annual[4].occupancy));
    setText('kpi-revpar-start', money(model.annual[0].revpar));
    setText('kpi-revpar-stable', money(model.annual[4].revpar));
  }

  function renderAnnualChart() {
    const svg = document.getElementById('annual-chart');
    if (!svg) return;
    const width = 1120;
    const height = 460;
    const margin = { top: 38, right: 42, bottom: 58, left: 86 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const series = [
      { key: 'netRevenue', className: 'net', label: 'Выручка без НДС' },
      { key: 'ebitda', className: 'ebitda', label: 'EBITDA' },
      { key: 'cashAfterDebt', className: 'cash', label: 'Поток после долга' },
    ];
    const maxValue = niceCeiling(Math.max(...model.annual.flatMap((year) => series.map((item) => year[item.key]))) * 1.08);
    const x = (index) => margin.left + (innerWidth * index) / (model.annual.length - 1);
    const y = (value) => margin.top + innerHeight - (value / maxValue) * innerHeight;

    const fragment = document.createDocumentFragment();
    const ticks = 4;
    for (let index = 0; index <= ticks; index += 1) {
      const value = (maxValue * index) / ticks;
      const pos = y(value);
      fragment.append(
        svgElement('line', { x1: margin.left, y1: pos, x2: width - margin.right, y2: pos, class: 'grid-line' }),
        svgElement('text', { x: margin.left - 14, y: pos + 4, class: 'axis-label', 'text-anchor': 'end' }, value === 0 ? '$0' : moneyCompact(value)),
      );
    }

    model.annual.forEach((year, index) => {
      fragment.append(svgElement('text', {
        x: x(index), y: height - 20, class: 'year-label',
      }, String(year.year)));
    });

    series.forEach((item) => {
      const points = model.annual.map((year, index) => [x(index), y(year[item.key])]);
      fragment.append(svgElement('path', {
        d: linePath(points), class: `series-line series-${item.className}`,
      }));
      points.forEach((point, index) => {
        fragment.append(svgElement('circle', {
          cx: point[0], cy: point[1], r: index === 0 || index === points.length - 1 ? 5.2 : 3.8,
          class: `series-dot dot-${item.className}`,
        }));
      });
      const finalPoint = points[points.length - 1];
      fragment.append(svgElement('text', {
        x: finalPoint[0] - 4,
        y: finalPoint[1] - (item.key === 'cashAfterDebt' ? 10 : 12),
        class: 'value-label',
        'text-anchor': 'end',
      }, moneyCompact(model.annual.at(-1)[item.key])));
    });

    svg.replaceChildren(fragment);
    svg.prepend(
      svgElement('title', { id: 'annual-chart-title' }, 'Финансовые показатели Qadria по годам'),
      svgElement('desc', { id: 'annual-chart-desc' }, 'Сравнение выручки без НДС, EBITDA и денежного потока после обслуживания долга за десять лет.'),
    );
  }

  function renderAnnualTable() {
    const body = $('#annual-table tbody');
    if (!body) return;
    const rows = model.annual.map((year) => {
      const row = document.createElement('tr');
      const values = [
        year.year,
        percent(year.occupancy),
        money(year.netRevenue),
        money(year.ebitda),
        money(year.debtService),
        money(year.cashAfterDebt),
        ratio(year.dscr),
      ];
      values.forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      });
      return row;
    });
    body.replaceChildren(...rows);
  }

  function renderDebt() {
    const svg = document.getElementById('debt-chart');
    if (!svg) return;
    const width = 820;
    const height = 410;
    const margin = { top: 35, right: 38, bottom: 55, left: 78 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const pointsData = [{ year: 0, endingDebt: model.inputs.loanAmount }, ...model.annual];
    const maxValue = model.inputs.loanAmount;
    const x = (index) => margin.left + (innerWidth * index) / (pointsData.length - 1);
    const y = (value) => margin.top + innerHeight - (value / maxValue) * innerHeight;
    const points = pointsData.map((item, index) => [x(index), y(item.endingDebt)]);
    const baselineY = y(0);
    const area = `${linePath(points)} L${points.at(-1)[0]},${baselineY} L${points[0][0]},${baselineY} Z`;
    const fragment = document.createDocumentFragment();

    [0, 1_000_000, 2_000_000, 3_000_000, 4_000_000].forEach((value) => {
      const pos = y(value);
      fragment.append(
        svgElement('line', { x1: margin.left, y1: pos, x2: width - margin.right, y2: pos, class: 'grid-line' }),
        svgElement('text', { x: margin.left - 12, y: pos + 4, class: 'axis-label', 'text-anchor': 'end' }, value === 0 ? '$0' : `$${value / 1_000_000} млн`),
      );
    });

    fragment.append(svgElement('path', { d: area, class: 'debt-area' }));
    fragment.append(svgElement('path', { d: linePath(points), class: 'debt-line' }));
    points.forEach((point, index) => {
      fragment.append(svgElement('circle', { cx: point[0], cy: point[1], r: 4.5, class: 'debt-dot' }));
      fragment.append(svgElement('text', { x: point[0], y: height - 19, class: 'year-label' }, String(index)));
    });
    fragment.append(svgElement('text', {
      x: points[0][0] + 7, y: points[0][1] - 12, class: 'value-label', 'text-anchor': 'start',
    }, '$4,0 млн'));
    fragment.append(svgElement('text', {
      x: points.at(-1)[0] - 5, y: points.at(-1)[1] - 12, class: 'value-label', 'text-anchor': 'end',
    }, '$0'));

    svg.replaceChildren(fragment);
    svg.prepend(
      svgElement('title', { id: 'debt-chart-title' }, 'Остаток кредита Qadria по годам'),
      svgElement('desc', { id: 'debt-chart-desc' }, 'Снижение долга с четырёх миллионов долларов до нуля за десять лет.'),
    );

    setText('debt-min-dscr', ratio(model.summary.minimumDscr));
    setText('debt-interest', moneyCompact(model.summary.totalInterest));
    setText('debt-ending', money(model.summary.endingDebt));

    const minimum = Math.min(...model.annual.map((year) => year.dscr));
    const strip = document.getElementById('dscr-strip');
    const cells = model.annual.map((year) => {
      const cell = document.createElement('div');
      if (year.dscr < 1.25) cell.classList.add('is-watch');
      if (Math.abs(year.dscr - minimum) < 1e-9) cell.classList.add('is-min');
      const label = document.createElement('span');
      label.textContent = `Год ${year.year}`;
      const value = document.createElement('strong');
      value.textContent = ratio(year.dscr);
      cell.append(label, value);
      return cell;
    });
    strip.replaceChildren(...cells);
  }

  function calculateOperating(values) {
    const input = model.inputs;
    const year = 3;
    const occupancy = values.occupancy / 100;
    const rentOccupancy = values.rentOccupancy / 100;
    const standardNights = input.standardRooms * 365 * occupancy;
    const improvedNights = input.improvedRooms * 365 * occupancy;
    const occupiedNights = standardNights + improvedNights;
    const quotedRoomRevenue = standardNights * values.standardAdr + improvedNights * values.improvedAdr;
    const quotedRentRevenue = input.rentArea * input.rentRate * 12 * rentOccupancy;
    const vatDivisor = input.ratesIncludeVat ? 1 + input.vatRate : 1;
    const netRoomRevenue = quotedRoomRevenue / vatDivisor;
    const netRentRevenue = quotedRentRevenue / vatDivisor;
    const netRevenue = netRoomRevenue + netRentRevenue;
    const payroll = input.payrollMonthly * 12 * ((1 + input.opexGrowth) ** (year - 1));
    const fixed = (input.utilitiesMonthly + input.fuelMonthly + input.internetMonthly + input.securityMonthly)
      * 12 * ((1 + input.opexGrowth) ** (year - 1));
    const roomVariable = occupiedNights * input.roomVariableCost * ((1 + input.opexGrowth) ** (year - 1));
    const marketing = netRevenue * input.marketingRate;
    const booking = netRoomRevenue * input.bookingShare * input.bookingCommission;
    const administration = netRevenue * input.adminRate;
    const annualDepreciation = input.capex * input.depreciationRate;
    const openingTaxBase = Math.max(0, input.propertyTaxBase - (year - 1) * annualDepreciation);
    const closingTaxBase = Math.max(0, input.propertyTaxBase - year * annualDepreciation);
    const propertyTax = ((openingTaxBase + closingTaxBase) / 2) * input.propertyTaxRate;
    const cashOpex = payroll + fixed + roomVariable + marketing + booking + administration
      + propertyTax + input.landTaxAnnual;
    const ebitda = netRevenue - cashOpex;
    const ffeReserve = netRevenue * input.ffeReserveRate;
    const interest = model.annual[year - 1].interest;
    const pbt = ebitda - annualDepreciation - interest;
    const cit = Math.max(0, pbt) * input.citRate;
    const cfads = ebitda - ffeReserve - cit;
    const debtService = model.annual[year - 1].debtService;
    const cashAfterDebt = cfads - debtService;
    const dscr = debtService > 0 ? cfads / debtService : 0;
    const weightedAdr = (input.standardRooms * values.standardAdr + input.improvedRooms * values.improvedAdr)
      / (input.standardRooms + input.improvedRooms);

    return {
      revpar: weightedAdr * occupancy,
      netRevenue,
      ebitda,
      cfads,
      debtService,
      cashAfterDebt,
      dscr,
    };
  }

  function setupOperatingCalculator() {
    const form = document.getElementById('operating-form');
    if (!form) return;
    const controls = {
      standardAdr: document.getElementById('op-standard'),
      improvedAdr: document.getElementById('op-improved'),
      occupancy: document.getElementById('op-occupancy'),
      rentOccupancy: document.getElementById('op-rent'),
    };

    function values() {
      return Object.fromEntries(Object.entries(controls).map(([key, input]) => [key, Number(input.value)]));
    }

    function render() {
      const selected = values();
      const result = calculateOperating(selected);
      setText('op-standard-output', money(selected.standardAdr));
      setText('op-improved-output', money(selected.improvedAdr));
      setText('op-occupancy-output', `${integer.format(selected.occupancy)}%`);
      setText('op-rent-output', `${integer.format(selected.rentOccupancy)}%`);
      setText('op-dscr', ratio(result.dscr));
      setText('op-revpar', money(result.revpar));
      setText('op-net-revenue', moneyCompact(result.netRevenue));
      setText('op-ebitda', moneyCompact(result.ebitda));
      setText('op-cash-after', moneyCompact(result.cashAfterDebt));

      const note = result.dscr < 1
        ? 'денежного потока не хватает на полное обслуживание долга'
        : `денежный поток покрывает выплаты банку в ${decimal.format(result.dscr)} раза`;
      setText('op-dscr-note', note);
      renderResultBars(result);
      Object.values(controls).forEach(updateRangeProgress);
    }

    function renderResultBars(result) {
      const container = document.getElementById('op-bars');
      const items = [
        ['EBITDA', result.ebitda],
        ['CFADS', result.cfads],
        ['Выплаты банку', result.debtService],
      ];
      const max = Math.max(...items.map((item) => item[1]), 1);
      const bars = items.map(([label, value]) => {
        const row = document.createElement('div');
        row.className = 'result-bar';
        const title = document.createElement('span');
        title.textContent = label;
        const track = document.createElement('div');
        track.className = 'result-bar__track';
        const fill = document.createElement('div');
        fill.className = 'result-bar__fill';
        fill.style.width = `${Math.max(0, value / max) * 100}%`;
        track.append(fill);
        const amount = document.createElement('b');
        amount.textContent = moneyCompact(value);
        row.append(title, track, amount);
        return row;
      });
      container.replaceChildren(...bars);
      container.setAttribute('aria-label', items.map(([label, value]) => `${label}: ${money(value)}`).join('; '));
    }

    function updateRangeProgress(input) {
      const min = Number(input.min);
      const max = Number(input.max);
      const value = Number(input.value);
      const progress = ((value - min) / (max - min)) * 100;
      input.style.setProperty('--progress', `${progress}%`);
    }

    form.addEventListener('input', render);
    form.addEventListener('reset', () => requestAnimationFrame(render));
    render();
  }

  function calculateLoan({ amount, rate, term, grace }) {
    if (![amount, rate, term, grace].every(Number.isFinite) || amount <= 0 || rate < 0 || term <= 0 || grace < 0 || grace >= term) {
      return { valid: false };
    }
    const monthlyRate = rate / 100 / 12;
    const monthlyPrincipal = amount / (term - grace);
    const balances = [amount];
    let balance = amount;
    let totalInterest = 0;

    for (let month = 1; month <= term; month += 1) {
      totalInterest += balance * monthlyRate;
      const principal = month <= grace ? 0 : Math.min(monthlyPrincipal, balance);
      balance -= principal;
      if (balance < 0.01) balance = 0;
      balances.push(balance);
    }

    return {
      valid: true,
      graceInterest: amount * monthlyRate,
      monthlyPrincipal,
      totalInterest,
      totalService: amount + totalInterest,
      endingBalance: balance,
      balances,
    };
  }

  function setupLoanCalculator() {
    const form = document.getElementById('loan-form');
    if (!form) return;
    const fields = {
      amount: document.getElementById('loan-amount'),
      rate: document.getElementById('loan-rate'),
      term: document.getElementById('loan-term'),
      grace: document.getElementById('loan-grace'),
    };
    const helper = $('#loan-result .primary-result small');

    function values() {
      return Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, Number(input.value)]));
    }

    function render() {
      const result = calculateLoan(values());
      if (!result.valid) {
        ['loan-total-interest', 'loan-grace-interest', 'loan-monthly-principal', 'loan-total-service', 'loan-ending']
          .forEach((id) => setText(id, '—'));
        helper.textContent = 'Льготный период должен быть меньше общего срока кредита.';
        document.getElementById('loan-sparkline').replaceChildren();
        return;
      }
      helper.textContent = 'без капитализации процентов';
      setText('loan-total-interest', moneyCompact(result.totalInterest));
      setText('loan-grace-interest', money(result.graceInterest));
      setText('loan-monthly-principal', money(result.monthlyPrincipal));
      setText('loan-total-service', moneyCompact(result.totalService));
      setText('loan-ending', money(result.endingBalance));
      renderLoanSparkline(result.balances);
    }

    form.addEventListener('input', render);
    form.addEventListener('reset', () => requestAnimationFrame(render));
    render();
  }

  function renderLoanSparkline(balances) {
    const svg = document.getElementById('loan-sparkline');
    const width = 560;
    const height = 150;
    const margin = { top: 18, right: 12, bottom: 25, left: 12 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const max = Math.max(...balances, 1);
    const x = (index) => margin.left + (innerWidth * index) / (balances.length - 1);
    const y = (value) => margin.top + innerHeight - (value / max) * innerHeight;
    const points = balances.map((value, index) => [x(index), y(value)]);
    const baseline = margin.top + innerHeight;
    const area = `${linePath(points)} L${points.at(-1)[0]},${baseline} L${points[0][0]},${baseline} Z`;

    svg.replaceChildren(
      svgElement('title', { id: 'loan-sparkline-title' }, 'График остатка кредита для выбранного сценария'),
      svgElement('path', { d: area, class: 'spark-area' }),
      svgElement('path', { d: linePath(points), class: 'spark-line' }),
      svgElement('text', { x: margin.left, y: height - 5, class: 'spark-label' }, 'Начало'),
      svgElement('text', { x: width - margin.right, y: height - 5, class: 'spark-label', 'text-anchor': 'end' }, 'Конец срока'),
    );
  }

  function renderSources() {
    const list = document.getElementById('sources-list');
    if (!list) return;
    const items = model.sources.map((source) => {
      const item = document.createElement('li');
      item.id = `source-${source.id}`;
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = source.title;
      item.append(link);
      return item;
    });
    list.replaceChildren(...items);
  }

  renderRevenueMix();
  renderAnnualChart();
  renderAnnualTable();
  renderDebt();
  setupOperatingCalculator();
  setupLoanCalculator();
  renderSources();
})();
