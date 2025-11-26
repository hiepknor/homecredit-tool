const DEFAULT_CONFIG = {
  price: 15000000,
  downPaymentPercent: 30,
  monthlyRate: 2.5,
  months: 6,
  extraFees: 0,
  method: 'flat'
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['homeCreditCalc'], (data) => {
    if (!data.homeCreditCalc) {
      chrome.storage.sync.set({ homeCreditCalc: DEFAULT_CONFIG });
    }
  });
});

// Không cần thêm logic nền; popup sẽ xử lý việc tính toán.
