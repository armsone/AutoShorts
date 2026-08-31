const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const contentSource = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");
const popupSource = fs.readFileSync(path.join(__dirname, "..", "popup.js"), "utf8");
const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "manifest.json"), "utf8")
);

class MockKeyboardEvent extends Event {
  constructor(type, options = {}) {
    super(type, options);
    this.key = options.key;
    this.code = options.code;
  }
}

function createElement({ tagName = "DIV", width = 100, height = 100 } = {}) {
  const element = new EventTarget();
  element.tagName = tagName;
  element.disabled = false;
  element.paused = false;
  element.ended = false;
  element.currentTime = 0;
  element.duration = 10;
  element.isContentEditable = false;
  element.getAttribute = () => null;
  element.getBoundingClientRect = () => ({ width, height });
  return element;
}

function createContentHarness({ pathName = "/shorts/first", withNextButton = true } = {}) {
  const video = createElement({ tagName: "VIDEO", width: 360, height: 640 });
  const hiddenVideo = createElement({ tagName: "VIDEO", width: 0, height: 0 });
  const nextButton = createElement({ tagName: "BUTTON" });
  let nextClicks = 0;
  nextButton.click = () => { nextClicks += 1; };

  const body = createElement({ tagName: "BODY" });
  const keyboardEvents = [];
  body.addEventListener("keydown", (event) => keyboardEvents.push(event.key));
  body.addEventListener("keyup", (event) => keyboardEvents.push(event.key));

  const location = {
    href: `https://www.youtube.com${pathName}`,
    pathname: pathName
  };
  let storageListener = null;
  let intervalCallback = null;
  let now = 10_000;

  const document = {
    activeElement: body,
    body,
    documentElement: body,
    querySelectorAll(selector) {
      if (selector === "video") return [video, hiddenVideo];
      if (selector === "#navigation-button-down button") {
        return withNextButton ? [nextButton] : [];
      }
      return [];
    }
  };

  const window = Object.assign(new EventTarget(), {
    setInterval(callback) {
      intervalCallback = callback;
      return 1;
    },
    clearInterval() {}
  });

  const context = {
    console,
    Date: { now: () => now },
    Event,
    KeyboardEvent: MockKeyboardEvent,
    location,
    document,
    window,
    getComputedStyle: () => ({ display: "block", visibility: "visible" }),
    chrome: {
      storage: {
        local: { get: (_defaults, callback) => callback({ autoShortsEnabled: true }) },
        onChanged: {
          addListener(callback) { storageListener = callback; },
          removeListener() {}
        }
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(contentSource, context, { filename: "content.js" });

  return {
    body,
    video,
    location,
    keyboardEvents,
    get nextClicks() { return nextClicks; },
    advanceTime(milliseconds) { now += milliseconds; },
    runScan() { intervalCallback(); },
    setEnabled(value) {
      storageListener({ autoShortsEnabled: { newValue: value } }, "local");
    }
  };
}

function testContinuousReuse() {
  const harness = createContentHarness();
  harness.video.ended = true;
  harness.video.dispatchEvent(new Event("ended"));
  assert.equal(harness.nextClicks, 1);

  harness.location.pathname = "/shorts/second";
  harness.location.href = "https://www.youtube.com/shorts/second";
  harness.runScan();
  assert.equal(harness.nextClicks, 1, "이전 영상의 ended 상태로 다음 영상을 건너뛰면 안 됩니다");

  harness.advanceTime(1_000);
  harness.video.ended = false;
  harness.runScan();
  harness.video.ended = true;
  harness.video.dispatchEvent(new Event("ended"));
  assert.equal(harness.nextClicks, 2, "재사용된 video에서도 계속 넘어가야 합니다");
}

function testSpaEntryAndRegularPageGuard() {
  const harness = createContentHarness({ pathName: "/watch?v=abc" });
  harness.video.ended = true;
  harness.video.dispatchEvent(new Event("ended"));
  assert.equal(harness.nextClicks, 0);

  harness.location.pathname = "/shorts/from-spa";
  harness.location.href = "https://www.youtube.com/shorts/from-spa";
  harness.video.ended = false;
  harness.runScan();
  harness.video.ended = true;
  harness.video.dispatchEvent(new Event("ended"));
  assert.equal(harness.nextClicks, 1, "SPA로 Shorts에 들어가도 동작해야 합니다");
}

function testDisabledState() {
  const harness = createContentHarness();
  harness.setEnabled(false);
  harness.video.ended = true;
  harness.video.dispatchEvent(new Event("ended"));
  assert.equal(harness.nextClicks, 0);
}

function testKeyboardFallback() {
  const harness = createContentHarness({ withNextButton: false });
  harness.video.ended = true;
  harness.video.dispatchEvent(new Event("ended"));
  assert.deepEqual(harness.keyboardEvents, ["ArrowDown", "ArrowDown"]);
}

function testLoopingVideoNearEnd() {
  const harness = createContentHarness();
  harness.video.currentTime = 9.9;
  harness.video.dispatchEvent(new Event("timeupdate"));
  assert.equal(harness.nextClicks, 1, "loop 영상도 끝나기 직전에 넘어가야 합니다");
}

function testLoopWrapFallback() {
  const harness = createContentHarness();
  harness.video.currentTime = 9.5;
  harness.video.dispatchEvent(new Event("timeupdate"));
  assert.equal(harness.nextClicks, 0);
  harness.video.currentTime = 0.1;
  harness.video.dispatchEvent(new Event("timeupdate"));
  assert.equal(harness.nextClicks, 1, "종료 직전 감지를 놓쳐도 반복 시작점에서 넘어가야 합니다");
}

function testTransitionEventGuard() {
  const harness = createContentHarness();
  harness.video.currentTime = 9.9;
  harness.video.dispatchEvent(new Event("timeupdate"));
  assert.equal(harness.nextClicks, 1);

  harness.location.pathname = "/shorts/second";
  harness.location.href = "https://www.youtube.com/shorts/second";
  harness.video.currentTime = 0.1;
  harness.video.dispatchEvent(new Event("timeupdate"));
  assert.equal(harness.nextClicks, 1, "화면 전환 중 이전 영상 이벤트로 하나 더 건너뛰면 안 됩니다");

  harness.advanceTime(1_000);
  harness.video.currentTime = 9.9;
  harness.video.dispatchEvent(new Event("timeupdate"));
  assert.equal(harness.nextClicks, 2, "다음 영상이 끝나면 정상적으로 넘어가야 합니다");
}

function testPopupToggle() {
  function popupElement() {
    return {
      textContent: "",
      classList: {
        values: new Set(),
        add(value) { this.values.add(value); },
        remove(value) { this.values.delete(value); }
      },
      addEventListener(type, callback) { this[type] = callback; }
    };
  }

  const toggleButton = popupElement();
  const status = popupElement();
  let stored = true;
  const context = {
    document: {
      getElementById(id) { return id === "toggleBtn" ? toggleButton : status; }
    },
    chrome: {
      storage: {
        local: {
          get: (_defaults, callback) => callback({ autoShortsEnabled: stored }),
          set: (value, callback) => {
            stored = value.autoShortsEnabled;
            callback();
          }
        }
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(popupSource, context, { filename: "popup.js" });
  assert.equal(status.textContent, "현재 상태: 실행 중");
  toggleButton.click();
  assert.equal(stored, false);
  assert.equal(status.textContent, "현재 상태: 정지");
}

function testManifest() {
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.deepEqual(manifest.host_permissions, ["https://www.youtube.com/*"]);
  assert.deepEqual(manifest.content_scripts[0].matches, ["https://www.youtube.com/*"]);
  for (const iconPath of Object.values(manifest.icons)) {
    assert.equal(fs.existsSync(path.join(__dirname, "..", iconPath)), true, `${iconPath}가 필요합니다`);
  }
}

testContinuousReuse();
testSpaEntryAndRegularPageGuard();
testDisabledState();
testKeyboardFallback();
testLoopingVideoNearEnd();
testLoopWrapFallback();
testTransitionEventGuard();
testPopupToggle();
testManifest();

console.log("AutoShorts tests: PASS");
