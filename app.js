// ── State ─────────────────────────────────────
let config = null;
const ORDER_REGEX = /^ORD-\d{4}$/;

// ── Init ──────────────────────────────────────
window.onload = () => {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("todayDate").textContent = formatDate(today);
  document.getElementById("entryDate").value = today;
  document.getElementById("dashDate").value = today;
  fetchConfig();
};

// ── Tab Switch ────────────────────────────────
function switchTab(tab, el) {
  document.querySelectorAll(".tab-content").forEach(e => e.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(e => e.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
  el.classList.add("active");
  if (tab === "worker") loadWorkerDashboard();
}

// ── Fetch Config ──────────────────────────────
function fetchConfig() {
  fetch(GAS_URL + "?action=getConfig")
    .then(r => r.json())
    .then(data => {
      config = data;
      populateHalls();
      document.getElementById("configLoader").style.display = "none";
      document.getElementById("entryForm").style.display = "block";
    })
    .catch(() => {
      document.getElementById("configLoader").innerHTML =
        '<p style="color:#dc2626;text-align:center;">❌ Config load nahi hua.<br>GAS URL check karo (config.js).</p>';
    });
}

function populateHalls() {
  const sel = document.getElementById("hallSelect");
  sel.innerHTML = '<option value="">-- Hall Select Karo --</option>';
  config.halls.forEach(h => {
    const opt = document.createElement("option");
    opt.value = h; opt.textContent = h;
    sel.appendChild(opt);
  });
}

function onHallChange() {
  const hall = document.getElementById("hallSelect").value;
  const stageSel  = document.getElementById("stageSelect");
  const workerSel = document.getElementById("workerSelect");

  if (!hall) {
    stageSel.innerHTML  = '<option value="">-- Pehle Hall Select Karo --</option>';
    workerSel.innerHTML = '<option value="">-- Pehle Hall Select Karo --</option>';
    stageSel.disabled = workerSel.disabled = true;
    return;
  }

  stageSel.innerHTML = '<option value="">-- Stage Select Karo --</option>';
  (config.stages[hall] || []).forEach(s => {
    const opt = document.createElement("option");
    opt.value = s; opt.textContent = s;
    stageSel.appendChild(opt);
  });
  stageSel.disabled = false;

  workerSel.innerHTML = '<option value="">-- Worker Select Karo --</option>';
  (config.workers[hall] || []).forEach(w => {
    const opt = document.createElement("option");
    opt.value = w; opt.textContent = w;
    workerSel.appendChild(opt);
  });
  workerSel.disabled = false;
}

// ── Order ID Validation ───────────────────────
function validateOrderId(input) {
  const val  = input.value.toUpperCase().trim();
  const hint = document.getElementById("orderIdHint");
  input.value = val;

  if (!val) {
    input.classList.remove("valid", "invalid");
    hint.textContent = "";
    hint.className = "input-hint";
    return false;
  }
  if (ORDER_REGEX.test(val)) {
    input.classList.add("valid"); input.classList.remove("invalid");
    hint.textContent = "✓ Valid Order ID";
    hint.className = "input-hint ok";
    return true;
  } else {
    input.classList.add("invalid"); input.classList.remove("valid");
    hint.textContent = "Format: ORD-0001";
    hint.className = "input-hint err";
    return false;
  }
}

function validateSearchId(input) {
  const val  = input.value.toUpperCase().trim();
  const hint = document.getElementById("searchIdHint");
  input.value = val;

  if (!val) {
    input.classList.remove("valid", "invalid");
    hint.textContent = "";
    hint.className = "input-hint";
    return false;
  }
  if (ORDER_REGEX.test(val)) {
    input.classList.add("valid"); input.classList.remove("invalid");
    hint.textContent = "✓ Valid";
    hint.className = "input-hint ok";
    return true;
  } else {
    input.classList.add("invalid"); input.classList.remove("valid");
    hint.textContent = "Format: ORD-0001";
    hint.className = "input-hint err";
    return false;
  }
}

// ── Submit Entry ──────────────────────────────
function submitEntry() {
  const date     = document.getElementById("entryDate").value;
  const orderId  = document.getElementById("orderIdInput").value.trim().toUpperCase();
  const hall     = document.getElementById("hallSelect").value;
  const stage    = document.getElementById("stageSelect").value;
  const worker   = document.getElementById("workerSelect").value;
  const quantity = document.getElementById("quantityInput").value;

  if (!date || !orderId || !hall || !stage || !worker || !quantity) {
    showToast("⚠️ Saare fields fill karo", "error"); return;
  }
  if (!ORDER_REGEX.test(orderId)) {
    showToast("⚠️ Order ID format galat hai (ORD-0001)", "error"); return;
  }

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Submitting...";

  fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify({ action: "submitEntry", date, orderId, hall, stage, worker, quantity })
  })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        showToast("✅ Entry save ho gayi!", "success");
        resetForm();
      } else {
        showToast("❌ Error: " + res.error, "error");
      }
    })
    .catch(() => showToast("❌ Submit fail hua", "error"))
    .finally(() => {
      btn.disabled = false;
      btn.textContent = "✅ Submit Entry";
    });
}

