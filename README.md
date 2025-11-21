
GitHub Copilot Chat Assistant

<!DOCTYPE html>
<html lang="fi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>NHL Parlay - Laskuri</title>
<meta name="description" content="Yksinkertainen NHL-parlay-laskuri: lisää kertoimia, aseta panos, näe yhteiskerroin, brutto- ja nettopotti sekä tuotto-%." />
<style>
  :root{
    --bg:#0f0f0f;
    --panel:#1a1a1a;
    --muted:#888;
    --accent:#00ff9d;
    --input-bg:#222;
    --input-bg-alt:#333;
    --radius:12px;
    --gap:12px;
    --max-width:720px;
  }
  html,body{height:100%;}
  body {
    background:var(--bg);
    color: #fff;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    padding: 20px;
    max-width: var(--max-width);
    margin: auto;
    -webkit-font-smoothing:antialiased;
    -moz-osx-font-smoothing:grayscale;
  }

  h1{
    font-size:20px;
    margin:0 0 18px;
    text-align:center;
  }

  .controls{
    display:flex;
    gap:var(--gap);
    margin-bottom:18px;
    align-items:center;
    justify-content:space-between;
    flex-wrap:wrap;
  }

  #legs {
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    margin-bottom: 14px;
  }

  .leg {
    display:flex;
    gap:10px;
    align-items:center;
  }

  .leg input.leg-input {
    flex:1;
    padding:14px;
    font-size:16px;
    border-radius:var(--radius);
    border:none;
    background:var(--input-bg);
    color:white;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
  }

  .leg button.remove {
    background:transparent;
    color:var(--muted);
    border:1px solid rgba(255,255,255,0.04);
    padding:8px 10px;
    border-radius:10px;
    cursor:pointer;
  }
  .leg button.remove:focus{outline:2px solid rgba(0,255,157,0.25)}

  .actions {
    display:flex;
    gap:10px;
    width:100%;
    margin-bottom:18px;
  }

  .btn {
    flex:1;
    background:var(--accent);
    color:black;
    padding:14px;
    border:none;
    border-radius:var(--radius);
    cursor:pointer;
    font-weight:700;
    font-size:16px;
  }
  .btn.secondary{
    background:transparent;
    color:var(--accent);
    border:1px solid rgba(0,255,157,0.18);
    font-weight:600;
  }

  #output{
    background:var(--panel);
    padding:18px;
    border-radius:var(--radius);
    text-align:center;
  }

  #output .row{
    margin-bottom:14px;
  }

  #total{
    font-size:40px;
    font-weight:800;
    color:var(--accent);
    margin-top:6px;
  }

  #payout{
    font-size:34px;
    font-weight:800;
    color:var(--accent);
    margin-top:6px;
  }

  .small{
    font-size:13px;
    color:var(--muted);
  }

  .stake-row{
    display:flex;
    gap:10px;
    align-items:center;
    justify-content:center;
    margin:8px 0 12px;
  }

  #stake{
    width:110px;
    padding:12px;
    font-size:18px;
    border-radius:12px;
    border:none;
    text-align:center;
    background:var(--input-bg-alt);
    color:white;
  }

  .visually-hidden{
    position: absolute !important;
    height: 1px; width: 1px;
    overflow: hidden;
    clip: rect(1px, 1px, 1px, 1px);
    white-space: nowrap;
  }

  .meta{
    display:flex;
    gap:16px;
    align-items:center;
    justify-content:center;
    flex-wrap:wrap;
    margin-top:12px;
    color:var(--muted);
    font-size:13px;
  }

  @media (max-width:480px){
    .controls{flex-direction:column;align-items:stretch}
    .actions{flex-direction:column}
    .leg button.remove{padding:8px}
  }
