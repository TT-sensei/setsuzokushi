(() => {
  "use strict";
  const DATA = window.KOTOMUSUBI_DATA;
  const root = document.getElementById("app-main");
  const headerStat = document.getElementById("header-stat");
  const toastEl = document.getElementById("toast");

  const STORAGE_KEY = "kotomusubi-progress-v1";
  const emptyStore = () => ({ attempts: 0, correct: 0, solved: {}, mistakes: {}, cleared: {} });
  let store = readStore();
  let page = "learn";
  let selectedCategory = null;
  let selectedPracticeCategory = "all";
  let practice = null;
  let demoIndex = 0;
  let toastTimer = null;

  // ナビアン画像は公式カタログで実在を確認したWebPだけを使用する。
  const NAVI_BASE = "https://tt-sensei.github.io/navi-character-/assets/web/characters";
  const NAVI_IDS = ["riku", "sora", "kai", "saku", "tsuki", "nami"];
  const NAVI_POSES = {
    start: { riku:"waving", sora:"greeting", kai:"waving", saku:"waving", tsuki:"waving", nami:"waving" },
    hint: { riku:"hint", sora:"hint", kai:"hint", saku:"hint", tsuki:"hint", nami:"hint" },
    correct: { riku:"correct", sora:"correct", kai:"correct", saku:"correct", tsuki:"correct", nami:"correct" },
    retry: { riku:"retry", sora:"retry", kai:"retry", saku:"retry", tsuki:"retry", nami:"retry" },
    complete: { riku:"complete", sora:"complete", kai:"complete", saku:"complete", tsuki:"complete", nami:"complete" }
  };
  function naviMessage(pose) {
    const messages = {
      start: ["文と文のつながりを見つけよう！", "接続詞は、文と文を結ぶ道しるべだよ。"],
      hint: ["前の文と後ろの文、どんな関係かな？", "二つの文をよく読んで、つながりを考えよう。"],
      correct: ["いいね！つながりを見つけられたね。", "どうしてこの言葉が合うのかも考えられたかな？"],
      retry: ["おしい！文の関係をもう一度見てみよう。", "まちがいは学びのチャンス。理由を確かめよう。"],
      complete: ["最後までよく考えたね！", "文と文のつながりが、少しずつ見えてきたね。"]
    };
    const list = messages[pose] || messages.hint;
    return list[Math.floor(Math.random() * list.length)];
  }
  function renderNavi(pose = "hint", message = "") {
    const id = NAVI_IDS[Math.floor(Math.random() * NAVI_IDS.length)];
    const file = NAVI_POSES[pose]?.[id];
    if (!file) return "";
    const src = NAVI_BASE + "/" + id + "/fullbody/" + file + ".webp";
    const label = message || naviMessage(pose);
    return `<aside class="navi-guide" aria-label="ナビアンからのメッセージ">
      <img class="navi-guide-image" src="${src}" alt="" loading="lazy" decoding="async">
      <p class="navi-guide-message">${esc(label)}</p>
    </aside>`;
  }

  function readStore() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!raw || typeof raw !== "object") return emptyStore();
      return {
        attempts: Number(raw.attempts) || 0,
        correct: Number(raw.correct) || 0,
        solved: raw.solved && typeof raw.solved === "object" ? raw.solved : {},
        mistakes: raw.mistakes && typeof raw.mistakes === "object" ? raw.mistakes : {},
        cleared: raw.cleared && typeof raw.cleared === "object" ? raw.cleared : {}
      };
    } catch (error) {
      return emptyStore();
    }
  }

  function saveStore() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
    catch (error) { showToast("この端末に学習記録を保存できませんでした。"); }
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    }[char]));
  }

  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function categoryById(id) {
    return DATA.categories.find(category => category.id === id);
  }

  function questionById(id) {
    return DATA.questions.find(question => question.id === id);
  }

  function masteredCount() {
    return Object.keys(store.solved).filter(id => store.solved[id]).length;
  }

  function unresolvedMistakes() {
    return Object.keys(store.mistakes).filter(id => Number(store.mistakes[id]) > 0 && !store.cleared[id]);
  }

  function updateHeader() {
    headerStat.textContent = "挑戦 " + store.attempts + "問";
    document.querySelectorAll(".nav-tab").forEach(button => {
      const active = button.dataset.page === page;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 2300);
  }

  function go(nextPage) {
    page = nextPage;
    if (nextPage !== "learn") selectedCategory = null;
    render();
    root.focus({ preventScroll: true });
  }

  function render() {
    updateHeader();
    if (page === "learn") {
      root.innerHTML = selectedCategory ? renderLesson(selectedCategory) : renderHome();
    } else if (page === "practice") {
      root.innerHTML = practice ? renderPractice() : renderPracticeStart();
    } else {
      root.innerHTML = renderReview();
    }
  }

  function renderHome() {
    const solved = masteredCount();
    const cards = DATA.categories.map(category => {
      const qs = DATA.questions.filter(q => q.cat === category.id);
      const learned = qs.filter(q => store.solved[q.id]).length;
      return `
        <button class="category-card" type="button" data-action="open-category" data-cat="${category.id}">
          <span class="card-top"><span class="category-number">${category.mark} / 06</span><span class="card-symbol">結</span></span>
          <h3>${esc(category.name)}</h3>
          <span class="category-short">${esc(category.short)}</span>
          <p>${esc(category.tagline)}</p>
          <span class="card-bottom"><span>理解した問題 ${learned} / ${qs.length}</span><span class="card-arrow">›</span></span>
        </button>`;
    }).join("");

    const demos = [
      { connector:"だから", before:"雨が降っていた。", after:"試合は中止になった。", note:"雨が降ったことが、中止の理由になっています。原因から結果へつなぐ形です。" },
      { connector:"しかし", before:"雨が降っていた。", after:"試合は予定どおり行われた。", note:"雨なら中止になりそうなのに、実際には行われました。予想と反対の内容です。" },
      { connector:"そして", before:"雨が降っていた。", after:"選手たちは屋根のある場所に集まった。", note:"雨が降ったあとに選手が集まったという、出来事の続きです。" }
    ];
    const demo = demos[demoIndex];

    return `
      <section class="hero">
        <div>
          <div class="eyebrow">WORDS CONNECT, MEANING GROWS</div>
          <h1>ことむすび</h1>
          <p class="hero-lead">言葉を結ぶ。文をつなぐ。意味が広がる。<br>接続詞のはたらきを知って、文章の流れを読み取ろう。</p>
        </div>
        <div class="hero-note">
          <strong>接続詞は、文と文の道しるべ。</strong>
          <p>前と後ろの文がどんな関係なのかを考えると、文章の意味がもっとよく分かるよ。</p>
        </div>
      </section>

      <div class="section-head">
        <div><h2>六つのはたらきを知る</h2><p>気になる種類を選んで、意味と使い方を確かめよう。</p></div>
        <p>理解した問題 ${solved} 問</p>
      </div>
      <section class="category-grid" aria-label="接続詞の種類">${cards}</section>

      <section class="home-bottom">
        <div class="info-panel">
          <div class="panel-label">CONNECTOR LAB</div>
          <h3>同じ文でも、つなぎ方で意味が変わる。</h3>
          <p>前の文と後ろの文の関係を考えてみよう。</p>
          <div class="sentence-board" style="margin:12px 0 10px">
            <div class="sentence-line">${demo.before}</div>
            <div class="sentence-line"><span class="connector-highlight">${demo.connector}</span>、${demo.after}</div>
          </div>
          <p id="demo-note">${demo.note}</p>
          <div class="button-row" style="margin-top:12px">
            <button class="quiet-btn" type="button" data-action="demo" data-demo="0">だから</button>
            <button class="quiet-btn" type="button" data-action="demo" data-demo="1">しかし</button>
            <button class="quiet-btn" type="button" data-action="demo" data-demo="2">そして</button>
          </div>
        </div>
        <div class="info-panel">
          <div class="panel-label">YOUR LEARNING</div>
          <h3>学んだことを、問題で確かめよう。</h3>
          <p>問題に答えると、理由つきの解説が読めます。間違えた問題は自動で記録され、あとから特訓できます。</p>
          <div class="button-row" style="margin-top:16px">
            <button class="primary-btn" type="button" data-action="start-practice">10問に挑戦する</button>
            <button class="secondary-btn" type="button" data-action="go-review">記録を見る</button>
          </div>
          <div class="badge-row">
            <span class="achievement">◇ 学習記録 ${store.attempts}問</span>
            <span class="achievement">✓ 正解 ${store.correct}問</span>
          </div>
        </div>
      </section>`;
  }

  function renderLesson(id) {
    const category = categoryById(id);
    if (!category) return renderHome();
    const examples = category.samples.map(sample => `
      <div class="sample-item">
        <div class="sentence">${esc(sample.before)}<span class="connector-highlight">${esc(sample.connector)}</span>${esc(sample.after)}</div>
        <div class="sample-note">${esc(sample.note)}</div>
      </div>`).join("");
    const words = category.examples.map(word => `<span class="word-chip">${esc(word)}</span>`).join("");
    const questions = DATA.questions.filter(q => q.cat === id);
    const done = questions.filter(q => store.solved[q.id]).length;

    return `
      <div class="detail-head">
        <button class="back-btn" type="button" data-action="back-home">← 一覧へ</button>
        <div><div class="detail-number">${category.mark} / 06  ·  ${done} / ${questions.length}問 理解</div><h1>${esc(category.name)}</h1><div class="detail-short">${esc(category.short)} — ${esc(category.tagline)}</div></div>
      </div>
      <div class="detail-grid">
        <section class="lesson-panel">
          <div class="panel-label">HOW IT CONNECTS</div>
          <h2 class="panel-title">どんなはたらき？</h2>
          <p class="lesson-text">${esc(category.lesson)}</p>
          <div class="relation-flow">
            <div class="relation-node">${esc(category.diagram[0])}</div>
            <div class="relation-arrow">→</div>
            <div class="relation-node">${esc(category.diagram[1])}</div>
          </div>
          <div class="panel-label">よく使う接続詞</div>
          <div class="word-list">${words}</div>
          <div class="caution"><strong>使い分けのヒント</strong><br>${esc(category.caution)}</div>
        </section>
        <section class="sample-panel">
          <div class="panel-label">EXAMPLE</div>
          <h2 class="panel-title">文のつながりを見てみよう</h2>
          ${examples}
        </section>
      </div>
      <div class="detail-actions">
        <button class="primary-btn" type="button" data-action="practice-category" data-cat="${category.id}">このはたらきの問題に挑戦</button>
        <button class="quiet-btn" type="button" data-action="back-home">ほかのはたらきも見る</button>
      </div>`;
  }

  function renderPracticeStart() {
    const options = DATA.categories.map(c => `<option value="${c.id}" ${selectedPracticeCategory === c.id ? "selected" : ""}>${esc(c.name)}（${esc(c.short)}）</option>`).join("");
    const weakCount = unresolvedMistakes().length;
    return `
      <div class="practice-toolbar"><div><div class="eyebrow">PRACTICE</div><h1>文と文を結んでみよう</h1></div><label class="select-wrap">学ぶはたらき<select id="practice-category"><option value="all" ${selectedPracticeCategory === "all" ? "selected" : ""}>すべてのはたらき</option>${options}</select></label></div>
      <section class="practice-panel">
        <div class="panel-label">CHOOSE YOUR CHALLENGE</div>
        <h2 class="panel-title">前と後ろの文を読んで、ぴったりの接続詞を選ぼう。</h2>
        <p class="lesson-text">正解すると、文と文の関係を解説します。まちがえても大丈夫。理由を確かめて、次に生かそう。</p>\n        ${renderNavi("start", "まずは、二つの文をゆっくり読んでみよう！")}
        <div class="button-row" style="margin-top:20px">
          <button class="primary-btn" type="button" data-action="start-practice">10問に挑戦する</button>
          <button class="secondary-btn" type="button" data-action="start-weak">苦手な問題を特訓 ${weakCount ? "（" + weakCount + "問）" : ""}</button>
        </div>
        <p class="small-note" style="margin-top:14px">問題は毎回順番が変わります。学習記録はこの端末のブラウザに保存されます。</p>
      </section>`;
  }

  function makeQueue(mode, categoryId) {
    let pool = DATA.questions;
    if (mode === "weak") {
      const ids = unresolvedMistakes();
      pool = ids.map(questionById).filter(Boolean);
    } else if (mode === "single") {
      pool = DATA.questions.filter(q => q.id === categoryId);
    } else if (categoryId && categoryId !== "all") {
      pool = DATA.questions.filter(q => q.cat === categoryId);
    }
    if (mode !== "single") pool = shuffle(pool).slice(0, Math.min(10, pool.length));
    return pool.map(q => ({ ...q, options: shuffle([...new Set([q.answer, ...q.choices])]).slice(0, 4) }));
  }

  function startPractice(mode = "normal", cat = selectedPracticeCategory) {
    const queue = makeQueue(mode, mode === "single" ? cat : cat);
    if (!queue.length) {
      showToast(mode === "weak" ? "今のところ特訓する問題はありません。" : "この条件の問題が見つかりませんでした。");
      return;
    }
    practice = { mode, queue, index: 0, answered: false, selected: null, correct: 0, wrong: 0 };
    page = "practice";
    render();
    root.focus({ preventScroll: true });
  }

  function renderPractice() {
    if (practice.index >= practice.queue.length) return renderPracticeResult();
    const q = practice.queue[practice.index];
    const category = categoryById(q.cat);
    const progress = (practice.index / practice.queue.length) * 100;
    const choices = q.options.map(choice => {
      let stateClass = "";
      if (practice.answered && choice === q.answer) stateClass = "correct";
      else if (practice.answered && choice === practice.selected) stateClass = "wrong";
      const disabled = practice.answered ? "disabled" : "";
      return `<button class="choice-btn ${stateClass}" type="button" data-action="answer" data-choice="${esc(choice)}" ${disabled}>${esc(choice)}</button>`;
    }).join("");
    const slotText = practice.answered ? q.answer : "どれが入る？";
    const feedback = practice.answered ? `
      <div class="feedback ${practice.selected === q.answer ? "good" : "retry"}">
        <div class="feedback-head">${practice.selected === q.answer ? "よくできたね！" : "答えを確かめよう"}</div>
        <p>${esc(q.explain)}</p>
        <p class="why">この問題のはたらき：<strong>${esc(category.name)}</strong> — ${esc(category.relation)}。</p>
      </div>` : "";
    const modeName = practice.mode === "weak" ? "苦手特訓" : practice.mode === "single" ? "もう一度チャレンジ" : "接続詞チャレンジ";

    return `
      <div class="practice-toolbar"><div><div class="eyebrow">${modeName}</div><h1>文のつながりを考えよう</h1></div><button class="back-btn" type="button" data-action="end-practice">学習メニューへ</button></div>
      <section class="practice-panel">
        <div class="practice-topline"><span>問題 ${practice.index + 1} / ${practice.queue.length}</span><span>${esc(category.name)} のはたらき</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
        <div class="question-kind">QUESTION ${String(practice.index + 1).padStart(2,"0")}</div>
        <h2 class="question-title">二つの文を、どんな言葉でつなぐ？</h2>
        <div class="sentence-board">
          <div class="sentence-line">${esc(q.before)}</div>
          <div class="sentence-line"><span class="answer-slot ${practice.answered ? "filled" : ""}">${esc(slotText)}</span>${q.join ? "" : "、"}${esc(q.after)}</div>
        </div>
        <div class="choice-grid">${choices}</div>
        ${feedback}
        <div class="practice-footer">
          <span class="small-note">${practice.answered ? "文と文の関係まで確認しよう。" : "前と後ろの文の関係に注目！"}</span>
          ${practice.answered ? `<button class="primary-btn" type="button" data-action="next-question">${practice.index + 1 === practice.queue.length ? "結果を見る" : "次の問題へ"} →</button>` : ""}
        </div>
      </section>`;
  }

  function renderPracticeResult() {
    const total = practice.queue.length;
    const rate = total ? Math.round(practice.correct / total * 100) : 0;
    return `
      <section class="practice-panel" style="text-align:center">
        <div class="eyebrow">CHALLENGE COMPLETE</div>
        <h1 class="review-title" style="margin:8px 0 5px">ひと結び、できたね。</h1>
        <p class="lesson-text">文と文の関係を考えて、最後まで取り組めました。</p>\n        ${renderNavi("complete")}
        <div class="review-summary">
          <div class="stat-card"><div class="stat-value">${practice.correct}</div><div class="stat-label">正解</div></div>
          <div class="stat-card"><div class="stat-value">${practice.wrong}</div><div class="stat-label">もう一度考えたい問題</div></div>
          <div class="stat-card"><div class="stat-value">${rate}%</div><div class="stat-label">正解率</div></div>
        </div>
        <div class="button-row" style="justify-content:center">
          <button class="primary-btn" type="button" data-action="retry-session">もう10問に挑戦</button>
          <button class="secondary-btn" type="button" data-action="go-review">ふり返りを見る</button>
          <button class="quiet-btn" type="button" data-action="go-learn">学習にもどる</button>
        </div>
      </section>`;
  }

  function renderReview() {
    const rate = store.attempts ? Math.round(store.correct / store.attempts * 100) : 0;
    const learned = masteredCount();
    const total = DATA.questions.length;
    const mistakeIds = unresolvedMistakes();
    const mistakeRows = mistakeIds.map(id => {
      const q = questionById(id);
      if (!q) return "";
      const cat = categoryById(q.cat);
      return `
        <div class="mistake-row">
          <span class="card-symbol">？</span>
          <div class="mistake-copy"><strong>${esc(cat.name)}｜${esc(q.before)} ${esc(q.after)}</strong><span>まちがえた回数：${Number(store.mistakes[id]) || 0}回 · ${esc(q.answer)} が入るよ</span></div>
          <button class="quiet-btn" type="button" data-action="retry-one" data-id="${q.id}">もう一度</button>
        </div>`;
    }).join("");

    const progress = DATA.categories.map(cat => {
      const qs = DATA.questions.filter(q => q.cat === cat.id);
      const done = qs.filter(q => store.solved[q.id]).length;
      return `<div class="stat-card"><div class="stat-value">${done}<span style="font-size:13px;color:var(--muted)"> / ${qs.length}</span></div><div class="stat-label">${esc(cat.name)}｜理解した問題</div><div class="progress-track" style="margin:10px 0 0"><div class="progress-fill" style="width:${done / qs.length * 100}%"></div></div></div>`;
    }).join("");

    const badges = [
      { ok: store.attempts >= 1, name:"はじめの一歩", desc:"1問に挑戦" },
      { ok: store.correct >= 10, name:"ことば結び", desc:"10問正解" },
      { ok: DATA.categories.every(cat => DATA.questions.some(q => q.cat === cat.id && store.solved[q.id])), name:"六つのはたらき", desc:"全種類で正解" },
      { ok: store.correct >= 50, name:"つなぎの達人", desc:"50問正解" },
      { ok: learned >= total, name:"ことむすびの名人", desc:"すべての問題を理解" }
    ].map(b => `<span class="achievement ${b.ok ? "" : "locked"}">${b.ok ? "◆" : "◇"} ${b.name} <span style="opacity:.7">${b.desc}</span></span>`).join("");

    return `
      <div class="eyebrow">YOUR RECORD</div><h1 class="review-title">学びのふり返り</h1>
      <section class="review-summary">
        <div class="stat-card"><div class="stat-value">${store.attempts}</div><div class="stat-label">挑戦した問題</div></div>
        <div class="stat-card"><div class="stat-value">${store.correct}</div><div class="stat-label">正解した問題</div></div>
        <div class="stat-card"><div class="stat-value">${rate}%</div><div class="stat-label">正解率</div></div>
      </section>
      <div class="section-head"><div><h2>六つのはたらき</h2><p>一つずつ、理解した問題を増やしていこう。</p></div><p>${learned} / ${total}問</p></div>
      <section class="review-summary">${progress}</section>
      <div class="section-head"><div><h2>もう一度考えたい問題</h2><p>間違えた問題はここに残ります。正解するとリストから卒業します。</p></div><p>${mistakeIds.length}問</p></div>
      <section class="mistake-list">
        ${mistakeRows || `<div class="review-panel empty-state"><div class="empty-mark">結</div><strong>今のところ、特訓する問題はありません。</strong><p>問題に挑戦すると、ここに復習したい問題が集まります。</p></div>`}
      </section>
      <div class="section-head"><div><h2>学びのしるし</h2><p>挑戦や理解の積み重ねで増えていきます。</p></div></div>
      <div class="badge-row">${badges}</div>
      <div class="detail-actions"><button class="primary-btn" type="button" data-action="start-weak">苦手な問題を特訓する</button><button class="quiet-btn" type="button" data-action="go-learn">学習にもどる</button></div>`;
  }

  function answerQuestion(choice) {
    if (!practice || practice.answered) return;
    const q = practice.queue[practice.index];
    practice.answered = true;
    practice.selected = choice;
    store.attempts += 1;
    if (choice === q.answer) {
      practice.correct += 1;
      store.correct += 1;
      store.solved[q.id] = true;
      if (Number(store.mistakes[q.id]) > 0) store.cleared[q.id] = true;
    } else {
      practice.wrong += 1;
      store.mistakes[q.id] = (Number(store.mistakes[q.id]) || 0) + 1;
      store.cleared[q.id] = false;
    }
    saveStore();
    render();
  }

  function nextQuestion() {
    if (!practice || !practice.answered) return;
    practice.index += 1;
    practice.answered = false;
    practice.selected = null;
    render();
  }

  document.addEventListener("click", event => {
    const nav = event.target.closest("[data-page]");
    if (nav && nav.classList.contains("nav-tab")) {
      page = nav.dataset.page;
      practice = null;
      selectedCategory = null;
      render();
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "open-category") {
      selectedCategory = button.dataset.cat;
      page = "learn";
      render();
    } else if (action === "back-home" || action === "go-learn") {
      selectedCategory = null; practice = null; page = "learn"; render();
    } else if (action === "practice-category") {
      selectedPracticeCategory = button.dataset.cat;
      startPractice("normal", selectedPracticeCategory);
    } else if (action === "start-practice") {
      startPractice("normal", selectedPracticeCategory);
    } else if (action === "start-weak") {
      startPractice("weak", "all");
    } else if (action === "answer") {
      answerQuestion(button.dataset.choice);
    } else if (action === "next-question") {
      nextQuestion();
    } else if (action === "end-practice") {
      practice = null; page = "practice"; render();
    } else if (action === "go-review") {
      practice = null; page = "review"; render();
    } else if (action === "retry-session") {
      const prevMode = practice?.mode || "normal";
      const prevCat = selectedPracticeCategory;
      startPractice(prevMode === "weak" ? "weak" : "normal", prevCat);
    } else if (action === "retry-one") {
      startPractice("single", button.dataset.id);
    } else if (action === "demo") {
      demoIndex = Number(button.dataset.demo) || 0;
      render();
    }
  });

  document.addEventListener("change", event => {
    if (event.target.id === "practice-category") {
      selectedPracticeCategory = event.target.value;
    }
  });

  render();
})();