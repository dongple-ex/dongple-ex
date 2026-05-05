const places = [
  {
    id: "p1",
    name: "수원화성 행궁광장",
    category: "행사",
    status: "busy",
    statusText: "붐빔",
    updated: "5분 전",
    summary: "야간 행사 입장 줄이 길어요. 사진 찍는 구간은 천천히 이동 중.",
    tags: ["대기 김", "사진 명소", "야간 산책"],
    x: 34,
    y: 42,
  },
  {
    id: "p2",
    name: "행궁동 골목 카페거리",
    category: "카페",
    status: "normal",
    statusText: "보통",
    updated: "12분 전",
    summary: "창가 자리는 거의 찼고 테이크아웃은 빠른 편이에요.",
    tags: ["테이크아웃 빠름", "자리 조금"],
    x: 58,
    y: 38,
  },
  {
    id: "p3",
    name: "화홍문 산책로",
    category: "공원",
    status: "calm",
    statusText: "한산",
    updated: "18분 전",
    summary: "바람 좋고 사진 찍기 편해요. 가족 산책객이 조금 있어요.",
    tags: ["한산", "산책 추천"],
    x: 72,
    y: 58,
  },
  {
    id: "p4",
    name: "팔달문 시장 입구",
    category: "식당",
    status: "request",
    statusText: "요청",
    updated: "방금",
    summary: "지금 저녁 웨이팅 어떤지 확인 요청이 올라왔어요.",
    tags: ["웨이팅 궁금", "저녁"],
    x: 45,
    y: 70,
  },
];

const news = [
  {
    id: "n1",
    title: "오늘 행궁광장 야간 공연, 어디서 보면 좋을까요?",
    type: "공식+질문",
    placeId: "p1",
    body: "공식 행사는 19시에 시작하지만 실제 대기와 주변 혼잡은 현장 공유가 필요해요.",
  },
  {
    id: "n2",
    title: "행궁동 카페거리, 비 오는 날에도 걷기 괜찮았어요",
    type: "후기",
    placeId: "p2",
    body: "골목이 좁아 붐비면 이동이 느려요. 조용한 자리를 찾으면 지도에서 현재 상태를 먼저 확인해보세요.",
  },
  {
    id: "n3",
    title: "화홍문 쪽은 해 질 때 한산한 편",
    type: "추천",
    placeId: "p3",
    body: "사람 많은 행궁동에서 조금 벗어나 쉬기 좋아요. 산책 후 다시 시장 쪽으로 이동하기도 편합니다.",
  },
];

let selectedPlaceId = "p1";
let memories = [
  {
    type: "가보고 싶은 곳",
    title: "행궁광장 야간 공연 저장",
    placeId: "p1",
    note: "공연 시작 전에 혼잡도 확인하기",
  },
];

const viewMap = {
  homeView: "홈",
  newsView: "소식",
  recordView: "기록",
  mapView: "지도",
  myView: "내발문자",
};

const statusClass = {
  busy: "busy",
  normal: "normal",
  calm: "calm",
  request: "request",
};

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return [...document.querySelectorAll(selector)];
}

function placeById(id) {
  return places.find((place) => place.id === id) || places[0];
}

