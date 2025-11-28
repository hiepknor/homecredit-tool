const MAX_MONTHS = 120;
const DOWN_PAYMENT_PERCENT_MAX = 95;
const PRESET_ACTIVE_TIMEOUT = 1800;

const DEFAULT_STATE = {
  price: 15000000,
  downPaymentMode: 'amount',
  downPaymentAmount: 3000000,
  downPaymentPercent: 20,
  monthlyRate: 2.5,
  months: 6,
  extraFees: 0,
  method: 'flat'
};

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
});

const integerFormatter = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 0
});

const elements = {};
let currentCalculation = null;
let presetTimeout = null;
let toastTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
  [
    'price',
    'downPayment',
    'monthlyRate',
    'months',
    'extraFees',
    'method',
    'loanAmount',
    'monthlyPayment',
    'totalInterest',
    'totalCost',
    'downPaymentNote',
    'downPaymentToggle',
    'downPaymentHelper',
    'scheduleBody',
    'methodHint',
    'insight',
    'copySummary',
    'downloadCsv',
    'toast'
  ].forEach((id) => {
    elements[id] = document.getElementById(id);
  });

  elements.presetButtons = Array.from(document.querySelectorAll('.preset'));

  loadState();
});

function loadState() {
  chrome.storage.sync.get(['homeCreditCalc'], (data) => {
    const persisted = data.homeCreditCalc || {};
    const state = normalizeState({ ...DEFAULT_STATE, ...persisted });
    setInputs(state);
    updateStateFromInputs(state);
    calculate(state);
    attachListeners(state);
    setupPresets(state);
    setupActions();
  });
}

function normalizeState(state) {
  if (!['amount', 'percent'].includes(state.downPaymentMode)) {
    state.downPaymentMode = 'amount';
  }

  if (!Number.isFinite(state.downPaymentAmount)) {
    state.downPaymentAmount = 0;
  }

  if (!Number.isFinite(state.downPaymentPercent)) {
    state.downPaymentPercent = state.price
      ? (state.downPaymentAmount / state.price) * 100
      : 0;
  }

  state.downPaymentPercent = clamp(state.downPaymentPercent, 0, DOWN_PAYMENT_PERCENT_MAX);

  return state;
}

function setInputs(state) {
  setCurrencyInputValue(elements.price, state.price);
  setDownPaymentInput(state);
  elements.monthlyRate.value = state.monthlyRate;
  elements.months.value = state.months;
  setCurrencyInputValue(elements.extraFees, state.extraFees);
  elements.method.value = state.method;
  updateDownPaymentToggle(state);
  updateDownPaymentHelper(state);
}

function attachListeners(state) {
  if (elements.price) {
    elements.price.addEventListener('input', () => {
      updateStateFromInputs(state);
      calculate(state);
      saveState(state);
    });
  }

  if (elements.downPayment) {
    elements.downPayment.addEventListener('input', () => {
      updateStateFromInputs(state);
      calculate(state);
      saveState(state);
    });
  }

  ['monthlyRate', 'months'].forEach((id) => {
    if (!elements[id]) return;
    elements[id].addEventListener('input', () => {
      updateStateFromInputs(state);
      calculate(state);
      saveState(state);
    });
  });

  if (elements.extraFees) {
    elements.extraFees.addEventListener('input', () => {
      updateStateFromInputs(state);
      calculate(state);
      saveState(state);
    });
  }

  if (elements.method) {
    elements.method.addEventListener('change', () => {
      state.method = elements.method.value;
      calculate(state);
      saveState(state);
    });
  }

  if (elements.downPaymentToggle) {
    elements.downPaymentToggle.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const { mode } = btn.dataset;
        if (!mode || mode === state.downPaymentMode) return;
        state.downPaymentMode = mode;
        setDownPaymentInput(state);
        updateDownPaymentToggle(state);
        updateStateFromInputs(state);
        calculate(state);
        saveState(state);
      });
    });
  }
}

function setupPresets(state) {
  if (!elements.presetButtons?.length) return;
  elements.presetButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyPreset(state, button);
      highlightPreset(button);
    });
  });
}