function resetForm() {
  document.getElementById("orderIdInput").value = "";
  document.getElementById("orderIdInput").classList.remove("valid", "invalid");
  document.getElementById("orderIdHint").textContent = "";
  document.getElementById("hallSelect").value = "";
  document.getElementById("stageSelect").innerHTML  = '<option value="">-- Pehle Hall Select Karo --</option>';
  document.getElementById("stageSelect").disabled   = true;
  document.getElementById("workerSelect").innerHTML = '<option value="">-- Pehle Hall Select Karo --</option>';
  document.getElementById("workerSelect").disabled  = true;
  document.getElementById("quantityInput").value    = "";
}

// ══════════════════════════════════════════════
// WORKER DASHBOARD
// ══════════════════════════════════════════════
function loadWorkerDashboard() {
  const date = document.getElementById("dashDate").value;
  const hall = document.getElementById("dashHall").value;

  document.getElementById("workerLogBody").innerHTML =
    '<div class="loading"><div class="spinner"></div>Loading...</div>';
  document.getElementById("workerSummaryBody").innerHTML = "";
  document.getElementById("totalEntries").textContent  = "-";
  document.getElementById("totalQty").textContent      = "-";
  document.getElementById("totalWorkers").textContent  = "-";

  let url = GAS_URL + "?action=getLogs&date=" + date;
  if (hall !== "All") url += "&hall=" + encodeURIComponent(hall);

  fetch(url)
    .then(r => r.json())
    .then(data => renderWorkerDashboard(data.logs || []))
    .catch(() => {
      document.getElementById("workerLogBody").innerHTML =
        '<div class="empty">❌ Data load nahi hua</div>';
    });
}

function renderWorkerDashboard(logs) {
  const totalQty      = logs.reduce((s, r) => s + (parseInt(r.quantity) || 0), 0);
  const uniqueWorkers = new Set(logs.map(r => r.worker)).size;
  document.getElementById("totalEntries").textContent = logs.length;
  document.getElementById("totalQty").textContent     = totalQty;
  document.getElementById("totalWorkers").textContent = uniqueWorkers;

  // Worker Summary
  const workerMap = {};
  logs.forEach(r => {
    if (!workerMap[r.worker]) workerMap[r.worker] = { hall: r.hall, total: 0, stages: {} };
    workerMap[r.worker].total += parseInt(r.quantity) || 0;
    workerMap[r.worker].stages[r.stage] =
      (workerMap[r.worker].stages[r.stage] || 0) + (parseInt(r.quantity) || 0);
  });

  if (Object.keys(workerMap).length === 0) {
    document.getElementById("workerSummaryBody").innerHTML = '<div class="empty">Koi data nahi</div>';
  } else {
    let wHtml = `<table class="worker-table">
      <thead><tr><th>Worker</th><th>Hall</th><th>Stage Breakdown</th><th>Total</th></tr></thead><tbody>`;
    Object.entries(workerMap).forEach(([name, info]) => {
      const breakdown = Object.entries(info.stages)
        .map(([s, q]) => `${s}: <b>${q}</b>`).join("<br>");
      wHtml += `<tr>
        <td><b>${name}</b></td>
        <td>${info.hall}</td>
        <td style="font-size:12px;line-height:1.9">${breakdown}</td>
        <td><b>${info.total}</b></td></tr>`;
    });
    wHtml += "</tbody></table>";
    document.getElementById("workerSummaryBody").innerHTML = wHtml;
  }

  // Detailed Log
  if (logs.length === 0) {
    document.getElementById("workerLogBody").innerHTML =
      '<div class="empty">Is date ka koi data nahi hai</div>';
    return;
  }

  let html = `<table class="log-table">
    <thead><tr><th>Order ID</th><th>Worker</th><th>Hall</th><th>Stage</th><th>Qty</th></tr></thead><tbody>`;
  logs.forEach(r => {
    const badge = r.hall === "Prismatic"
      ? `<span class="badge badge-prismatic">${r.hall}</span>`
      : `<span class="badge badge-2w">${r.hall}</span>`;
    html += `<tr>
      <td><span class="badge badge-order">${r.orderId || "-"}</span></td>
      <td>${r.worker}</td>
      <td>${badge}</td>
      <td>${r.stage}</td>
      <td><b>${r.quantity}</b></td></tr>`;
  });
  html += "</tbody></table>";
  document.getElementById("workerLogBody").innerHTML = html;
}

