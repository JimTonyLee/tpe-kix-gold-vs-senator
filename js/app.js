const DIST = 1060;

const FARES = [
  { id: "econ_basic", name: "經濟基本 S/W/V · 50%", rate: 0.5, seg: 0.5, price: 16000, cabin: "Y" },
  { id: "econ_std", name: "經濟經典 M/H/Q · 75%", rate: 0.75, seg: 0.75, price: 20000, cabin: "Y" },
  { id: "econ_up", name: "經濟尊寵 Y/B · 100%", rate: 1, seg: 1, price: 26000, cabin: "Y" },
  { id: "biz_basic", name: "商務基本 D · 125%", rate: 1.25, seg: 1.5, price: 41200, cabin: "J" },
  { id: "biz_std", name: "商務經典 J · 150%", rate: 1.5, seg: 1.75, price: 48000, cabin: "J" },
  { id: "biz_up", name: "商務尊寵 C · 175%", rate: 1.75, seg: 2, price: 52700, cabin: "J" }
];

const GOALS = {
  get: { miles: 50000, segs: 50, months: 12, label: "已是銀卡升金卡" },
  "from-green": { miles: 80000, segs: 76, months: 12, label: "綠卡從零到金卡", extra: "從綠卡不能直接跳金。先 30,000 哩＋長榮／立榮至少 4 段升銀；升銀後剩餘哩程可留 1 年衝金，故哩程路徑合計約 80,000。航段剩餘不保留，航段路徑為 26＋50。" },
  keep: { miles: 80000, segs: 80, months: 24, label: "金卡續卡" },
  senator: { miles: 0, segs: 0, months: 12, label: "參議員保級" }
};

function ceilDiv(a, b) {
  if (b <= 0) return Infinity;
  return Math.ceil(a / b);
}

function money(n) {
  if (!isFinite(n)) return "—";
  return "NT$" + Math.round(n).toLocaleString("zh-TW");
}

function rtStats(fare) {
  return {
    miles: Math.round(DIST * fare.rate * 2),
    segs: +(fare.seg * 2).toFixed(2),
    points: fare.cabin === "J" ? 80 : 40,
    qp: 0
  };
}

function evaPlan(fare, goalKey, price) {
  const goal = GOALS[goalKey];
  const rt = rtStats(fare);
  const byMiles = ceilDiv(goal.miles, rt.miles);
  const bySegs = ceilDiv(goal.segs, rt.segs);
  const trips = Math.min(byMiles, bySegs);
  const path = byMiles <= bySegs ? "卡籍哩程" : "加權航段";
  return { rt, byMiles, bySegs, trips, path, cost: trips * price, perYear: (trips / (goal.months / 12)) };
}

function senatorPlan(fare, price) {
  const rt = rtStats(fare);
  const tripsIfPointsOnly = ceilDiv(2000, rt.points);
  const hypoTrips = tripsIfPointsOnly;
  return {
    rt,
    possible: false,
    tripsIfPointsOnly,
    hypoTrips,
    hypoCost: hypoTrips * price,
    reason: "長榮／全日空執飛台阪只有 Points、沒有 Qualifying Points。Points 再多，QP 仍是 0，不能保參議員。"
  };
}

function renderResult() {
  const goalKey = document.querySelector("input[name=goal]:checked").value;
  const fare = FARES.find((f) => f.id === document.getElementById("fare").value);
  const price = Number(document.getElementById("price").value) || fare.price;
  const box = document.getElementById("result");

  if (goalKey === "senator") {
    const s = senatorPlan(fare, price);
    box.innerHTML = `
      <p><span class="badge no">無法保級</span></p>
      <p class="big">QP = 0</p>
      <p>${s.reason}</p>
      <dl>
        <dt>此票來回 Points</dt><dd>${s.rt.points} 點 · QP 0</dd>
        <dt>若只看 Points</dt><dd>約 ${s.tripsIfPointsOnly} 趟可湊滿 2,000 Points，但仍缺 1,000 QP</dd>
        <dt>假設漢莎集團執飛同大陸</dt><dd>${s.hypoTrips} 趟來回 · ${money(s.hypoCost)}／日曆年</dd>
        <dt>真實保級參考</dt><dd>跨大陸商務約 5 個來回（10 段 × 200 點），必須是漢莎集團金屬</dd>
      </dl>
    `;
    return;
  }

  const p = evaPlan(fare, goalKey, price);
  const goal = GOALS[goalKey];
  box.innerHTML = `
    <p><span class="badge ok">${goal.label}</span> <span class="badge warn">${p.path}較省趟</span></p>
    <p class="big">${p.trips} 趟台阪來回</p>
    <p>總花費約 <strong>${money(p.cost)}</strong> · 期間 ${goal.months} 個月 · 平均每年 ${p.perYear.toFixed(1)} 趟</p>
    <dl>
      <dt>每趟累積</dt><dd>${p.rt.miles.toLocaleString("zh-TW")} 卡籍哩程 · ${p.rt.segs} 航段</dd>
      <dt>哩程路徑</dt><dd>${p.byMiles} 趟</dd>
      <dt>航段路徑</dt><dd>${p.bySegs} 趟</dd>
      <dt>採用</dt><dd>${p.path}（${p.trips} 趟）</dd>
      <dt>單趟票價</dt><dd>${money(price)}</dd>
    </dl>
    ${goal.extra ? `<p class="fine">${goal.extra}</p>` : ""}
    ${goalKey === "get" ? "<p class=\"fine\">金卡從達成次月 1 日起算 2 年。這 50,000 哩是在銀卡期間累的，續金還要再另計 2 年 80,000 哩。</p>" : ""}
  `;
}

function fillSelect() {
  const sel = document.getElementById("fare");
  sel.innerHTML = FARES.map((f) => `<option value="${f.id}">${f.name}</option>`).join("");
  sel.value = "econ_std";
}

function syncPrice() {
  const fare = FARES.find((f) => f.id === document.getElementById("fare").value);
  document.getElementById("price").value = fare.price;
}

function fillMatrix() {
  const tbody = document.querySelector("#matrix tbody");
  tbody.innerHTML = FARES.map((fare) => {
    const get = evaPlan(fare, "from-green", fare.price);
    const keep = evaPlan(fare, "keep", fare.price);
    const sen = senatorPlan(fare, fare.price);
    return `<tr>
      <td>${fare.name}</td>
      <td>${money(fare.price)}</td>
      <td>${get.trips}</td>
      <td>${money(get.cost)}</td>
      <td>${keep.trips}</td>
      <td>${money(keep.cost)}</td>
      <td>無法 · QP 0</td>
      <td>${sen.hypoTrips} 趟／年 · ${money(sen.hypoCost)}</td>
    </tr>`;
  }).join("");
}

function init() {
  fillSelect();
  fillMatrix();
  const form = document.getElementById("calc-form");
  form.addEventListener("change", (e) => {
    if (e.target && e.target.id === "fare") syncPrice();
    renderResult();
  });
  form.addEventListener("input", renderResult);
  renderResult();
}

init();
