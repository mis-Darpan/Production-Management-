// ── State ─────────────────────────────────────
let config = null;

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
  if (tab === "dashboard") loadDashboard();
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

// ── Submit Entry ──────────────────────────────
function submitEntry() {
  const date     = document.getElementById("entryDate").value;
  const hall     = document.getElementById("hallSelect").value;
  const stage    = document.getElementById("stageSelect").value;
  const worker   = document.getElementById("workerSelect").value;
  const quantity = document.getElementById("quantityInput").value;

  if (!date || !hall || !stage || !worker || !quantity) {
    showToast("⚠️ Saare fields fill karo", "error");
    return;
  }

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Submitting...";

  fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify({ action: "submitEntry", date, hall, stage, worker, quantity })
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
  document.getElementById("hallSelect").value = "";
  document.getElementById("stageSelect").innerHTML  = '<option value="">-- Pehle Hall Select Karo --</option>';
  document.getElementById("stageSelect").disabled   = true;
  document.getElementById("workerSelect").innerHTML = '<option value="">-- Pehle Hall Select Karo --</option>';
  document.getElementById("workerSelect").disabled  = true;
  document.getElementById("quantityInput").value    = "";
}

// ── Dashboard ─────────────────────────────────
function loadDashboard() {
  const date = document.getElementById("dashDate").value;
  const hall = document.getElementById("dashHall").value;

  document.getElementById("dashboardBody").innerHTML =
    '<div class="loading"><div class="spinner"></div>Loading...</div>';
  document.getElementById("workerSummaryBody").innerHTML = "";

  let url = GAS_URL + "?action=getLogs&date=" + date;
  if (hall !== "All") url += "&hall=" + encodeURIComponent(hall);

  fetch(url)
    .then(r => r.json())
    .then(data => renderDashboard(data.logs || []))
    .catch(() => {
      document.getElementById("dashboardBody").innerHTML =
        '<div class="empty">❌ Data load nahi hua</div>';
    });
}

function renderDashboard(logs) {
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

  let wHtml = "";
  if (Object.keys(workerMap).length === 0) {
    wHtml = '<div class="empty">Koi data nahi</div>';
  } else {
    wHtml = `<table class="worker-table">
      <thead><tr><th>Worker</th><th>Hall</th><th>Stage Breakdown</th><th>Total</th></tr></thead><tbody>`;
    Object.entries(workerMap).forEach(([name, info]) => {
      const breakdown = Object.entries(info.stages)
        .map(([s, q]) => `${s}: <b>${q}</b>`).join("<br>");
      wHtml += `<tr>
        <td><b>${name}</b></td>
        <td>${info.hall}</td>
        <td style="font-size:12px;line-height:1.8">${breakdown}</td>
        <td><b>${info.total}</b></td></tr>`;
    });
    wHtml += "</tbody></table>";
  }
  document.getElementById("workerSummaryBody").innerHTML = wHtml;

  // Detailed Log
  if (logs.length === 0) {
    document.getElementById("dashboardBody").innerHTML =
      '<div class="empty">Is date ka koi data nahi hai</div>';
    return;
  }

  let html = `<table class="log-table">
    <thead><tr><th>Worker</th><th>Hall</th><th>Stage</th><th>Qty</th></tr></thead><tbody>`;
  logs.forEach(r => {
    const badge = r.hall === "Prismatic"
      ? `<span class="badge badge-prismatic">${r.hall}</span>`
      : `<span class="badge badge-2w">${r.hall}</span>`;
    html += `<tr><td>${r.worker}</td><td>${badge}</td><td>${r.stage}</td><td><b>${r.quantity}</b></td></tr>`;
  });
  html += "</tbody></table>";
  document.getElementById("dashboardBody").innerHTML = html;
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
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