// ══════════════════════════════════════════════
// ORDER TRACKING
// ══════════════════════════════════════════════
function searchOrder() {
  const input = document.getElementById("orderSearchInput");
  const orderId = input.value.trim().toUpperCase();

  if (!ORDER_REGEX.test(orderId)) {
    showToast("⚠️ Valid Order ID daalo (ORD-0001)", "error"); return;
  }

  const resultDiv = document.getElementById("orderResult");
  resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Searching...</div>';

  fetch(GAS_URL + "?action=getOrderLogs&orderId=" + encodeURIComponent(orderId))
    .then(r => r.json())
    .then(data => renderOrderResult(orderId, data.logs || []))
    .catch(() => {
      resultDiv.innerHTML = '<div class="empty">❌ Data load nahi hua</div>';
    });
}

function renderOrderResult(orderId, logs) {
  const resultDiv = document.getElementById("orderResult");

  if (logs.length === 0) {
    resultDiv.innerHTML = `<div class="card"><div class="empty">❌ <b>${orderId}</b> ka koi record nahi mila</div></div>`;
    return;
  }

  const totalQty      = logs.reduce((s, r) => s + (parseInt(r.quantity) || 0), 0);
  const uniqueWorkers = new Set(logs.map(r => r.worker)).size;
  const halls         = [...new Set(logs.map(r => r.hall))].join(", ");

  // Stage-wise summary
  const stageMap = {};
  logs.forEach(r => {
    if (!stageMap[r.stage]) stageMap[r.stage] = { qty: 0, workers: new Set(), dates: [] };
    stageMap[r.stage].qty += parseInt(r.quantity) || 0;
    stageMap[r.stage].workers.add(r.worker);
    stageMap[r.stage].dates.push(r.date);
  });

  // Stage progress rows
  let stageHtml = "";
  Object.entries(stageMap).forEach(([stage, info]) => {
    const workers = [...info.workers].join(", ");
    const latestDate = info.dates.sort().reverse()[0];
    stageHtml += `
      <div class="stage-row">
        <div class="stage-dot done"></div>
        <div style="flex:1">
          <div class="stage-name">${stage}</div>
          <div class="stage-who">👷 ${workers} &nbsp;•&nbsp; 📅 ${formatDate(latestDate)}</div>
        </div>
        <div class="stage-qty">${info.qty}</div>
      </div>`;
  });

  // Detailed entries table
  let tableHtml = `<table class="order-table">
    <thead><tr><th>Date</th><th>Stage</th><th>Worker</th><th>Hall</th><th>Qty</th></tr></thead><tbody>`;
  logs.forEach(r => {
    const badge = r.hall === "Prismatic"
      ? `<span class="badge badge-prismatic">${r.hall}</span>`
      : `<span class="badge badge-2w">${r.hall}</span>`;
    tableHtml += `<tr>
      <td>${formatDate(r.date)}</td>
      <td>${r.stage}</td>
      <td>${r.worker}</td>
      <td>${badge}</td>
      <td><b>${r.quantity}</b></td></tr>`;
  });
  tableHtml += "</tbody></table>";

  resultDiv.innerHTML = `
    <div class="card">
      <div class="order-header">
        <div class="order-id-badge">📦 ${orderId}</div>
        <div class="order-stats">
          <div class="order-stat"><div class="v">${totalQty}</div><div class="l">Batteries</div></div>
          <div class="order-stat"><div class="v">${uniqueWorkers}</div><div class="l">Workers</div></div>
          <div class="order-stat"><div class="v">${logs.length}</div><div class="l">Entries</div></div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px;">Hall: ${halls}</div>

      <div class="card-title" style="margin-top:8px;">Stage Progress</div>
      <div class="stage-progress">${stageHtml}</div>
    </div>

    <div class="card">
      <div class="card-title">📋 All Entries</div>
      <div class="table-wrap">${tableHtml}</div>
    </div>`;
}

// ── Toast ─────────────────────────────────────
function showToast(msg, type = "") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show " + type;
  setTimeout(() => { t.className = "toast"; }, 3000);
}

// ── Format Date ───────────────────────────────
function formatDate(d) {
  if (!d) return "-";
  const str = d.toString().substring(0, 10);
  const [y, m, day] = str.split("-");
  return `${day}/${m}/${y}`;
}
