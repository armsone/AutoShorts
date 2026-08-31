const STORAGE_KEY = "autoShortsEnabled";
const toggleBtn = document.getElementById("toggleBtn");
const status = document.getElementById("status");

function render(enabled) {
  if (enabled) {
    toggleBtn.textContent = "자동 넘김 끄기";
    toggleBtn.classList.remove("off");
    status.textContent = "현재 상태: 실행 중";
  } else {
    toggleBtn.textContent = "자동 넘김 켜기";
    toggleBtn.classList.add("off");
    status.textContent = "현재 상태: 정지";
  }
}

chrome.storage.local.get({ [STORAGE_KEY]: true }, (state) => {
  render(!!state[STORAGE_KEY]);
});

toggleBtn.addEventListener("click", () => {
  chrome.storage.local.get({ [STORAGE_KEY]: true }, (state) => {
    const next = !state[STORAGE_KEY];
    chrome.storage.local.set({ [STORAGE_KEY]: next }, () => {
      render(next);
    });
  });
});
