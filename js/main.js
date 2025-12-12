/* =====================================================================
   CircuitCraft — Single JS file (session-based)
   - Header account label (sessionStorage)
   - Home: minor UX
   - Builder: Boolean tools (+ sign-in banner if not logged)
   - Tutorials: gate descriptions + mini tables
   - Games: 4 mini-games + per-session scores (reset on refresh)
   - Contact: per-session sign up / login (no persistence)
===================================================================== */

// CircuitCraft JS loaded

// API base URL - automatically detect if running locally or in production
const getBackendUrl = (path) => {
  // Check if API_CONFIG is set (for production deployments)
  if (window.API_CONFIG && window.API_CONFIG.BACKEND_URL) {
    return `${window.API_CONFIG.BACKEND_URL}${path}`;
  }
  
  // Check if running on localhost (development)
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname === '';
  
  if (isLocalhost) {
    // Use local backend server
    return `http://localhost:5000${path}`;
  } else {
    // Fallback: Use production backend API (update this with your Railway URL)
    // This will be overridden by config.js if BACKEND_URL is set
    return `https://circuitcraftramiassi.onrender.com${path}`;
  }
};

// Route by filename
const page = window.location.pathname.split("/").pop() || "index.html";

// Tiny DOM helpers
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const escapeHtml = (str = "") => {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
};
const formatDateOnly = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
};

/* =====================================================================
   SESSION HELPERS
===================================================================== */
function getSessionUser() {
  try { return JSON.parse(sessionStorage.getItem("currentUser") || "null"); }
  catch { return null; }
}
function setSessionUser(user) {
  sessionStorage.setItem("currentUser", JSON.stringify(user));
}
function clearSessionUser() {
  sessionStorage.removeItem("currentUser");
}
function userKey(user = getSessionUser()) {
  return user?.email || user?.name || null;
}

/* =====================================================================
   GLOBAL HEADER — display username if logged in (session-based)
===================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const accountLink = document.getElementById("accountLink");
  if (!accountLink) return;

  const currentUser = getSessionUser();

  if (currentUser?.name) {
    accountLink.textContent = currentUser.name;
    accountLink.href = "contact.html";
    accountLink.style.color = "#00ffcc";
  } else {
    accountLink.textContent = "Sign In";
    accountLink.href = "contact.html";
    accountLink.style.color = "";
  }
});

/* =====================================================================
   HOME (index.html) — simple mobile nav toggle (if present)
===================================================================== */
if (page === "index.html") {
  const menuToggle = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }
}