function showToast(message) {
  const toast = qs("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

function switchView(viewId) {
  qsa(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  qsa(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function statusBadge(place) {
  return `<span class="status ${statusClass[place.status]}">${place.statusText} · ${place.updated}</span>`;
}

function cardForPlace(place) {
  return `
    <article class="card stack ${place.status === "request" ? "featured" : ""}">
      <div class="row">
        <div>
          <h3>${place.name}</h3>
          <p class="muted">${place.category}</p>
        </div>
        ${statusBadge(place)}
      </div>
      <p>${place.summary}</p>
      <div class="chip-row">${place.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
      <div class="actions">
        <button class="btn main" data-action="map" data-place="${place.id}">현재 상태 보기</button>
        <button class="btn blue" data-action="request" data-place="${place.id}">${place.status === "request" ? "나도 궁금해요" : "상황 요청"}</button>
        <button class="btn ghost" data-action="save" data-place="${place.id}">기록해두기</button>
      </div>
    </article>
  `;
}

function renderHome() {
  const busy = places.filter((place) => place.status === "busy");
  const requests = places.filter((place) => place.status === "request");
  qs("#homeView").innerHTML = `
    <div class="guide-strip">
      ${[
        ["1. 소식", "갈 곳과 이유를 발견"],
        ["2. 기록", "저장하거나 상황 요청"],
        ["3. 지도", "지금 상태 확인"],
        ["4. 공유", "현장에서 3초 공유"],
        ["5. 회고", "여정으로 다시 보기"],
      ]
        .map(([title, text]) => `<div class="step"><strong>${title}</strong><span>${text}</span></div>`)
        .join("")}
    </div>
    <div class="grid">
      <section class="panel hero-panel span-8">
        <div>
          <h2>소식에서 고르고, 지금 상황을 확인한 뒤, 내 여정으로 남겨요.</h2>
          <p>오늘의 장소와 요청, 주변 상태를 한 번에 보고 다음 발걸음을 정합니다.</p>
          <div class="actions">
            <button class="btn main" data-go="newsView">소식 보기</button>
            <button class="btn blue" data-go="recordView">기록/요청</button>
            <button class="btn" data-go="mapView">지도 확인</button>
          </div>
        </div>
      </section>
      <section class="panel span-4 stack">
        <h2>바로 하기</h2>
        <div class="quick-actions">
          <button class="btn quick-action" data-go="newsView">갈 곳 찾기<span>소식에서 후보 보기</span></button>
          <button class="btn quick-action" data-record-type="request">상황 묻기<span>현장 사용자에게 요청</span></button>
          <button class="btn quick-action" data-go="myView">내 여정<span>저장한 곳 다시 보기</span></button>
        </div>
        <div class="chip-row">
          <span class="chip">소식 ${news.length}</span>
          <span class="chip">요청 ${requests.length}</span>
          <span class="chip">기억 ${memories.length}</span>
        </div>
        <p class="muted">발견한 장소는 기록해두고, 아직 애매하면 상황을 요청하세요.</p>
      </section>
      <section class="span-6 stack">
        <h2>오늘 발견할 곳</h2>
        ${news.slice(0, 2).map((item) => newsCard(item)).join("")}
      </section>
      <section class="span-6 stack">
        <h2>지금 확인할 상태</h2>
        ${[...busy, ...requests].map(cardForPlace).join("")}
      </section>
    </div>
  `;
}

function newsCard(item) {
  const place = placeById(item.placeId);
  return `
    <article class="card stack">
      <div class="row">
        <span class="chip">${item.type}</span>
        ${statusBadge(place)}
      </div>
      <h3>${item.title}</h3>
      <p>${item.body}</p>
      <p class="muted">${place.name}</p>
      <div class="actions">
        <button class="btn ghost" data-action="save" data-place="${place.id}">기록해두기</button>
        <button class="btn blue" data-action="request" data-place="${place.id}">상황 요청</button>
        <button class="btn main" data-action="map" data-place="${place.id}">현재 상태 보기</button>
      </div>
    </article>
  `;
}

function renderNews() {
  qs("#newsView").innerHTML = `
    <div class="stack">
      <div class="row">
        <h2>소식</h2>
        <button class="btn main" data-go="recordView">소식 작성</button>
      </div>
      <div class="grid">
        ${news.map((item) => `<div class="span-4">${newsCard(item)}</div>`).join("")}
      </div>
    </div>
  `;
}

function renderRecord(defaultType = "save") {
  const placeOptions = places.map((place) => `<option value="${place.id}">${place.name}</option>`).join("");
  qs("#recordView").innerHTML = `
    <div class="grid">
      <section class="panel span-4 stack">
        <h2>기록하기</h2>
        <p class="muted">방문 전 관심, 상황 요청, 현장 공유, 여정 기록을 한 곳에서 남깁니다.</p>
        <div class="helper"><b>팁</b><span>아직 갈지 고민 중이면 상황 요청, 이미 현장에 있으면 현장 공유, 다녀온 뒤에는 여정 기록을 고르면 됩니다.</span></div>
        <div class="tabs">
          ${[
            ["save", "기록해두기"],
            ["request", "상황 요청"],
            ["share", "현장 공유"],
            ["journey", "여정 기록"],
            ["post", "소식 작성"],
          ]
            .map(([value, label]) => `<button class="btn tab ${value === defaultType ? "active" : ""}" data-tab="${value}">${label}</button>`)
            .join("")}
        </div>
      </section>
      <section class="panel span-8">
        <form class="form" id="recordForm">
          <input type="hidden" name="type" value="${defaultType}" />
          <div class="helper"><b>${formTitle(defaultType)}</b><span>${helperText(defaultType)}</span></div>
          <div class="field">
            <label>장소</label>
            <select name="placeId">${placeOptions}</select>
          </div>
          <div class="field">
            <label>제목</label>
            <input name="title" value="${formTitle(defaultType)}" />
          </div>
          <div class="field">
            <label>메모</label>
            <textarea name="note">${formNote(defaultType)}</textarea>
          </div>
          <button class="btn main" type="submit">저장하기</button>
        </form>
      </section>
    </div>
  `;
}

function formTitle(type) {
  return {
    save: "가보고 싶은 곳으로 저장",
    request: "지금 상황이 궁금해요",
    share: "현장 상황 공유",
    journey: "오늘의 여정 기록",
    post: "소식 작성",
  }[type];
}

function formNote(type) {
  return {
    save: "나중에 가기 전 현재 상태를 확인하고 싶어요.",
    request: "지금 사람 많은지, 대기 긴지 알려주세요.",
    share: "지금 현장은 이래요.",
    journey: "다녀온 느낌과 다시 보고 싶은 순간을 남겨요.",
    post: "다른 사람이 방문 전 참고할 수 있는 이야기를 남겨요.",
  }[type];
}

function helperText(type) {
  return {
    save: "나중에 다시 확인할 장소로 저장합니다.",
    request: "현장에 있는 사람에게 지금 상황을 물어봅니다.",
    share: "내가 보고 있는 현장 상태를 다른 사람에게 알려줍니다.",
    journey: "방문 후 감정과 동선을 추억으로 남깁니다.",
    post: "다른 사람이 갈 곳을 정할 때 참고할 소식을 씁니다.",
  }[type];
}

function renderMap() {
  const selected = placeById(selectedPlaceId);
  qs("#mapView").innerHTML = `
    <div class="grid">
      <section class="panel map-shell span-8">
        ${places
          .map(
            (place) => `
              <button class="pin ${statusClass[place.status]}" style="left:${place.x}%;top:${place.y}%" data-action="select" data-place="${place.id}" title="${place.name}">
                <span>${place.statusText.slice(0, 1)}</span>
              </button>
            `,
          )
          .join("")}
      </section>
      <section class="panel span-4 stack">
        <h2>선택한 장소</h2>
        ${cardForPlace(selected)}
        <div class="actions">
          <button class="btn main" data-action="share" data-place="${selected.id}">현장 공유</button>
          <button class="btn blue" data-action="request" data-place="${selected.id}">이곳 상황 요청</button>
          <button class="btn ghost" data-action="journey" data-place="${selected.id}">여정 기록</button>
        </div>
      </section>
      <section class="bottom-sheet span-12 stack">
        <h2>주변 순간들</h2>
        <div class="grid">${places.map((place) => `<div class="span-6">${cardForPlace(place)}</div>`).join("")}</div>
      </section>
    </div>
  `;
}

function renderMy() {
  qs("#myView").innerHTML = `
    <div class="stack">
      <div class="row">
        <h2>나의 내발문자</h2>
        <button class="btn main" data-go="recordView">새 여정 기록</button>
      </div>
      <div class="grid">
        <section class="panel span-4">
          <h3>${memories.length}</h3>
          <p class="muted">쌓인 기록</p>
        </section>
        <section class="panel span-4">
          <h3>${memories.filter((item) => item.type.includes("요청")).length}</h3>
          <p class="muted">상황 요청</p>
        </section>
        <section class="panel span-4">
          <h3>${new Set(memories.map((item) => item.placeId)).size}</h3>
          <p class="muted">기억한 장소</p>
        </section>
      </div>
      <div class="stack">
        ${memories.length ? memories.map(memoryCard).join("") : `<div class="empty">아직 기록이 없습니다.</div>`}
      </div>
    </div>
  `;
}

function memoryCard(item) {
  const place = placeById(item.placeId);
  return `
    <article class="card stack">
      <div class="row">
        <span class="chip">${item.type}</span>
        ${statusBadge(place)}
      </div>
      <h3>${item.title}</h3>
      <p>${item.note}</p>
      <p class="muted">${place.name}</p>
      <div class="actions">
        <button class="btn main" data-action="map" data-place="${place.id}">지도에서 현재 상태 보기</button>
        <button class="btn blue" data-action="request" data-place="${place.id}">다시 상황 요청</button>
        <button class="btn ghost" data-action="journey" data-place="${place.id}">여정 기록</button>
      </div>
    </article>
  `;
}

function renderAll() {
  renderHome();
  renderNews();
  renderRecord();
  renderMap();
  renderMy();
}

function addMemory(type, placeId, title, note) {
  memories = [{ type, placeId, title, note }, ...memories];
  renderAll();
  showToast(`${type}에 저장됐어요`);
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-view]");
  if (nav) switchView(nav.dataset.view);

  const go = event.target.closest("[data-go]");
  if (go) switchView(go.dataset.go);

  const recordType = event.target.closest("[data-record-type]");
  if (recordType) {
    renderRecord(recordType.dataset.recordType);
    switchView("recordView");
  }

  const tab = event.target.closest("[data-tab]");
  if (tab) renderRecord(tab.dataset.tab);

  const action = event.target.closest("[data-action]");
  if (!action) return;
  const placeId = action.dataset.place || selectedPlaceId;
  const place = placeById(placeId);

  if (action.dataset.action === "map") {
    selectedPlaceId = placeId;
    renderMap();
    switchView("mapView");
  }

  if (action.dataset.action === "select") {
    selectedPlaceId = placeId;
    renderMap();
  }

  if (action.dataset.action === "save") {
    addMemory("가보고 싶은 곳", placeId, `${place.name} 저장`, "소식에서 발견한 장소를 방문 후보로 남겼어요.");
  }

  if (action.dataset.action === "request") {
    addMemory("상황 요청", placeId, `${place.name} 상황 요청`, "지금 혼잡도와 대기 상황이 궁금해요.");
  }

  if (action.dataset.action === "share") {
    place.status = "normal";
    place.statusText = "보통";
    place.updated = "방금";
    addMemory("현장 공유", placeId, `${place.name} 현장 공유`, "지금 현장 상황을 공유했어요.");
  }

  if (action.dataset.action === "journey") {
    addMemory("여정 기록", placeId, `${place.name} 여정`, "다녀온 순간을 나의 내발문자에 남겼어요.");
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id !== "recordForm") return;
  event.preventDefault();
  const data = new FormData(event.target);
  const typeLabel = {
    save: "가보고 싶은 곳",
    request: "상황 요청",
    share: "현장 공유",
    journey: "여정 기록",
    post: "소식",
  }[data.get("type")];
  addMemory(typeLabel, data.get("placeId"), data.get("title"), data.get("note"));
  switchView("myView");
});

qs("#quickRequestBtn").addEventListener("click", () => {
  renderRecord("request");
  switchView("recordView");
});

renderAll();
