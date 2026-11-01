(() => {
  "use strict";
  // 読みが固定の言葉だけにふりがなを付ける（文脈で読みが変わる漢字には付けない）
  const DICT = {
    "接続詞": "せつぞくし", "具体例": "ぐたいてき", "避難": "ひなん", "資源": "しげん",
    "観察": "かんさつ", "実験": "じっけん", "発表": "はっぴょう", "準備": "じゅんび",
    "確認": "かくにん", "集合": "しゅうごう", "時刻": "じこく", "地図": "ちず",
    "道路": "どうろ", "工事": "こうじ", "安全": "あんぜん", "交通": "こうつう",
    "防災": "ぼうさい", "災害": "さいがい", "食料": "しょくりょう", "家具": "かぐ",
    "地域": "ちいき", "学校": "がっこう", "校庭": "こうてい", "体育館": "たいいくかん",
    "図書館": "としょかん", "博物館": "はくぶつかん", "公園": "こうえん", "会場": "かいじょう",
    "順番": "じゅんばん", "役割": "やくわり", "意見": "いけん", "結論": "けつろん",
    "練習": "れんしゅう", "記録": "きろく", "大会": "たいかい", "本番": "ほんばん",
    "緊張": "きんちょう", "自信": "じしん", "苦手": "にがて", "順接": "じゅんせつ",
    "逆接": "ぎゃくせつ", "並列": "へいれつ", "累加": "るいか", "対比": "たいひ",
    "選択": "せんたく", "説明": "せつめい", "補足": "ほそく", "転換": "てんかん",
    "問題": "もんだい", "挑戦": "ちょうせん", "特訓": "とっくん", "正解": "せいかい",
    "理解": "りかい", "卒業": "そつぎょう", "学習": "がくしゅう", "関係": "かんけい",
    "理由": "りゆう", "結果": "けっか", "予想": "よそう", "原因": "げんいん",
    "条件": "じょうけん", "文章": "ぶんしょう", "文脈": "ぶんみゃく", "内容": "ないよう",
    "意味": "いみ", "言葉": "ことば", "表現": "ひょうげん", "情報": "じょうほう",
    "特徴": "とくちょう", "様子": "ようす", "出来事": "できごと", "状況": "じょうきょう",
    "行動": "こうどう", "段階": "だんかい", "話題": "わだい", "合図": "あいず",
    "当然": "とうぜん", "実際": "じっさい", "工夫": "くふう", "仕組み": "しくみ",
    "働き": "はたらき", "自然": "しぜん", "動物": "どうぶつ", "植物": "しょくぶつ",
    "歴史": "れきし", "文化": "ぶんか", "産業": "さんぎょう", "環境": "かんきょう",
    "発電": "はつでん", "太陽": "たいよう", "風力": "ふうりょく", "花粉": "かふん",
    "養分": "ようぶん", "日光": "にっこう", "水分": "すいぶん", "気温": "きおん",
    "天気": "てんき", "季節": "きせつ", "世界": "せかい", "人々": "ひとびと",
    "家族": "かぞく", "友達": "ともだち", "先生": "せんせい", "地域の人": "ちいきのひと",
    "全員": "ぜんいん", "自分": "じぶん", "相手": "あいて", "質問": "しつもん",
    "答え": "こたえ", "考え": "かんがえ", "気持ち": "きもち", "大切": "たいせつ",
    "必要": "ひつよう", "可能": "かのう", "自由": "じゆう", "有名": "ゆうめい",
    "美しい": "うつくしい", "正しい": "ただしい", "新しい": "あたらしい", "古い": "ふるい",
    "大きい": "おおきい", "小さい": "ちいさい", "高い": "たかい", "多い": "おおい",
    "少ない": "すくない", "強い": "つよい", "弱い": "よわい", "早い": "はやい",
    "速い": "はやい", "遅い": "おそい", "近づく": "ちかづく", "集まる": "あつまる",
    "比べる": "くらべる", "選ぶ": "えらぶ", "確かめる": "たしかめる", "伝える": "つたえる",
    "始める": "はじめる", "続ける": "つづける", "終わる": "おわる", "増える": "ふえる",
    "減る": "へる", "変わる": "かわる", "広がる": "ひろがる", "深まる": "ふかまる",
    "育つ": "そだつ", "咲く": "さく", "実": "み", "葉": "は", "根": "ね", "芽": "め",
    "種": "たね", "森": "もり", "林": "はやし", "川": "かわ", "海": "うみ", "山": "やま",
    "空": "そら", "雨": "あめ", "雪": "ゆき", "風": "かぜ", "雲": "くも", "星": "ほし",
    "月": "つき", "火": "ひ", "水": "みず", "土": "つち", "石": "いし", "岩": "いわ",
    "橋": "はし", "道": "みち", "駅": "えき", "店": "みせ", "家": "いえ", "町": "まち",
    "村": "むら", "島": "しま", "湖": "みずうみ", "池": "いけ", "滝": "たき", "畑": "はたけ",
    "花だん": "はなだん", "芝生": "しばふ", "遊具": "ゆうぐ", "道具": "どうぐ", "材料": "ざいりょう",
    "荷物": "にもつ", "持ち物": "もちもの", "名前": "なまえ", "写真": "しゃしん", "本": "ほん",
    "本棚": "ほんだな", "辞典": "じてん", "国語": "こくご", "漢字": "かんじ", "文字": "もじ",
    "声": "こえ", "音": "おと", "歌": "うた", "絵": "え", "色": "いろ", "形": "かたち",
    "時間": "じかん", "今日": "きょう", "明日": "あした", "昨日": "きのう", "朝": "あさ",
    "昼": "ひる", "夜": "よる", "午前": "ごぜん", "午後": "ごご", "毎日": "まいにち",
    "最初": "さいしょ", "最後": "さいご", "次": "つぎ", "前": "まえ", "後": "あと",
    "一度": "いちど", "何度": "なんど", "全部": "ぜんぶ", "一人": "ひとり", "二人": "ふたり"
  };
  const WORDS = Object.keys(DICT).sort((a, b) => b.length - a.length);
  const KEY = "kotomusubi-furigana-v1";
  let on = localStorage.getItem(KEY) !== "off";

  function rubify(text) {
    let out = null;
    let i = 0;
    let buf = "";
    const flush = () => { if (buf) { (out ||= []).push(document.createTextNode(buf)); buf = ""; } };
    while (i < text.length) {
      let hit = null;
      for (const w of WORDS) {
        if (text.startsWith(w, i)) { hit = w; break; }
      }
      if (hit) {
        flush();
        const ruby = document.createElement("ruby");
        ruby.dataset.furi = "1";
        ruby.appendChild(document.createTextNode(hit));
        const rt = document.createElement("rt");
        rt.textContent = DICT[hit];
        ruby.appendChild(rt);
        (out ||= []).push(ruby);
        i += hit.length;
      } else {
        buf += text[i];
        i++;
      }
    }
    flush();
    return out;
  }

  function apply(root) {
    if (!on || !root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !/[一-鿿]/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (!p || p.closest("ruby,script,style,rt")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const parts = rubify(node.nodeValue);
      if (parts && parts.some(p => p.nodeType !== 3)) {
        const frag = document.createDocumentFragment();
        parts.forEach(p => frag.appendChild(p));
        node.replaceWith(frag);
      }
    }
  }

  function removeAll(root) {
    root.querySelectorAll("ruby[data-furi]").forEach(r => {
      r.replaceWith(document.createTextNode(r.firstChild ? r.firstChild.nodeValue : ""));
    });
  }

  const root = document.body;
  const btn = document.getElementById("furiganaBtn");
  function syncBtn() {
    if (!btn) return;
    btn.innerHTML = "ふりがな <b>" + (on ? "ON" : "OFF") + "</b>";
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  if (btn) {
    btn.addEventListener("click", () => {
      on = !on;
      localStorage.setItem(KEY, on ? "on" : "off");
      if (on) apply(root); else removeAll(root);
      syncBtn();
    });
  }
  syncBtn();
  apply(root);
  let queued = false;
  const obs = new MutationObserver(() => {
    if (!on || queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; apply(root); });
  });
  if (root) obs.observe(root, { childList: true, subtree: true, characterData: true });
})();