/* =====================================================================
   === BUILDER PAGE LOGIC =============================================
   Includes: Boolean builder + "Sign in to save" banner visibility
===================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Detect if on builder.html
  const isBuilderPage = window.location.pathname.includes("builder.html");
  if (!isBuilderPage) return;

  // Builder page initialized

  /* ------------------------------------------------------------------
     1. Sign in banner
  ------------------------------------------------------------------ */
  const user = getSessionUser();
  const main = document.querySelector("main");
  const existingBanner = document.getElementById("saveNotice");
  const saveBtn = document.getElementById("saveEquationBtn");
  const viewBtn = document.getElementById("viewEquationsBtn");

  // If user not signed in, show notice
  if (!user && existingBanner) existingBanner.classList.remove("hidden");
  else if (user && existingBanner) existingBanner.classList.add("hidden");

  // Show / hide save + view buttons based on auth
  if (!user) {
    if (saveBtn) saveBtn.classList.add("hidden");
    if (viewBtn) viewBtn.classList.add("hidden");
  } else {
    if (saveBtn) saveBtn.classList.remove("hidden");
    if (viewBtn) viewBtn.classList.remove("hidden");
  }

  // If no banner exists, create one visually (fallback)
  if (!user && !existingBanner && main) {
    const banner = document.createElement("div");
    banner.className = "save-notice";
    banner.id = "saveNotice";
    banner.innerHTML = `<a href="contact.html">Sign up</a> to save equations.`;
    main.prepend(banner);
  }
  if (saveBtn) saveBtn.addEventListener("click", saveEquation);
  if (viewBtn) viewBtn.addEventListener("click", loadEquations);

  /* ------------------------------------------------------------------
     2. Cache elements
  ------------------------------------------------------------------ */
  const eqInput = document.getElementById("eqInput");
  const btnBuild = document.getElementById("btnBuildTable");
  const btnEval = document.getElementById("btnEvalPoint");
  const outputArea = document.getElementById("outputArea");
  const varsPanel = document.getElementById("varsPanel");
  const toggleOps = document.getElementById("toggleOps");
  const opsList = document.getElementById("opsList");

  /* ------------------------------------------------------------------
     3. Collapsible Operators
  ------------------------------------------------------------------ */
  toggleOps?.addEventListener("click", () => {
    const isVisible = opsList.style.display === "block";
    opsList.style.display = isVisible ? "none" : "block";
    toggleOps.textContent = isVisible
      ? "Show Supported Operators ⯆"
      : "Hide Supported Operators ⯅";
  });

  /* ------------------------------------------------------------------
     4. Boolean Logic Engine
  ------------------------------------------------------------------ */
  const BIN = {
    AND: (a, b) => a & b,
    NAND: (a, b) => 1 - (a & b),
    OR: (a, b) => a | b,
    NOR: (a, b) => 1 - (a | b),
    XOR: (a, b) => a ^ b,
    XNOR: (a, b) => 1 - (a ^ b),
    "&": (a, b) => a & b,
    "|": (a, b) => a | b,
    "+": (a, b) => a | b,
    "^": (a, b) => a ^ b,
  };

  const UN = {
    NOT: (a) => 1 - a,
    "!": (a) => 1 - a,
    "'": (a) => 1 - a,
  };

  const normalize = (s) => s.toUpperCase().replace(/\s+/g, "");
  const tokenize = (expr) => {
    const tokens = [];
    let i = 0;
    while (i < expr.length) {
      const c = expr[i];
      if (c === "(" || c === ")") tokens.push(c), i++;
      else if (/^(XNOR|NAND|NOR|XOR|AND|OR|NOT)/.test(expr.slice(i))) {
        const m = /^(XNOR|NAND|NOR|XOR|AND|OR|NOT)/.exec(expr.slice(i))[1];
        tokens.push(m);
        i += m.length;
      } else if ("!&+|^'".includes(c)) tokens.push(c), i++;
      else if (/[A-Z]/.test(c)) tokens.push(c), i++;
      else i++;
    }
    return tokens;
  };

  const toRPN = (tokens) => {
    const out = [],
      ops = [];
    const prec = (t) => (UN[t] ? 4 : BIN[t] ? 2 : 0);
    for (const t of tokens) {
      if (/^[A-Z01]$/.test(t)) out.push(t);
      else if (t === "(") ops.push(t);
      else if (t === ")") {
        while (ops.length && ops.at(-1) !== "(") out.push(ops.pop());
        ops.pop();
      } else {
        while (ops.length && prec(ops.at(-1)) >= prec(t)) out.push(ops.pop());
        ops.push(t);
      }
    }
    while (ops.length) out.push(ops.pop());
    return out;
  };

  const evalRPN = (rpn, env) => {
    const stack = [];
    for (const t of rpn) {
      if (/^[A-Z]$/.test(t)) stack.push(env[t] ?? 0);
      else if (UN[t]) stack.push(UN[t](stack.pop()));
      else if (BIN[t]) {
        const b = stack.pop(),
          a = stack.pop();
        stack.push(BIN[t](a, b));
      }
    }
    return stack[0] & 1;
  };

  const findVars = (expr) => [...new Set(expr.match(/[A-Z]/g) || [])].sort();

  /* ------------------------------------------------------------------
     5. UI Rendering
  ------------------------------------------------------------------ */
  const renderTable = (vars, rpn, expr) => {
    const rows = 1 << vars.length;
    let html = `<div class="truth-container glow">
      <h3>Truth Table for ${expr}</h3>
      <table><thead><tr>${vars.map(v=>`<th>${v}</th>`).join("")}<th>Output</th></tr></thead><tbody>`;
    for (let i = 0; i < rows; i++) {
      const env = {};
      vars.forEach((v, idx) => (env[v] = (i >> (vars.length - 1 - idx)) & 1));
      const out = evalRPN(rpn, env);
      html += `<tr>${vars.map(v=>`<td>${env[v]}</td>`).join("")}<td>${out}</td></tr>`;
    }
    html += "</tbody></table></div>";
    outputArea.innerHTML = html;
  };

  const renderEval = (vars, rpn) => {
    varsPanel.innerHTML = vars
      .map(
        (v) =>
          `<div class="var-card" data-var="${v}" data-val="0">${v}: 0</div>`
      )
      .join("");

    outputArea.innerHTML = `<div class="eval-container glow"><h3>Click variables to evaluate</h3></div>`;
    const evalBox = outputArea.querySelector(".eval-container");

    document.querySelectorAll(".var-card").forEach((card) => {
      card.addEventListener("click", () => {
        card.dataset.val = card.dataset.val === "0" ? "1" : "0";
        card.classList.toggle("active");
        card.textContent = `${card.dataset.var}: ${card.dataset.val}`;
        const env = {};
        document.querySelectorAll(".var-card").forEach(
          (c) => (env[c.dataset.var] = Number(c.dataset.val))
        );
        const result = evalRPN(rpn, env);
        evalBox.innerHTML = `<h3>Result</h3><p>${vars
          .map((v) => `${v}=${env[v]}`)
          .join(", ")} → Output = <strong style="color:#00ffcc;">${result}</strong></p>`;
      });
    });
  };

  /* ------------------------------------------------------------------
     6. Buttons Logic
  ------------------------------------------------------------------ */
  const clearButtonGlow = () => {
    btnBuild.classList.remove("active-mode");
    btnEval.classList.remove("active-mode");
  };

  btnBuild?.addEventListener("click", () => {
    clearButtonGlow();
    btnBuild.classList.add("active-mode");
    const expr = eqInput.value.trim();
    if (!expr) return (outputArea.innerHTML = "Enter an equation first.");
    const vars = findVars(expr);
    const rpn = toRPN(tokenize(normalize(expr)));
    renderTable(vars, rpn, expr);
  });

  btnEval?.addEventListener("click", () => {
    clearButtonGlow();
    btnEval.classList.add("active-mode");
    const expr = eqInput.value.trim();
    if (!expr) return (outputArea.innerHTML = "Enter an equation first.");
    const vars = findVars(expr);
    const rpn = toRPN(tokenize(normalize(expr)));
    renderEval(vars, rpn);
  });
});

