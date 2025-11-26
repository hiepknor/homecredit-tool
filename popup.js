const DEFAULT_STATE = {
  price: 15000000,
  downPaymentAmount: 3000000,
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

const elements = {};

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
    'scheduleBody',
    'methodHint'
  ].forEach((id) => {
    elements[id] = document.getElementById(id);
  });

  loadState();
});

function toNumber(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value) {
  return currencyFormatter.format(Math.max(0, Math.round(value)));
}

function loadState() {
  chrome.storage.sync.get(['homeCreditCalc'], (data) => {
    const state = normalizeState({ ...DEFAULT_STATE, ...(data.homeCreditCalc || {}) });
    setInputs(state);
    updateStateFromInputs(state);
    calculate(state);
    attachListeners(state);
  });
}

function normalizeState(state) {
  if (state.downPaymentPercent !== undefined && state.downPaymentAmount === undefined) {
    state.downPaymentAmount = Math.min(
      state.price,
      Math.max(0, (state.price * state.downPaymentPercent) / 100)
    );
    delete state.downPaymentPercent;
  }

  if (!Number.isFinite(state.downPaymentAmount)) {
    state.downPaymentAmount = 0;
  }

  return state;
}

function setInputs(state) {
  elements.price.value = state.price;
  elements.downPayment.value = state.downPaymentAmount;
  elements.monthlyRate.value = state.monthlyRate;
  elements.months.value = state.months;
  elements.extraFees.value = state.extraFees;
  elements.method.value = state.method;
}

function attachListeners(state) {
  const inputs = ['price', 'downPayment', 'monthlyRate', 'months', 'extraFees'];
  inputs.forEach((id) => {
    elements[id].addEventListener('input', () => {
      updateStateFromInputs(state);
      calculate(state);
      saveState(state);
    });
  });

  elements.method.addEventListener('change', () => {
    state.method = elements.method.value;
    calculate(state);
    saveState(state);
  });
}

function updateStateFromInputs(state) {
  state.price = Math.max(0, toNumber(elements.price.value));
  state.downPaymentAmount = Math.max(
    0,
    Math.min(state.price, toNumber(elements.downPayment.value))
  );
  state.monthlyRate = Math.max(0, toNumber(elements.monthlyRate.value));
  state.months = Math.min(
    120,
    Math.max(1, Math.round(toNumber(elements.months.value) || 1))
  );
  state.extraFees = Math.max(0, toNumber(elements.extraFees.value));

  // Normalize inputs in the UI to keep things tidy
  elements.price.value = state.price;
  elements.downPayment.value = state.downPaymentAmount;
  elements.monthlyRate.value = state.monthlyRate;
  elements.months.value = state.months;
  elements.extraFees.value = state.extraFees;
}

function saveState(state) {
  chrome.storage.sync.set({ homeCreditCalc: state });
}

function calculate(state) {
  const { price, downPaymentAmount, monthlyRate, months, extraFees, method } =
    state;

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

  renderSummary(principal, calculation);
  renderSchedule(calculation.schedule);
  renderNotes({ price, downPayment, principal, extraFees, method });
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

    schedule.push({
      month: i,
      payment,
      principal: principalPaid,
      interest,
      balance
    });
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

    schedule.push({
      month: i,
      payment: monthlyPayment,
      principal: principalPaid,
      interest,
      balance
    });
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

function renderSchedule(fullSchedule) {
  const tbody = elements.scheduleBody;
  tbody.innerHTML = '';

  if (!fullSchedule.length) {
    const row = document.createElement('tr');
    row.innerHTML =
      '<td colspan="5" style="text-align:center; color:#6b7280;">Nhập đủ dữ liệu để xem lịch góp</td>';
    tbody.appendChild(row);
    return;
  }

  const rowsToShow = fullSchedule.slice(0, 12);
  rowsToShow.forEach((row) => {
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
    return;
  }

  elements.downPaymentNote.textContent = `Trả trước khoảng ${formatCurrency(
    downPayment
  )}, phí cộng thêm ${formatCurrency(extraFees)}. Khoản vay tính toán: ${formatCurrency(
    principal
  )}.`;

  elements.methodHint.textContent =
    method === 'reducing'
      ? 'Dư nợ giảm dần: lãi giảm, tổng góp giữ nguyên.'
      : 'Lãi phẳng: gốc chia đều, lãi cố định hàng tháng.';
}

function renderEmpty() {
  elements.loanAmount.textContent = '-';
  elements.monthlyPayment.textContent = '-';
  elements.totalInterest.textContent = '-';
  elements.totalCost.textContent = '-';
  elements.scheduleBody.innerHTML =
    '<tr><td colspan="5" style="text-align:center; color:#6b7280;">Nhập giá sản phẩm và kỳ hạn để tính</td></tr>';
  elements.downPaymentNote.textContent = '';
  elements.methodHint.textContent = '';
}