</style>
</head>
<body>
  <h1>🏒 NHL Parlay - Laskuri</h1>

  <div class="controls" aria-hidden="false">
    <div class="small">Lisää kertoimia ja aseta panos. Käytä desimaalimuotoa (esim. 1,85 tai 1.85).</div>
  </div>

  <form id="calculator" onsubmit="return false;">
    <div id="legs" aria-label="Vetojen kertoimet">
      <!-- initial legs -->
      <div class="leg">
        <label class="visually-hidden" for="odd-1">Kerroin 1</label>
        <input id="odd-1" class="leg-input" type="tel" inputmode="decimal" placeholder="Kerroin 1 (esim. 1.85)" autocomplete="off" />
        <button type="button" class="remove" title="Poista veto" aria-label="Poista veto" disabled>&times;</button>
      </div>

      <div class="leg">
        <label class="visually-hidden" for="odd-2">Kerroin 2</label>
        <input id="odd-2" class="leg-input" type="tel" inputmode="decimal" placeholder="Kerroin 2 (esim. 2.20)" autocomplete="off" />
        <button type="button" class="remove" title="Poista veto" aria-label="Poista veto">&times;</button>
      </div>
    </div>

    <div class="actions">
      <button type="button" id="addBtn" class="btn" aria-label="Lisää veto">➕ Lisää veto</button>
      <button type="button" id="resetBtn" class="btn secondary" aria-label="Tyhjennä kentät">🔁 Tyhjennä</button>
    </div>

    <div id="output" role="region" aria-live="polite" aria-atomic="true">
      <div class="row">
        <div class="small">Yhteiskerroin</div>
        <div id="total" aria-live="polite">1.00</div>
      </div>

      <div class="stake-row" style="margin-bottom:8px;">
        <label class="small" for="stake">Panos €</label>
        <input id="stake" type="tel" inputmode="decimal" value="10" />
      </div>

      <div class="row small">Mahdollinen voitto (netto)</div>
      <div id="payout" aria-live="polite">0,00 €</div>

      <div class="meta">
        <div class="small">Bruttopotti: <span id="gross" style="font-weight:700">0,00 €</span></div>
        <div class="small">Tuotto%: <span id="roi" style="font-weight:700">0,00 %</span></div>
        <div class="small">Voit saada tuloksia paikallisesti ilman internetiä.</div>
      </div>
    </div>
  </form>

<script>
(function(){
  // Helpers
  const fmtCurrency = (value) => {
    try {
      return new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value);
    } catch(e){
      return value.toFixed(2) + ' €';
    }
  };
  const fmtNumber = (value, digits = 2) => Number(value).toFixed(digits);

  // Elements
  const legsEl = document.getElementById('legs');
  const addBtn = document.getElementById('addBtn');
  const resetBtn = document.getElementById('resetBtn');
  const stakeEl = document.getElementById('stake');
  const totalEl = document.getElementById('total');
  const payoutEl = document.getElementById('payout');
  const grossEl = document.getElementById('gross');
  const roiEl = document.getElementById('roi');

  // Load saved state (optional)
  const saveKey = 'parlay_calculator_v1';
  function loadState(){
    try {
      const raw = localStorage.getItem(saveKey);
      if(!raw) return;
      const state = JSON.parse(raw);
      if(Array.isArray(state.odds) && state.odds.length){
        // remove default legs
        legsEl.innerHTML = '';
        state.odds.forEach((o, i) => addLeg(o));
      }
      if(state.stake) stakeEl.value = state.stake;
    } catch(e){}
  }
  function saveState(){
    try {
      const odds = Array.from(legsEl.querySelectorAll('input.leg-input')).map(i => i.value);
      localStorage.setItem(saveKey, JSON.stringify({ odds, stake: stakeEl.value }));
    } catch(e){}
  }

  // Create a leg DOM node
  function makeLeg(value){
    const wrapper = document.createElement('div');
    wrapper.className = 'leg';

    const input = document.createElement('input');
    input.type = 'tel';
    input.inputMode = 'decimal';
    input.className = 'leg-input';
    input.placeholder = `Kerroin ${legsEl.children.length + 1}`;
    input.autocomplete = 'off';
    if(value) input.value = value;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove';
    remove.title = 'Poista veto';
    remove.setAttribute('aria-label', 'Poista veto');
    remove.innerHTML = '&times;';

    remove.addEventListener('click', () => {
      // prevent removing last remaining leg
      legsEl.removeChild(wrapper);
      updateRemoveButtons();
      calculate();
      saveState();
    });

    input.addEventListener('input', () => {
      calculate();
      saveState();
    });

    wrapper.appendChild(input);
    wrapper.appendChild(remove);
    return wrapper;
  }

  // Add leg optionally with initial value
  function addLeg(value){
    const node = makeLeg(value);
    legsEl.appendChild(node);
    updateRemoveButtons();
    const input = node.querySelector('input.leg-input');
    input.focus();
    calculate();
    saveState();
  }

  // Update remove button disabled state (keep at least 1 leg)
  function updateRemoveButtons(){
    const removes = legsEl.querySelectorAll('button.remove');
    const inputs = legsEl.querySelectorAll('input.leg-input');
    removes.forEach(btn => btn.disabled = (inputs.length <= 1));
    // update placeholders numbering
    inputs.forEach((inp, i) => inp.placeholder = `Kerroin ${i+1}`);
  }

  // Reset to default state (two empty legs + stake 10)
  function resetAll(){
    legsEl.innerHTML = '';
    addLeg('');
    addLeg('');
    stakeEl.value = '10';
    calculate();
    saveState();
  }

  // Calculation logic
  function calculate(){
    const inputs = Array.from(document.querySelectorAll('#legs input.leg-input'));
    let total = 1;
    let valid = true;
    let anyFilled = false;

    inputs.forEach(inp => {
      const raw = inp.value.trim();
      if(raw === '') return;
      anyFilled = true;
      const num = parseFloat(raw.replace(',', '.'));
      if(Number.isFinite(num) && num >= 1){
        total *= num;
      } else {
        valid = false;
      }
    });

    // stake parsing
    const stakeRaw = (stakeEl.value || '').trim();
    const stake = parseFloat(stakeRaw.replace(',', '.')) || 0;

    // Display total
    if(!anyFilled){
      totalEl.textContent = '1.00';
    } else if(!valid){
      totalEl.textContent = '–';
    } else {
      totalEl.textContent = fmtNumber(total, 2);
    }

    // Payouts
    if(!anyFilled || !valid || stake <= 0){
      payoutEl.textContent = fmtCurrency(0);
      grossEl.textContent = fmtCurrency(0);
      roiEl.textContent = '0,00 %';
    } else {
      const gross = total * stake; // stake returned included
      const profit = gross - stake;
      const roi = (profit / stake) * 100;
      payoutEl.textContent = fmtCurrency(profit);
      grossEl.textContent = fmtCurrency(gross);
      roiEl.textContent = fmtNumber(roi, 2) + ' %';
    }
  }

  // Events
  addBtn.addEventListener('click', () => {
    addLeg('');
    saveState();
  });

  resetBtn.addEventListener('click', () => {
    if(confirm('Haluatko tyhjentää kentät ja palauttaa oletukset?')){
      resetAll();
    }
  });

  stakeEl.addEventListener('input', () => {
    // sanitize: allow commas, dots and digits; limit length
    stakeEl.value = stakeEl.value.replace(/[^\d,.\-]/g, '').slice(0, 12);
    calculate();
    saveState();
  });

  // init: attach listeners to initial inputs
  function init(){
    // Add listeners for existing inputs
    document.querySelectorAll('.leg-input').forEach(inp => {
      inp.addEventListener('input', () => {
        calculate();
        saveState();
      });
    });
    document.querySelectorAll('button.remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const wrapper = btn.closest('.leg');
        if(wrapper) {
          legsEl.removeChild(wrapper);
          updateRemoveButtons();
          calculate();
          saveState();
        }
      });
    });

    updateRemoveButtons();
    loadState();
    calculate();
  }

  // expose functions for debug (optional)
  window.parlay = { addLeg, resetAll, calculate };

  init();
})();
</script>