/* =====================================================================
   SAVE EQUATION (builder.html) — save equation to database
===================================================================== */
async function saveEquation() {
  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem("currentUser"));
  } catch {
    user = null;
  }
  const token = sessionStorage.getItem("token");

  if (!user || !token) {
      alert("You must be logged in to save equations.");
      return;
  }

  const eqInputEl = document.getElementById("eqInput");
  if (!eqInputEl) {
    alert("Equation input not found on this page.");
    return;
  }
  const expression = eqInputEl.value.trim();
  if (!expression) {
    alert("Enter an equation first.");
    return;
  }

  try {
    const res = await fetch(getBackendUrl("/api/equations"), {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
      },
      body: JSON.stringify({ expression }),
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      // If response isn't JSON, use the status text
      throw new Error(res.statusText || "Failed to save equation");
    }

    if (res.ok) {
        alert("Equation saved!");
    } else {
        alert(data.message || "Failed to save equation.");
    }
  } catch (err) {
    console.error("Save equation error:", err);
    alert("Error saving equation: " + (err.message || "Network error"));
  }
}

/* =====================================================================
   VIEW SAVED EQUATIONS (builder.html)
===================================================================== */
async function loadEquations() {
  let user = null;
  try {
    user = JSON.parse(sessionStorage.getItem("currentUser"));
  } catch {
    user = null;
  }
  const token = sessionStorage.getItem("token");

  if (!user || !token) {
    alert("You must be logged in to view saved equations.");
    return;
  }

  try {
    const res = await fetch(getBackendUrl("/api/equations"), {
      method: "GET",
      cache: "no-store",
      headers: {
        "Authorization": "Bearer " + token,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Failed to load equations.");
      return;
    }

    const outputArea = document.getElementById("outputArea");
    if (!outputArea) return;

    if (!Array.isArray(data) || data.length === 0) {
      outputArea.innerHTML = `<div class="truth-container glow"><p>No saved equations yet.</p></div>`;
      return;
    }

    const listHtml = `
      <div class="truth-container glow">
        <h3>Saved Equations</h3>
        <div class="saved-equations-list">
          ${data
            .map((eq, index) => {
              const text = eq.equation ?? eq.expression ?? "";
              const steps = eq.steps ?? "";
              return `
                <div class="saved-equation-item">
                  <span class="equation-number">${index + 1}</span>
                  <span class="saved-equation-text">${escapeHtml(text)}</span>
                  ${
                    steps
                      ? `<div class="saved-equation-steps">${escapeHtml(steps)}</div>`
                      : ""
                  }
                </div>`;
            })
            .join("")}
        </div>
      </div>
    `;

    outputArea.innerHTML = listHtml;
  } catch (err) {
    console.error("Load equations error:", err);
    alert("Error loading equations from server.");
  }
}



/* =====================================================================
   TUTORIALS (tutorial.html) — gate descriptions + mini truth tables
===================================================================== */
if (page === "tutorial.html" || page === "tutorials.html") {
  window.addEventListener("DOMContentLoaded", () => {
    const desc = {
      AND:  { text: "AND outputs 1 only if both A and B are 1.", table: [[0,0,0],[0,1,0],[1,0,0],[1,1,1]] },
      OR:   { text: "OR outputs 1 if either A or B is 1.",       table: [[0,0,0],[0,1,1],[1,0,1],[1,1,1]] },
      XOR:  { text: "XOR outputs 1 only if A and B differ.",     table: [[0,0,0],[0,1,1],[1,0,1],[1,1,0]] },
      NOT:  { text: "NOT inverts its input (0→1, 1→0).",         table: [[0,1],[1,0]] },
      NAND: { text: "NAND is the opposite of AND.",              table: [[0,0,1],[0,1,1],[1,0,1],[1,1,0]] },
      NOR:  { text: "NOR is the opposite of OR.",                table: [[0,0,1],[0,1,0],[1,0,0],[1,1,0]] },
      XNOR: { text: "XNOR outputs 1 if inputs are equal.",       table: [[0,0,1],[0,1,0],[1,0,0],[1,1,1]] },
    };

    const buttons = document.querySelectorAll(".tutorial-btn");
    const display = document.getElementById("tutorialDisplay");
    if (!buttons.length || !display) return;

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.type;
        const info = desc[type];
        if (!info) return;

        let html = `<h2>${type} Gate</h2><p>${info.text}</p>`;
        html += "<table><thead><tr>";
        if (info.table[0].length === 3) html += "<th>A</th><th>B</th><th>Output</th>";
        else html += "<th>Input</th><th>Output</th>";
        html += "</tr></thead><tbody>";
        info.table.forEach(row => html += "<tr>" + row.map(v => `<td>${v}</td>`).join("") + "</tr>");
        html += "</tbody></table>";
        display.innerHTML = html;
      });
    });
  });
}