function applyPreset(state, button) {
  const { price, down, rate, months, fees, method } = button.dataset;

  if (price) {
    state.price = Math.max(0, toNumber(price));
  }
  if (down !== undefined) {
    state.downPaymentMode = 'percent';
    state.downPaymentPercent = clamp(toNumber(down), 0, DOWN_PAYMENT_PERCENT_MAX);
    state.downPaymentAmount = state.price
      ? Math.round((state.price * state.downPaymentPercent) / 100)
      : 0;
  }
  if (rate) {
    state.monthlyRate = Math.max(0, toNumber(rate));
  }
  if (months) {
    state.months = clamp(Math.round(toNumber(months)), 1, MAX_MONTHS);
  }
  if (fees !== undefined) {
    state.extraFees = Math.max(0, toNumber(fees));
  }
  if (method) {
    state.method = method;
  }

  setInputs(state);
  updateStateFromInputs(state);
  calculate(state);
  saveState(state);
  showToast('Đã áp dụng gợi ý nhanh ✨');
}

function highlightPreset(activeButton) {
  if (!elements.presetButtons) return;
  elements.presetButtons.forEach((btn) => {
    btn.classList.toggle('active', btn === activeButton);
  });
  clearTimeout(presetTimeout);
  presetTimeout = setTimeout(() => {
    activeButton.classList.remove('active');
  }, PRESET_ACTIVE_TIMEOUT);
}

function setupActions() {
  if (elements.copySummary) {
    elements.copySummary.addEventListener('click', copySummary);
  }
  if (elements.downloadCsv) {
    elements.downloadCsv.addEventListener('click', downloadScheduleCsv);
  }
}

function updateStateFromInputs(state) {
  state.price = Math.max(0, parseCurrencyInput(elements.price.value));
  state.monthlyRate = Math.max(0, toNumber(elements.monthlyRate.value));
  state.months = clamp(Math.round(toNumber(elements.months.value) || 1), 1, MAX_MONTHS);
  state.extraFees = Math.max(0, parseCurrencyInput(elements.extraFees.value));

  if (state.downPaymentMode === 'percent') {
    state.downPaymentPercent = clamp(toNumber(elements.downPayment.value), 0, DOWN_PAYMENT_PERCENT_MAX);
    state.downPaymentAmount = state.price
      ? Math.round((state.price * state.downPaymentPercent) / 100)
      : 0;
  } else {
    const maxDown = state.price || Number.MAX_SAFE_INTEGER;
    state.downPaymentAmount = clamp(parseCurrencyInput(elements.downPayment.value), 0, maxDown);
    state.downPaymentPercent = state.price
      ? clamp((state.downPaymentAmount / state.price) * 100, 0, DOWN_PAYMENT_PERCENT_MAX)
      : 0;
  }

  setCurrencyInputValue(elements.price, state.price);
  setCurrencyInputValue(elements.extraFees, state.extraFees);
  setDownPaymentInput(state);
  updateDownPaymentHelper(state);
}

function calculate(state) {
  const { price, downPaymentAmount, monthlyRate, months, extraFees, method } = state;

  if (!price || !months) {
    renderEmpty();
    return;
  }

  const downPayment = Math.min(price, downPaymentAmount);
  const principal = Math.max(price - downPayment + extraFees, 0);

  const calculation =
    method === 'reducing'
      ? calculateReducing(principal, months, monthlyRate)
      : calculateFlat(principal, months, monthlyRate);

  currentCalculation = {
    price,
    downPayment,
    extraFees,
    monthlyRate,
    months,
    method,
    principal,
    payment: calculation.payment,
    totalInterest: calculation.totalInterest,
    totalPayment: calculation.totalPayment,
    schedule: calculation.schedule
  };

  renderSummary(principal, calculation);
  renderNotes({ price, downPayment, principal, extraFees, method });
  renderSchedule(calculation.schedule);
  renderInsights(state, calculation, downPayment);
}

function calculateFlat(principal, months, monthlyRate) {
  const rate = monthlyRate / 100;
  const monthlyInterest = principal * rate;
  const monthlyPrincipal = months ? principal / months : principal;
  const payment = monthlyPrincipal + monthlyInterest;

  let balance = principal;
  let totalInterest = 0;
  const schedule = [];

  for (let i = 1; i <= months; i += 1) {
    const interest = monthlyInterest;
    const principalPaid = Math.min(monthlyPrincipal, balance);
    balance = Math.max(0, balance - principalPaid);
    schedule.push({ month: i, payment, principal: principalPaid, interest, balance });
    totalInterest += interest;
  }

  return {
    payment,
    totalInterest,
    totalPayment: payment * months,
    schedule
  };
}