</body>
</html>

Ohjeet GitHub Pages -deployta varten (lyhyesti)
1. Luo uusi GitHub-repositorio (esim. my-parlay) tai käytä käyttäjä-/organisaatiosivua: jos haluat sivun osoitteeseen https://junaimela.github.io/ käytä repositorion nimeä jnaimela.github.io.
2. Paikallinen Git (yksinkertainen tapa):
   - Tallenna yllä oleva tiedosto nimellä index.html paikalliseen kansioon.
   - Avaa terminaali kansiossa ja aja:
     - git init
     - git add index.html
     - git commit -m "Add parlay calculator"
     - git branch -M main
     - git remote add origin https://github.com/<käyttäjänimi>/<repo>.git
     - git push -u origin main
   (Korvaa <käyttäjänimi> ja <repo> omilla tiedoillasi.)
3. Ota GitHubissa Pages käyttöön:
   - Avaa repository > Settings > Pages (tai Settings > Code and automation > Pages).
   - Valitse Source: branch main ja folder / (root).
   - Tallenna. Sivusi julkaistaan osoitteeseen https://<käyttäjänimi>.github.io/<repo>/ (tai käyttäjä-sivun tapauksessa suoraan https://<käyttäjänimi>.github.io/).
4. Odota muutama minuutti ja päivitä linkki. Voit myös käyttää GitHub Desktopia tai GitHubin web UI:ta tiedoston lataamiseen.

Lisävinkkejä
- Muokkaa ulkoasua muuttamalla CSS-muuttujia (esim. --accent).
- Halutessasi voin myös puskea tämän tiedoston suoraan repoosi (tarvitsen repositorion nimen ja mihin branchiin haluat sen), tai jakaa erilliset step-by-step kuvalliset ohjeet. Haluatko että puskaan tiedoston puolestasi?