/* =====================================================================
   GAMES (games.html) — 4 mini-games + backend scores
===================================================================== */
if (page === "games.html") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("🎮 CircuitCraft Arcade loaded!");

    const gameIntro = document.getElementById("gameIntro");
    const gameArea  = document.getElementById("gameArea");
    const playAgain = document.getElementById("playAgain");
    const startGame = document.getElementById("startGame");
    const scoreInfo = document.getElementById("scoreInfo");

    // Game score state (session-based, persists across page navigations)
    let correct = 0;
    let wrong = 0;

    // Helper to get current user and token (always fresh)
    function getCurrentAuth() {
      return {
        user: getSessionUser(),
        token: sessionStorage.getItem("token"),
      };
    }

    // Get sessionStorage key for scores
    function getScoreKey() {
      const { user } = getCurrentAuth();
      return user ? `gameScores_${user.id}` : null;
    }

    // Load scores from sessionStorage (persists across page navigations)
    function loadScoresFromSession() {
      const key = getScoreKey();
      if (!key) {
        correct = 0;
        wrong = 0;
        return;
      }

      try {
        const stored = sessionStorage.getItem(key);
        if (stored) {
          const data = JSON.parse(stored);
          correct = data.correct || 0;
          wrong = data.wrong || 0;
        } else {
          // First time in this session, start at 0-0
          correct = 0;
          wrong = 0;
        }
      } catch (err) {
        console.error("Error loading scores from session:", err);
        correct = 0;
        wrong = 0;
      }
    }

    // Save scores to sessionStorage (for persistence across pages)
    function saveScoresToSession() {
      const key = getScoreKey();
      if (!key) return;

      try {
        sessionStorage.setItem(key, JSON.stringify({ correct, wrong }));
      } catch (err) {
        console.error("Error saving scores to session:", err);
      }
    }

    // Save scores to backend (for long-term storage)
    async function saveScoresToBackend() {
      const { user, token } = getCurrentAuth();
      if (!user || !token) return;

      try {
        await fetch(getBackendUrl("/api/scores"), {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token,
          },
          body: JSON.stringify({ correct, wrong }),
        });
      } catch (err) {
        console.error("Error saving scores to backend:", err);
      }
    }

    function updateScoreDisplay() {
      const { user, token } = getCurrentAuth();
      if (user && token) {
        scoreInfo.innerHTML = `<div style="text-align: center; margin: 0.5rem 0;">⭐ Score: ✔️${correct} / ❌${wrong}</div>`;
      } else {
        scoreInfo.innerHTML = `🔒 <a href="contact.html" id="signupLink" style="color:#00ffcc;">Sign up</a> to keep score.`;
      }
    }

    async function addPoints(ok = true) {
      const { user, token } = getCurrentAuth();
      if (!(user && token)) return;
      if (ok) correct++; else wrong++;
      saveScoresToSession(); // Save to sessionStorage immediately
      updateScoreDisplay();
      await saveScoresToBackend(); // Also save to backend
    }

    // Load scores from backend on page load (if logged in)
    async function loadScoresFromBackend() {
      const { user, token } = getCurrentAuth();
      if (!user || !token) {
        // Not logged in, just use sessionStorage
        loadScoresFromSession();
        updateScoreDisplay();
        return;
      }

      try {
        const res = await fetch(getBackendUrl("/api/scores"), {
          method: "GET",
          cache: "no-store",
          headers: {
            "Authorization": "Bearer " + token,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            // If it's a single score object
            if (data.correct !== undefined && data.wrong !== undefined) {
              correct = data.correct || 0;
              wrong = data.wrong || 0;
            } else if (Array.isArray(data) && data.length > 0) {
              // If it's an array, use the first (latest) score
              const latest = data[0];
              correct = latest.correct || 0;
              wrong = latest.wrong || 0;
            }
            saveScoresToSession(); // Sync to sessionStorage
            updateScoreDisplay();
          }
        } else {
          // Backend error, fall back to sessionStorage
          loadScoresFromSession();
          updateScoreDisplay();
        }
      } catch (err) {
        // Network error, fall back to sessionStorage
        loadScoresFromSession();
        updateScoreDisplay();
      }
    }

    // Initialize scores from backend (or sessionStorage if not logged in)
    loadScoresFromBackend();

    const games = [logicGateQuiz, matchingGame, truthTableGame, guessOutputGame];

    startGame?.addEventListener("click", () => {
      gameIntro.classList.add("hidden");
      gameArea.classList.remove("hidden");
      playAgain.classList.add("hidden");
      const randomGame = games[Math.floor(Math.random() * games.length)];
      randomGame();
    });

    playAgain.querySelector("button").addEventListener("click", () => {
      gameArea.innerHTML = "";
      playAgain.classList.add("hidden");
      const randomGame = games[Math.floor(Math.random() * games.length)];
      randomGame();
    });

    // ----- GAME 1: Logic Gate Quiz -----
    function logicGateQuiz() {
      const questions = [
        { q: "Outputs 1 only if both inputs are 1.", a: "AND" },
        { q: "Outputs 1 if either input is 1.", a: "OR" },
        { q: "Outputs 1 only if inputs differ.", a: "XOR" },
        { q: "Outputs the opposite of the input.", a: "NOT" },
        { q: "Opposite of AND.", a: "NAND" },
        { q: "Opposite of OR.", a: "NOR" },
      ];
      const q = questions[Math.floor(Math.random() * questions.length)];
      const options = ["AND", "OR", "XOR", "NOT", "NAND", "NOR"].sort(() => Math.random() - 0.5);

      gameArea.innerHTML = `
        <h2>Logic Gate Quiz</h2>
        <p>${q.q}</p>
        <div>${options.map((g) => `<button class="game-option">${g}</button>`).join("")}</div>
        <p id="feedback" style="margin-top:1rem;"></p>
      `;

      const feedback = document.getElementById("feedback");
      $$(".game-option").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (btn.textContent === q.a) {
            btn.style.background = "#00ffcc"; feedback.innerHTML = `✅ Correct!`; addPoints(true);
          } else {
            btn.style.background = "#ff5555";
            feedback.innerHTML = `❌ Wrong! The correct answer was <strong style="color:#00ffcc;">${q.a}</strong>`;
            addPoints(false);
          }
          playAgain.classList.remove("hidden");
        });
      });
    }

    // ----- GAME 2: Matching Game -----
    function matchingGame() {
      const pairs = {
        AND: "Outputs 1 only if both inputs are 1.",
        OR: "Outputs 1 if either input is 1.",
        XOR: "Outputs 1 only if inputs differ.",
        NOT: "Inverts the input (0→1, 1→0).",
      };
      const gates = Object.keys(pairs).sort(() => Math.random() - 0.5);
      const defs  = Object.values(pairs).sort(() => Math.random() - 0.5);

      gameArea.innerHTML = `
        <h2>Matching Game</h2>
        <p>Click a gate, then its correct definition.</p>
        <div style="display:flex;justify-content:center;gap:2rem;flex-wrap:wrap;">
          <div id="left">${gates.map(g => `<button class="game-option gate" data-gate="${g}">${g}</button>`).join("")}</div>
          <div id="right">${defs.map(d => `<button class="game-option def" data-def="${d}">${d}</button>`).join("")}</div>
        </div>
        <p id="feedback" style="margin-top:1rem;"></p>
      `;

      let selectedGate = null;
      let correctPairs = 0;
      const feedback = document.getElementById("feedback");

      $$(".gate").forEach((g) => {
        g.addEventListener("click", () => {
          $$(".gate").forEach((btn) => (btn.style.outline = "none"));
          selectedGate = g.dataset.gate;
          g.style.outline = "2px solid #00ffcc";
        });
      });

      $$(".def").forEach((d) => {
        d.addEventListener("click", () => {
          if (!selectedGate) return alert("Select a gate first!");
          const chosenGate = selectedGate;
          const chosenDef  = d.dataset.def;
          const gateBtn    = [...document.querySelectorAll(".gate")].find((b) => b.dataset.gate === chosenGate);

          if (pairs[chosenGate] === chosenDef) {
            d.style.background = "#00ffcc"; gateBtn.style.background = "#00ffcc";
            correctPairs++; feedback.innerHTML = `✅ Matched ${chosenGate}!`;
            if (correctPairs === Object.keys(pairs).length) {
              feedback.innerHTML = `✅ All matches correct!`; addPoints(true); playAgain.classList.remove("hidden");
            }
          } else {
            d.style.background = "#ff5555";
            feedback.innerHTML = `❌ Wrong! The correct definition for <strong>${chosenGate}</strong> is: <em style="color:#00ffcc;">${pairs[chosenGate]}</em>`;
            addPoints(false);
            setTimeout(() => (d.style.background = ""), 800);
          }

          selectedGate = null;
          $$(".gate").forEach((btn) => (btn.style.outline = "none"));
        });
      });
    }

    // ----- GAME 3: Truth Table Challenge -----
    function truthTableGame() {
      const gates = ["AND", "OR", "XOR", "NAND", "NOR"];
      const gate  = gates[Math.floor(Math.random() * gates.length)];

      const table = [
        { A: 0, B: 0, out: 0 },
        { A: 0, B: 1, out: gate === "NOR" ? 0 : gate === "NAND" ? 1 : gate === "XOR" ? 1 : gate === "OR" ? 1 : 0 },
        { A: 1, B: 0, out: gate === "NOR" ? 0 : gate === "NAND" ? 1 : gate === "XOR" ? 1 : gate === "OR" ? 1 : 0 },
        { A: 1, B: 1, out: gate === "NOR" ? 0 : gate === "NAND" ? 0 : gate === "XOR" ? 0 : gate === "OR" ? 1 : 1 },
      ];

      gameArea.innerHTML = `
        <h2>Truth Table Challenge</h2>
        <p>Fill the missing output for this <strong>${gate}</strong> gate:</p>
        <table><tr><th>A</th><th>B</th><th>Output</th></tr>
        ${table.map((row, i) => `<tr><td>${row.A}</td><td>${row.B}</td><td><input id="out${i}" type="text" maxlength="1" style="width:40px;text-align:center;"></td></tr>`).join("")}
        </table>
        <button id="checkTable" class="btn">Check</button>
        <p id="feedback" style="margin-top:1rem;"></p>
      `;

      const feedback = document.getElementById("feedback");
      $("#checkTable").addEventListener("click", () => {
        let ok = 0;
        table.forEach((row, i) => { if ($("#out"+i).value == row.out) ok++; });
        if (ok === table.length) {
          feedback.innerHTML = `✅ Perfect! You got all correct!`; addPoints(true);
        } else {
          const correctOutputs = table.map((r) => r.out).join(", ");
          feedback.innerHTML = `❌ You got ${ok}/${table.length}. Correct outputs are: <strong style="color:#00ffcc;">[${correctOutputs}]</strong>`;
          addPoints(false);
        }
        playAgain.classList.remove("hidden");
      });
    }

    // ----- GAME 4: Guess the Output -----
    function guessOutputGame() {
      const eqs = [
        { eq: "(A AND B)", A: 1, B: 1, res: 1 },
        { eq: "(A AND B)", A: 1, B: 0, res: 0 },
        { eq: "(A OR B)",  A: 0, B: 1, res: 1 },
        { eq: "(A XOR B)", A: 1, B: 1, res: 0 },
        { eq: "(A XOR B)", A: 1, B: 0, res: 1 },
        { eq: "(A NAND B)",A: 0, B: 0, res: 1 },
        { eq: "(A NOR B)", A: 1, B: 1, res: 0 },
      ];

      const q = eqs[Math.floor(Math.random() * eqs.length)];
      gameArea.innerHTML = `
        <h2>Guess the Output</h2>
        <p>Equation: ${q.eq}</p>
        <p>A=${q.A}, B=${q.B}</p>
        <div>
          <button class="game-option">0</button>
          <button class="game-option">1</button>
        </div>
        <p id="feedback" style="margin-top:1rem;"></p>
      `;

      const feedback = document.getElementById("feedback");
      $$(".game-option").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (Number(btn.textContent) === q.res) {
            btn.style.background = "#00ffcc"; feedback.innerHTML = `✅ Correct!`; addPoints(true);
          } else {
            btn.style.background = "#ff5555";
            feedback.innerHTML = `❌ Wrong! The correct output was <strong style="color:#00ffcc;">${q.res}</strong>`;
            addPoints(false);
          }
          playAgain.classList.remove("hidden");
        });
      });
    }
  });
}