function calculateReducing(principal, months, monthlyRate) {
  const rate = monthlyRate / 100;
  const monthlyPayment =
    rate === 0
      ? principal / months
      : (principal * rate * Math.pow(1 + rate, months)) /
        (Math.pow(1 + rate, months) - 1);

  let balance = principal;
  let totalInterest = 0;
  const schedule = [];

  for (let i = 1; i <= months; i += 1) {
    const interest = balance * rate;
    const principalPaid = Math.min(monthlyPayment - interest, balance);
    balance = Math.max(0, balance - principalPaid);
    schedule.push({ month: i, payment: monthlyPayment, principal: principalPaid, interest, balance });
    totalInterest += interest;
  }

  return {
    payment: monthlyPayment,
    totalInterest,
    totalPayment: monthlyPayment * months,
    schedule
  };
}

function renderSummary(principal, calculation) {
  elements.loanAmount.textContent = formatCurrency(principal);
  elements.monthlyPayment.textContent = formatCurrency(calculation.payment);
  elements.totalInterest.textContent = formatCurrency(calculation.totalInterest);
  elements.totalCost.textContent = formatCurrency(calculation.totalPayment);
}

function renderSchedule(rows) {
  const tbody = elements.scheduleBody;
  tbody.innerHTML = '';

  if (!rows.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="5" style="text-align:center; color:#94a3b8;">Nhập dữ liệu để xem lịch góp</td>';
    tbody.appendChild(tr);
    return;
  }

  rows.slice(0, 12).forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.month}</td>
      <td>${formatCurrency(row.payment)}</td>
      <td>${formatCurrency(row.principal)}</td>
      <td>${formatCurrency(row.interest)}</td>
      <td>${formatCurrency(row.balance)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderNotes({ price, downPayment, principal, extraFees, method }) {
  if (!price) {
    elements.downPaymentNote.textContent = 'Nhập giá sản phẩm để bắt đầu tính.';
    elements.methodHint.textContent = '';
    return;
  }

  const downPercent = price ? (downPayment / price) * 100 : 0;
  elements.downPaymentNote.textContent = `Trả trước ${downPercent.toFixed(1)}% (~${formatCurrency(
    downPayment
  )}), phí cộng thêm ${formatCurrency(extraFees)}. Khoản vay ước tính ${formatCurrency(principal)}.`;

  elements.methodHint.textContent =
    method === 'reducing'
      ? 'Dư nợ giảm dần'
      : 'Lãi phẳng';
}

function renderInsights(state, calculation, downPayment) {
  if (!elements.insight || !state.price) return;

  const interestShare = state.price ? (calculation.totalInterest / state.price) * 100 : 0;
  const downPercent = state.price ? (downPayment / state.price) * 100 : 0;
  const totalOutlay = downPayment + state.extraFees + calculation.totalPayment;

  const methodCopy =
    state.method === 'reducing'
      ? 'Dư nợ giảm dần: tổng góp giữ nguyên, lãi giảm dần.'
      : 'Lãi phẳng: gốc chia đều, lãi cố định mỗi kỳ.';

  elements.insight.textContent = `Trả trước ${downPercent.toFixed(1)}% (${formatCurrency(
    downPayment
  )}), lãi tương đương ${interestShare.toFixed(1)}% giá sản phẩm. Tổng chi dự kiến ${formatCurrency(
    totalOutlay
  )}. ${methodCopy}`;
}

function renderEmpty() {
  elements.loanAmount.textContent = '-';
  elements.monthlyPayment.textContent = '-';
  elements.totalInterest.textContent = '-';
  elements.totalCost.textContent = '-';
  elements.scheduleBody.innerHTML =
    '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">Nhập giá sản phẩm và kỳ hạn để tính</td></tr>';
  elements.downPaymentNote.textContent = '';
  elements.methodHint.textContent = '';
  if (elements.insight) {
    elements.insight.textContent = '';
  }
  currentCalculation = null;
}

function copySummary() {
  if (!currentCalculation) {
    showToast('Nhập thông số trước khi sao chép.');
    return;
  }

  const { price, downPayment, extraFees, months, monthlyRate, method, principal, payment, totalInterest, totalPayment } =
    currentCalculation;

  const downPercent = price ? (downPayment / price) * 100 : 0;
  const summary = [
    'TÍNH TRẢ GÓP HOME CREDIT',
    `Giá sản phẩm: ${formatCurrency(price)}`,
    `Trả trước: ${formatCurrency(downPayment)} (${downPercent.toFixed(1)}%)`,
    `Phí hồ sơ/bảo hiểm: ${formatCurrency(extraFees)}`,
    `Kỳ hạn: ${months} tháng · Lãi suất: ${monthlyRate}%/tháng`,
    `Kiểu tính: ${method === 'reducing' ? 'Dư nợ giảm dần' : 'Lãi phẳng'}`,
    '',
    `Khoản vay: ${formatCurrency(principal)}`,
    `Góp mỗi tháng: ${formatCurrency(payment)}`,
    `Tổng lãi: ${formatCurrency(totalInterest)}`,
    `Tổng phải trả: ${formatCurrency(totalPayment)}`
  ].join('\n');

  navigator.clipboard?.writeText(summary)
    ?.then(() => showToast('Đã sao chép tóm tắt ✨'))
    .catch(() => fallbackCopy(summary));
}

function downloadScheduleCsv() {
  if (!currentCalculation?.schedule?.length) {
    showToast('Chưa có lịch góp để xuất.');
    return;
  }

  const header = 'Tháng,Góp,Gốc,Lãi,Dư_nợ';
  const rows = currentCalculation.schedule.map((row) => [
    row.month,
    Math.round(row.payment),
    Math.round(row.principal),
    Math.round(row.interest),
    Math.round(row.balance)
  ].join(','));

  const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `home-credit-schedule-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('Đã xuất lịch góp (.csv)');
}

function saveState(state) {
  chrome.storage.sync.set({ homeCreditCalc: state });
}

function setDownPaymentInput(state) {
  if (state.downPaymentMode === 'percent') {
    elements.downPayment.value = roundTo(state.downPaymentPercent, 1);
    elements.downPayment.placeholder = 'vd: 30 (%)';
    elements.downPayment.inputMode = 'decimal';
  } else {
    setCurrencyInputValue(elements.downPayment, state.downPaymentAmount);
    elements.downPayment.placeholder = 'vd: 3.000.000';
    elements.downPayment.inputMode = 'numeric';
  }
}

function updateDownPaymentToggle(state) {
  if (!elements.downPaymentToggle) return;
  elements.downPaymentToggle.querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === state.downPaymentMode);
  });
}

function updateDownPaymentHelper(state) {
  if (!elements.downPaymentHelper) return;
  if (!state.price) {
    elements.downPaymentHelper.textContent = 'Nhập giá sản phẩm để bắt đầu tính.';
    return;
  }
  const percent = state.price ? (state.downPaymentAmount / state.price) * 100 : 0;
  elements.downPaymentHelper.textContent =
    state.downPaymentMode === 'percent'
      ? `≈ ${formatCurrency(state.downPaymentAmount)} (${percent.toFixed(1)}% giá trị).`
      : `${percent.toFixed(1)}% giá trị sản phẩm.`;
}

function formatCurrency(value) {
  return currencyFormatter.format(Math.max(0, Math.round(value)));
}

function toNumber(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function parseCurrencyInput(value) {
  if (typeof value !== 'string') {
    value = value != null ? String(value) : '';
  }
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number.parseInt(digits, 10) : 0;
}

function setCurrencyInputValue(input, value) {
  if (!input) return;
  const formatted = integerFormatter.format(Math.max(0, Number(value) || 0));
  input.value = formatted === '0' ? '' : formatted;
}

function clamp(value, min, max) {
  const num = Number.isFinite(value) ? value : 0;
  if (Number.isFinite(max)) {
    return Math.min(Math.max(num, min), max);
  }
  return Math.max(num, min);
}

function roundTo(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function showToast(message) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 2200);
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showToast('Đã sao chép tóm tắt ✨');
  } catch (err) {
    showToast('Không thể sao chép, thử lại.');
  }
  document.body.removeChild(textarea);
}