// ===============================
// CONTACT / ACCOUNT PAGE (BACKEND CONNECTED)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const page = location.pathname.split("/").pop();
  if (page !== "contact.html") return;

  // Elements
  const signUpTab = document.getElementById("signUpTab");
  const loginTab = document.getElementById("loginTab");
  const signUpForm = document.getElementById("signUpForm");
  const loginForm = document.getElementById("loginForm");
  const contactLocked = document.getElementById("contactLocked");
  const contactFormWrapper = document.getElementById("contactFormWrapper");
  const contactForm = document.getElementById("contactForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const promptSignup = document.getElementById("promptSignup");

  // Tab switching
  signUpTab.addEventListener("click", () => {
    signUpTab.classList.add("active");
    loginTab.classList.remove("active");
    signUpForm.classList.add("active");
    loginForm.classList.remove("active");
  });

  loginTab.addEventListener("click", () => {
    loginTab.classList.add("active");
    signUpTab.classList.remove("active");
    loginForm.classList.add("active");
    signUpForm.classList.remove("active");
  });

  // Helpers
  function getUser() {
    try { 
        return JSON.parse(sessionStorage.getItem("currentUser")); 
    } catch { 
        return null; 
    }
}

  function setUser(u) { sessionStorage.setItem("currentUser", JSON.stringify(u)); }
  function clearUser() {
    // Clear game scores for this user before removing user data
    try {
      const user = getUser();
      if (user && user.id) {
        sessionStorage.removeItem(`gameScores_${user.id}`);
      }
    } catch (err) {
      // Ignore errors
    }
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("token");
  }

function updateView() {
  const user = getUser();
  const token = sessionStorage.getItem("token");

  const accountLink = document.getElementById("accountLink");
  const authPanel = document.getElementById("authPanel");
  const welcomeSection = document.getElementById("welcomeSection");
  const contactLocked = document.getElementById("contactLocked");
  const contactFormWrapper = document.getElementById("contactFormWrapper");
  const userName = document.getElementById("userName");

  if (user && token) {
    // Logged in
    authPanel.classList.add("hidden");
    welcomeSection.classList.remove("hidden");
    contactLocked.classList.add("hidden");
    contactFormWrapper.classList.remove("hidden");

    if (userName) userName.textContent = user.name;

    prefillContactForm();

    if (accountLink) {
      accountLink.textContent = user.name;
      accountLink.style.color = "#00ffcc";
    }

    // Ensure React component container is visible
    const reactContainer = document.getElementById("react-equations");
    if (reactContainer) {
      reactContainer.style.display = "block";
      reactContainer.style.visibility = "visible";
      reactContainer.classList.remove("hidden");
      reactContainer.style.minHeight = "50px"; // Ensure it has space
    }

    // Re-render React component after login to show equations
    // Use multiple attempts to ensure it renders
    let attempts = 0;
    const maxAttempts = 5;
    const tryRender = () => {
      attempts++;
      if (typeof window.renderReactEquations === 'function') {
        window.renderReactEquations();
      } else if (attempts < maxAttempts) {
        setTimeout(tryRender, 200);
      }
    };
    setTimeout(tryRender, 100);
  } 
  else {
    // Logged out
    authPanel.classList.remove("hidden");
    welcomeSection.classList.add("hidden");
    contactLocked.classList.remove("hidden");
    contactFormWrapper.classList.add("hidden");

    if (accountLink) {
      accountLink.textContent = "Account";
      accountLink.style.color = "";
    }
  }
}

// ===============================
// REAL SIGNUP
// ===============================
signUpForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value.trim();

    if (!name || !email || !password) {
        return alert("Please fill all fields.");
    }

    try {
        const res = await fetch(getBackendUrl("/api/signup"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });
        

        let data;
        try {
          data = await res.json();
        } catch (e) {
          return alert("Server returned invalid response. Please try again.");
        }

        if (!res.ok) {
            return alert(data.message || "Signup failed.");
        }

        if (!data.user || !data.token) {
            return alert("Invalid response from server. Please try again.");
        }

        // Save user + token in a consistent way with login
        sessionStorage.setItem("currentUser", JSON.stringify({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
        }));
        sessionStorage.setItem("token", data.token);

        alert("Account created successfully!");
        signUpForm.reset();
        updateView();

    } catch (err) {
        console.error("Signup error:", err);
        alert("Network error during signup: " + (err.message || "Please check your connection."));
    }
});

// ===============================
// REAL LOGIN
// ===============================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    const res = await fetch(getBackendUrl("/api/login"), {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      return alert("Server returned invalid response. Please try again.");
    }

    if (!res.ok) {
      return alert(data.message || "Login failed.");
    }

    if (!data.user || !data.token) {
      return alert("Invalid response from server. Please try again.");
    }

    // Save JWT + user info
    sessionStorage.setItem("token", data.token);

    // Support both { user, token } (current backend) and { name, email, token }
    const userData = data.user || { id: data.id, name: data.name, email: data.email };
    sessionStorage.setItem("currentUser", JSON.stringify({
      id: userData.id,
      name: userData.name,
      email: userData.email,
    }));

    alert("Welcome back, " + userData.name);
    loginForm.reset();
    updateView();

  } catch (err) {
    alert("Server error during login.");
  }
});



  // ===================================================
  // LOGOUT
  // ===================================================
  logoutBtn.addEventListener("click", () => {
  clearUser();               // remove stored user
  sessionStorage.removeItem("token");   // remove JWT
  alert("You have signed out.");
  updateView();
});


  // “Sign up” link in lock text
  promptSignup.addEventListener("click", (e) => {
    e.preventDefault();
    signUpTab.click();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Contact form (currently demo, later connected to backend)
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const token = sessionStorage.getItem("token");
    if (!token) {
      alert("Please log in to send a message.");
      return;
    }

    const formData = new FormData(contactForm);
    const name = contactForm.querySelector('input[type="text"]').value.trim();
    const email = contactForm.querySelector('input[type="email"]').value.trim();
    const message = contactForm.querySelector('textarea').value.trim();

    if (!name || !email || !message) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      const res = await fetch(getBackendUrl("/api/contact"), {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token,
        },
        body: JSON.stringify({ name, email, message }),
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        return alert("Server returned invalid response. Please try again.");
      }

      if (res.ok) {
        alert(data.message || "Message sent successfully!");
        contactForm.reset();
      } else {
        alert(data.message || "Failed to send message.");
      }
    } catch (err) {
      alert("Network error: " + (err.message || "Please check your connection."));
    }
  });

  // Prefill contact form
  function prefillContactForm() {
    const user = getUser();
    if (user) {
      const nameInput = contactForm.querySelector('input[type="text"]');
      const emailInput = contactForm.querySelector('input[type="email"]');

      if (nameInput) nameInput.value = user.name || "";
      if (emailInput) emailInput.value = user.email || "";
    }
  }

  // Password toggle
  function setupPasswordToggle(toggleId, inputId) {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);

    if (toggle && input) {
      toggle.addEventListener("click", () => {
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";

        const eyeIcon = toggle.querySelector(".eye-icon");
        if (eyeIcon) {
          if (isPassword) {
            eyeIcon.innerHTML = `
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            `;
          } else {
            eyeIcon.innerHTML = `
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            `;
          }
        }
      });
    }
  }

  // Setup features
  setupPasswordToggle("signupPasswordToggle", "signupPassword");
  setupPasswordToggle("loginPasswordToggle", "loginPassword");

  // Init
  updateView();
});
