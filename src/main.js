// Minara Loop Engineering Quant Desk Controller
import './style.css';

// App States
let appState = {
  research: 'idle', // idle, searching, compiled
  strategy: 'locked', // locked, backtesting, backtest_done, paper_trading
  autopilot: 'off',
  currentThesis: null,
  activeTemplate: null,
  paperEquity: 100000.00,
  paperNetProfit: 0.00,
  paperTradesCount: 0,
  selectedLeverage: '5',
  selectedDrawdownLimit: '5',
  assetsWhitelist: { sol: true, hype: true, pol: false }
};

// Mock Research Database
const researchDatabase = {
  'bond-market': {
    title: 'Bond Yield Spread & Stock/Crypto Correlation Risk',
    metrics: [
      { name: 'Regime', val: 'Transition', type: 'neon-gold' },
      { name: 'Yield Spread', val: '-0.32%', type: 'neon-crimson' },
      { name: 'Correlation Bias', val: 'Fading', type: 'text-white' }
    ],
    logs: [
      'Initializing macro bond database connectors...',
      'Fetching 10Y/2Y US Treasury Yield Curve spreads...',
      'Yield Curve Inversion at -32bps. Recalculating contraction bounds...',
      'Aggregating S&P 500 options implied volatility skew...',
      'Reading Polymarket Federal Reserve interest rate probability odds (64% 25bps cut)...',
      'Correlating risk appetite curves against BTC/ETH daily betas...',
      'Synthesis complete. Risk-on assets displaying consolidation bias.'
    ],
    thesisText: `Bond yield spreads are holding inverted at -32bps, indicating structural contraction risk but short-term easing expectations. Beta correlation between stocks and crypto is fading, suggesting liquidity is flowing into specific narrative outliers.

**Sizing Advice:** Position sizing should not exceed 2.0% equity.
**Asset Choice:** Pivot to high-relative-strength crypto protocols.`,
    strategyPrompt: `Yield Spread Inversion (-32bps) trigger: long relative strength leaders (e.g. $SOL, $HYPE) on 1H breakouts, tight trailing stop 2.5%, max size 2%`
  },
  'hype-deep': {
    title: '$HYPE Whale Flows & Funding Squeeze Thesis',
    metrics: [
      { name: 'Funding Rate', val: '-0.045%', type: 'neon-crimson' },
      { name: 'OI Delta', val: '+$2.4M', type: 'neon-emerald' },
      { name: 'Whale Bias', val: 'Net Long', type: 'neon-emerald' }
    ],
    logs: [
      'Ingesting Hyperliquid API order book and funding rates...',
      'Funding rate at -0.045% (annualized -16.4%). Short positioning crowded...',
      'Fetching $HYPE whale wallet transfers and lockup schedule...',
      'Detected three smart-money wallets depositing $HYPE into staking pool...',
      'Ingesting social sentiment signals (Twitter volume up 340%)...',
      'Running liquidation matrix calculations at $15.50 resistance...',
      'Synthesis complete. Candidate identified for negative-funding short squeeze.'
    ],
    thesisText: `Whales are accumulating spot $HYPE, while futures funding remains highly negative (-0.045% per 8h). Open Interest delta is positive (+$2.4M), confirming open shorts are trapped. An upward sweep will trigger cascading liquidations.

**Sizing Advice:** Standard sizing (2.5%) authorized.
**Strategy Action:** Enter long on volume-supported 15m breakout.`,
    strategyPrompt: `$HYPE Funding Squeeze: long on 15m breakout + volume spike, leverage 5x, target 8% profit take, 3% trailing stop-loss`
  },
  'audit-trades': {
    title: 'Quant Trade Sizing & Execution Leak Audit',
    metrics: [
      { name: 'Avg Slippage', val: '0.18%', type: 'neon-gold' },
      { name: 'Sizing Bias', val: 'Too Big', type: 'neon-crimson' },
      { name: 'Time Leak', val: 'Midday', type: 'neon-gold' }
    ],
    logs: [
      'Connecting to historical trade execution history databases...',
      'Mapping entry/exit order fill timestamps against order book liquidity depth...',
      'Slippage spike identified (0.18% avg) during low-volume sessions...',
      'Calculating sizing effects: trades > 4.0% account size hit risk limits 68% more often...',
      'Evaluating drawdown distribution parameters across market regimes...',
      'Synthesis complete. Systematic leaks identified in midday trades.'
    ],
    thesisText: `Audit proves that sizing above 2.5% triggers premature risk liquidations. Additionally, executing trades during the midday volume taper (12:00-14:00 UTC) increases average slippage to 0.18%, severely cutting alpha.

**Sizing Advice:** Sizing strictly capped at 2.5% of account balance.
**Time Constraints:** Implement timezone rules to suspend execution from 12:00-14:00 UTC.`,
    strategyPrompt: `Audit-corrective strategy: long momentum leaders during peak volume hours (exclude 12:00-14:00 UTC), size strictly limited to 2.5%`
  }
};

// Interval references
let paperInterval = null;
let autopilotInterval = null;

// Initialize elements
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  drawEmptyChart();
  drawHeatmap(true); // Draw initial blank heatmap
});

function setupEventListeners() {
  // Suggestion buttons
  const suggestButtons = document.querySelectorAll('.suggest-btn');
  suggestButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const queryId = btn.getAttribute('data-query-id');
      runResearchQuery(queryId);
    });
  });

  // Chat Form Submission
  const chatForm = document.getElementById('chat-form');
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const chatInput = document.getElementById('chat-input');
    const userText = chatInput.value.trim();
    if (!userText) return;
    
    // Add User Message
    appendChatMessage('user-message', userText);
    chatInput.value = '';

    // Trigger random research sequence
    const queries = ['bond-market', 'hype-deep', 'audit-trades'];
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];
    setTimeout(() => {
      runResearchQuery(randomQuery);
    }, 500);
  });

  // Reset Simulation
  document.getElementById('btn-reset-demo').addEventListener('click', resetDemo);

  // Documentation Modal Controllers
  const docsModal = document.getElementById('docs-modal');
  document.getElementById('btn-open-docs').addEventListener('click', () => {
    docsModal.classList.remove('hidden');
  });
  document.getElementById('btn-close-docs').addEventListener('click', () => {
    docsModal.classList.add('hidden');
  });
  
  // Close docs modal on overlay click
  docsModal.addEventListener('click', (e) => {
    if (e.target === docsModal) {
      docsModal.classList.add('hidden');
    }
  });

  // TOC Navigation in Docs
  const docsNavLinks = document.querySelectorAll('.docs-nav-link');
  const docsSections = document.querySelectorAll('.docs-section');
  docsNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      // Remove active state from all links
      docsNavLinks.forEach(l => l.classList.remove('active'));
      // Add active state to clicked link
      link.classList.add('active');

      // Hide all sections
      const targetSectionId = link.getAttribute('data-section');
      docsSections.forEach(sec => {
        if (sec.id === targetSectionId) {
          sec.classList.add('active');
        } else {
          sec.classList.remove('active');
        }
      });
    });
  });

  // Send to Strategy Studio
  const btnSendToStudio = document.getElementById('btn-send-to-studio');
  btnSendToStudio.addEventListener('click', () => {
    if (appState.research !== 'compiled') return;
    
    // Fill strategy prompt
    const strategyPrompt = document.getElementById('strategy-prompt');
    strategyPrompt.value = appState.currentThesis.strategyPrompt;
    
    // Transition UI
    const studioWorkspace = document.getElementById('testing-workspace-container');
    studioWorkspace.classList.remove('locked');
    document.getElementById('testing-lock-overlay').classList.add('hidden');
    
    appState.strategy = 'idle';
    document.getElementById('strategy-status').textContent = 'Ready';
    document.getElementById('btn-run-backtest').disabled = false;
    
    // Highlight Strategy Studio Panel
    flashPanelBorder('panel-strategy');
    appendChatMessage('system-message', 'Thesis successfully ported to Strategy Studio.');
  });

  // Strategy Template Selection
  const templateSelect = document.getElementById('strategy-template-select');
  templateSelect.addEventListener('click', () => {
    const val = templateSelect.value;
    if (!val) return;
    appState.activeTemplate = val;
    
    let templatePrompt = '';
    if (val === 'momentum') {
      templatePrompt = '$HYPE Momentum: long on ROC(15) > 0.2 + volume > SMA(20)*1.5, holding 12 bars, SL 2.5%, Trailing TP 6%';
    } else if (val === 'mean_reversion') {
      templatePrompt = '$SOL Mean Reversion: fade RSI(14) > 82 triggers, short sizing 2.0%, profit take at SMA(20), stop 3%';
    } else if (val === 'arbitrage') {
      templatePrompt = 'Cross-exchange Arb: long Hyperliquid perpetuals vs short Binance spot on basis spread > 0.08%, close on convergence';
    } else if (val === 'pairs') {
      templatePrompt = 'Pairs Spread: Long $HYPE / Short $SOL on cointegration spread Z-score > 2.0, target reversion to mean';
    }
    
    document.getElementById('strategy-prompt').value = templatePrompt;
    
    // Unlock backtest
    const studioWorkspace = document.getElementById('testing-workspace-container');
    studioWorkspace.classList.remove('locked');
    const lockOverlay = document.getElementById('testing-lock-overlay');
    if (lockOverlay) lockOverlay.classList.add('hidden');
    
    appState.strategy = 'idle';
    document.getElementById('strategy-status').textContent = 'Ready';
    document.getElementById('btn-run-backtest').disabled = false;
  });

  // Run Backtest
  const btnRunBacktest = document.getElementById('btn-run-backtest');
  btnRunBacktest.addEventListener('click', () => {
    if (appState.strategy === 'locked') return;
    runBacktestSimulation();
  });

  // Tab buttons
  const tabBacktest = document.getElementById('tab-backtest');
  const tabPaper = document.getElementById('tab-paper');
  
  tabBacktest.addEventListener('click', () => {
    tabBacktest.classList.add('active');
    tabPaper.classList.remove('active');
    document.getElementById('view-backtest').classList.add('active');
    document.getElementById('view-paper').classList.remove('active');
  });

  tabPaper.addEventListener('click', () => {
    if (appState.strategy !== 'paper_trading' && appState.strategy !== 'backtest_done') return;
    tabPaper.classList.add('active');
    tabBacktest.classList.remove('active');
    document.getElementById('view-paper').classList.add('active');
    document.getElementById('view-backtest').classList.remove('active');
  });

  // Promote to Autopilot
  const btnPromote = document.getElementById('btn-promote-to-live');
  btnPromote.addEventListener('click', () => {
    if (appState.strategy !== 'backtest_done' && appState.strategy !== 'paper_trading') return;
    
    // Enable autopilot UI
    document.getElementById('toggle-autopilot').disabled = false;
    document.getElementById('execution-status').textContent = 'Engine Standby';
    document.getElementById('execution-status').className = 'panel-status-text neon-gold';
    
    // Highlight column 3
    flashPanelBorder('panel-execution');
    
    // Scroll execution column
    document.getElementById('panel-execution').scrollIntoView({ behavior: 'smooth' });
    
    appendChatMessage('system-message', 'Strategy certified. Autopilot standby - click ON to begin routing execution loops.');
  });

  // Autopilot toggle
  const toggleBtn = document.getElementById('toggle-autopilot');
  toggleBtn.addEventListener('click', () => {
    const isPressed = toggleBtn.getAttribute('aria-pressed') === 'true';
    toggleAutopilot(!isPressed);
  });

  // Risk selector changes
  document.getElementById('risk-leverage-select').addEventListener('change', (e) => {
    appState.selectedLeverage = e.target.value;
    appendExecutionFeedLog('observe', `System config updated: Max leverage cap set to ${appState.selectedLeverage}.0x.`);
  });
  
  document.getElementById('risk-drawdown-select').addEventListener('change', (e) => {
    appState.selectedDrawdownLimit = e.target.value;
    appendExecutionFeedLog('observe', `Risk safeguard updated: Global equity drawdown kill-switch set to ${appState.selectedDrawdownLimit}% floor.`);
  });

  // Asset whitelist checkers
  document.getElementById('asset-sol').addEventListener('change', (e) => {
    appState.assetsWhitelist.sol = e.target.checked;
    appendExecutionFeedLog('observe', `$SOL trading scope: ${e.target.checked ? 'AUTHORIZED' : 'DE-AUTHORIZED'}`);
  });
  
  document.getElementById('asset-hype').addEventListener('change', (e) => {
    appState.assetsWhitelist.hype = e.target.checked;
    appendExecutionFeedLog('observe', `$HYPE trading scope: ${e.target.checked ? 'AUTHORIZED' : 'DE-AUTHORIZED'}`);
  });
  
  document.getElementById('asset-pol').addEventListener('change', (e) => {
    appState.assetsWhitelist.pol = e.target.checked;
    appendExecutionFeedLog('observe', `$POL trading scope: ${e.target.checked ? 'AUTHORIZED' : 'DE-AUTHORIZED'}`);
  });
}

// ----------------------------------------
// Loop 1 Logic: Research Console
// ----------------------------------------
function runResearchQuery(queryId) {
  const query = researchDatabase[queryId];
  if (!query) return;

  appState.research = 'searching';
  
  // Show terminal overlay
  const streamLog = document.getElementById('chat-stream-log');
  const logLines = document.getElementById('chat-log-lines');
  logLines.innerHTML = '';
  streamLog.classList.remove('hidden');

  let currentLineIndex = 0;
  
  function printNextLine() {
    if (currentLineIndex < query.logs.length) {
      const line = document.createElement('div');
      const time = new Date().toLocaleTimeString();
      line.textContent = `[${time}] ${query.logs[currentLineIndex]}`;
      logLines.appendChild(line);
      logLines.scrollTop = logLines.scrollHeight;
      currentLineIndex++;
      
      // Variable speed log print
      setTimeout(printNextLine, 350 + Math.random() * 200);
    } else {
      // Finished log stream
      setTimeout(() => {
        streamLog.classList.add('hidden');
        displayThesisResult(query);
      }, 600);
    }
  }

  printNextLine();
}

function displayThesisResult(query) {
  appState.research = 'compiled';
  appState.currentThesis = query;

  // Add bot reply to chat
  appendChatMessage('ai-message', `Compiled Thesis: <strong>${query.title}</strong><br><br>${query.thesisText.replace(/\n/g, '<br>')}`);

  // Display thesis in Output Card
  const container = document.getElementById('thesis-container');
  const lock = document.getElementById('thesis-lock-overlay');
  if (lock) lock.remove();
  container.classList.remove('locked');

  let metricsHtml = `<p><strong>${query.title}</strong></p>`;
  metricsHtml += `<div class="thesis-metric-box">`;
  query.metrics.forEach(m => {
    metricsHtml += `<div class="t-metric"><span>${m.name}</span><strong class="${m.type}">${m.val}</strong></div>`;
  });
  metricsHtml += `</div>`;
  metricsHtml += `<p style="margin-top: 10px; font-size: 11px;">${query.thesisText.slice(0, 150)}...</p>`;

  document.getElementById('thesis-body-content').innerHTML = metricsHtml;
  document.getElementById('btn-send-to-studio').disabled = false;
  
  // Trigger latency pulses in global header status
  triggerLoopLatencyPulse();
}

// ----------------------------------------
// Loop 2 Logic: Strategy Studio
// ----------------------------------------
function runBacktestSimulation() {
  appState.strategy = 'backtesting';
  document.getElementById('strategy-status').textContent = 'Backtesting';
  document.getElementById('strategy-status').className = 'panel-status-text neon-gold';
  document.getElementById('btn-run-backtest').disabled = true;

  // Setup UI chart placeholder to load
  const wrapper = document.getElementById('svg-chart-wrapper');
  wrapper.innerHTML = '<div class="chart-placeholder animate-pulse">Running Monte Carlo simulation (10,000 runs)...</div>';

  // Setup testing checkmarks
  resetTestCheckmarks();

  setTimeout(() => {
    // Stage 1 passed: Leakage check
    setTestPassed('chk-leakage');
    
    setTimeout(() => {
      // Stage 2 passed: Out-of-sample
      setTestPassed('chk-oos');
      
      setTimeout(() => {
        // Stage 3 passed: Multi-regime
        setTestPassed('chk-regime');
        
        // Populate metrics
        document.getElementById('stat-sharpe').textContent = '2.74';
        document.getElementById('stat-drawdown').textContent = '-3.18%';
        document.getElementById('stat-winrate').textContent = '68.4%';

        // Render backtest chart path
        renderBacktestChart();
        drawHeatmap(false); // Draw full active heatmap

        // Validate gates
        appState.strategy = 'backtest_done';
        document.getElementById('strategy-status').textContent = 'Tested';
        document.getElementById('strategy-status').className = 'panel-status-text neon-emerald';
        
        const gate = document.getElementById('validation-gate-status');
        gate.querySelector('.indicator-circle').className = 'indicator-circle circle-emerald';
        gate.querySelector('.txt').textContent = 'Strategy Certified (All Gates Pass)';
        
        document.getElementById('btn-promote-to-live').disabled = false;

        // Automatically start Paper Trading loop when backtest completes
        startPaperTrading();

      }, 1000);
    }, 8000000 / 8000000 * 800); // 800ms
  }, 600);
}

function resetTestCheckmarks() {
  ['chk-leakage', 'chk-oos', 'chk-regime'].forEach(id => {
    const el = document.getElementById(id);
    el.className = 'test-item';
    el.querySelector('.icon').textContent = '⌛';
  });
}

function setTestPassed(id) {
  const el = document.getElementById(id);
  el.className = 'test-item passed';
  el.querySelector('.icon').textContent = '✅';
}

function renderBacktestChart() {
  const wrapper = document.getElementById('svg-chart-wrapper');
  wrapper.innerHTML = '';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'svg-chart');
  svg.setAttribute('viewBox', '0 0 400 130');

  // Draw grid lines
  for (let i = 1; i < 4; i++) {
    const y = 30 * i;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', y);
    line.setAttribute('x2', '400');
    line.setAttribute('y2', y);
    line.setAttribute('class', 'chart-axis');
    svg.appendChild(line);
  }

  // Draw Volatility Cone (Background)
  const cone = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  cone.setAttribute('d', 'M 0 90 L 100 80 L 200 65 L 300 45 L 400 30 L 400 110 L 300 115 L 200 118 L 100 110 Z');
  cone.setAttribute('class', 'chart-cone');
  svg.appendChild(cone);

  // Draw main equity path
  const points = [
    [0, 95], [40, 90], [80, 102], [120, 85], [160, 92], 
    [200, 72], [240, 80], [280, 55], [320, 60], [360, 42], [400, 35]
  ];
  let d = `M ${points[0][0]} ${points[0][1]} `;
  for (let i = 1; i < points.length; i++) {
    // Cubic bezier curve approximation for smooth path
    const cpX1 = points[i-1][0] + 20;
    const cpY1 = points[i-1][1];
    const cpX2 = points[i][0] - 20;
    const cpY2 = points[i][1];
    d += `C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i][0]} ${points[i][1]} `;
  }

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('class', 'chart-line');
  
  // Animate path draw
  path.style.strokeDasharray = '500';
  path.style.strokeDashoffset = '500';
  path.style.transition = 'stroke-dashoffset 2s cubic-bezier(0.4, 0, 0.2, 1)';
  
  svg.appendChild(path);
  wrapper.appendChild(svg);

  // Trigger browser repaint before starting transition
  setTimeout(() => {
    path.style.strokeDashoffset = '0';
  }, 50);
}

function drawEmptyChart() {
  const wrapper = document.getElementById('svg-chart-wrapper');
  wrapper.innerHTML = '<div class="chart-placeholder">Replaying history...</div>';
}

function drawHeatmap(blank) {
  const container = document.getElementById('heatmap-grid-container');
  container.innerHTML = '';
  
  const tokens = ['SOL', 'HYPE', 'ETH', 'BTC', 'POL', 'XRP', 'ADA', 'BNB', 'NEAR', 'SUI', 'AVAX', 'DOT', 'OP', 'ARB', 'LINK', 'FET'];
  
  for (let i = 0; i < 16; i++) {
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    
    // Varying opacity representing weighting in strategy
    let op = 0.05;
    if (!blank) {
      if (i < 2) op = 0.9;      // High weight SOL/HYPE
      else if (i < 4) op = 0.6; // Mid weight ETH/BTC
      else if (i < 8) op = 0.35; // Lower weight
      else op = 0.1;
    }
    
    cell.style.opacity = op;
    cell.setAttribute('data-symbol', tokens[i]);
    container.appendChild(cell);
  }
}

// ----------------------------------------
// Live Paper Trading Module
// ----------------------------------------
function startPaperTrading() {
  appState.strategy = 'paper_trading';
  
  // Clear empty placeholder text
  document.getElementById('paper-fills-log').innerHTML = '';

  let price = 14.50;
  
  // Update orderbook spread function
  function updateOrderBook() {
    const spread = 0.02 + Math.random() * 0.03;
    const mid = price + (Math.random() - 0.5) * 0.1;
    const askPrice = (mid + spread/2).toFixed(2);
    const bidPrice = (mid - spread/2).toFixed(2);

    document.getElementById('ob-spread').textContent = `Spread: $${spread.toFixed(3)}`;

    const obAsks = document.getElementById('ob-asks');
    obAsks.innerHTML = `
      <div class="ob-row"><span>${(parseFloat(askPrice) + 0.03).toFixed(2)}</span><span>${(500 + Math.random()*2000).toFixed(0)}</span></div>
      <div class="ob-row"><span>${(parseFloat(askPrice) + 0.01).toFixed(2)}</span><span>${(1200 + Math.random()*1500).toFixed(0)}</span></div>
      <div class="ob-row"><span>${askPrice}</span><span>${(800 + Math.random()*500).toFixed(0)}</span></div>
    `;

    const obBids = document.getElementById('ob-bids');
    obBids.innerHTML = `
      <div class="ob-row"><span>${bidPrice}</span><span>${(1100 + Math.random()*400).toFixed(0)}</span></div>
      <div class="ob-row"><span>${(parseFloat(bidPrice) - 0.01).toFixed(2)}</span><span>${(600 + Math.random()*1800).toFixed(0)}</span></div>
      <div class="ob-row"><span>${(parseFloat(bidPrice) - 0.03).toFixed(2)}</span><span>${(1500 + Math.random()*1200).toFixed(0)}</span></div>
    `;
    
    price = mid; // Drift center price
  }

  // Initial order book write
  updateOrderBook();

  // Tick order book spreads
  if (paperInterval) clearInterval(paperInterval);
  paperInterval = setInterval(() => {
    updateOrderBook();
    
    // Periodically simulate a paper execution fill
    if (Math.random() > 0.7) {
      simulatePaperFill();
    }
  }, 1500);
}

function simulatePaperFill() {
  appState.paperTradesCount++;
  
  const symbols = [];
  if (appState.assetsWhitelist.sol) symbols.push('SOL');
  if (appState.assetsWhitelist.hype) symbols.push('HYPE');
  if (appState.assetsWhitelist.pol) symbols.push('POL');
  if (symbols.length === 0) symbols.push('HYPE'); // Fallback

  const token = symbols[Math.floor(Math.random() * symbols.length)];
  const isBuy = Math.random() > 0.4; // Slightly bias to buy
  const size = (10 + Math.random() * 40).toFixed(1);
  const fillPrice = (14.20 + Math.random() * 0.8).toFixed(2);
  const fillVal = (size * fillPrice).toFixed(2);
  
  // Calculate mock profits
  let tradeProfit = 0;
  if (isBuy) {
    tradeProfit = (Math.random() - 0.3) * 120; // Bias slightly positive
  } else {
    tradeProfit = (Math.random() - 0.3) * 120;
  }

  // Accumulate
  appState.paperEquity += tradeProfit;
  appState.paperNetProfit = appState.paperEquity - 100000.00;
  const netPct = ((appState.paperNetProfit / 100000.00) * 100).toFixed(2);

  // Update Equity UI
  document.getElementById('paper-equity').textContent = `$${appState.paperEquity.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  const profitEl = document.getElementById('paper-profit');
  profitEl.textContent = `${appState.paperNetProfit >= 0 ? '+' : ''}$${appState.paperNetProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${netPct}%)`;
  
  if (appState.paperNetProfit >= 0) {
    profitEl.className = 'neon-emerald';
  } else {
    profitEl.className = 'neon-crimson';
  }

  // Append row
  const log = document.getElementById('paper-fills-log');
  const time = new Date().toLocaleTimeString();
  const row = document.createElement('div');
  row.className = 'fill-row';
  row.innerHTML = `
    <span>${time}</span>
    <span class="${isBuy ? 'side-buy' : 'side-sell'}">${isBuy ? 'BUY' : 'SELL'}</span>
    <span>${size} ${token}</span>
    <span>$${fillPrice}</span>
  `;
  
  log.insertBefore(row, log.firstChild);
  if (log.children.length > 8) {
    log.removeChild(log.lastChild);
  }
}

// ----------------------------------------
// Loop 3 Logic: Execution & Autopilot
// ----------------------------------------
function toggleAutopilot(active) {
  const toggleBtn = document.getElementById('toggle-autopilot');
  const statusEl = document.getElementById('execution-status');
  
  if (active) {
    appState.autopilot = 'on';
    toggleBtn.setAttribute('aria-pressed', 'true');
    statusEl.textContent = 'Autopilot ACTIVE';
    statusEl.className = 'panel-status-text neon-emerald';
    
    // Clear feed log
    document.getElementById('execution-feed-log').innerHTML = '';
    
    // Start interval loop
    startAutopilotLogLoop();
    
    // Active heartbeat animation on status indicator
    document.getElementById('status-execution').classList.add('animate-pulse');
  } else {
    appState.autopilot = 'off';
    toggleBtn.setAttribute('aria-pressed', 'false');
    statusEl.textContent = 'Autopilot OFF';
    statusEl.className = 'panel-status-text neon-crimson';
    
    // Clear interval loop
    if (autopilotInterval) clearInterval(autopilotInterval);
    document.getElementById('status-execution').classList.remove('animate-pulse');
  }
}

function startAutopilotLogLoop() {
  const beats = ['trigger', 'observe', 'decide', 'act', 'verify'];
  let currentBeatIndex = 0;

  function runNextBeat() {
    const time = new Date().toLocaleTimeString();
    const beat = beats[currentBeatIndex];
    let msg = '';

    const targetSymbols = [];
    if (appState.assetsWhitelist.sol) targetSymbols.push('$SOL');
    if (appState.assetsWhitelist.hype) targetSymbols.push('$HYPE');
    if (appState.assetsWhitelist.pol) targetSymbols.push('$POL');
    if (targetSymbols.length === 0) targetSymbols.push('$HYPE'); // fallback

    const activeToken = targetSymbols[Math.floor(Math.random() * targetSymbols.length)];

    // Compile dynamic, highly professional messages
    switch (beat) {
      case 'trigger':
        msg = `[Trigger] ${activeToken} price break detected. Volume delta > SMA multiplier.`;
        break;
      case 'observe':
        msg = `[Observe] Ingested book spreads & negative funding index. Liquidity checks passed.`;
        break;
      case 'decide':
        const levText = `${appState.selectedLeverage}.0x`;
        msg = `[Decide] Evaluating strategy weights. Target size set at 2.5% equity with ${levText} margin cap.`;
        break;
      case 'act':
        const fillPrice = (activeToken === '$SOL' ? 174.50 : 14.50) + (Math.random() - 0.5) * 0.4;
        msg = `[Act] Market order routed on Hyperliquid L2. Bought 150 units at $${fillPrice.toFixed(2)}. Status: FILLED.`;
        break;
      case 'verify':
        const lossVal = appState.selectedDrawdownLimit;
        msg = `[Verify] Trailing stop attached. Hard drawdown kill-switch at ${lossVal}% equity floor verified: [SAFE].`;
        break;
    }

    appendExecutionFeedLog(beat, msg);
    
    // Advance beat index
    currentBeatIndex = (currentBeatIndex + 1) % beats.length;
  }

  runNextBeat();
  autopilotInterval = setInterval(runNextBeat, 3000);
}

function appendExecutionFeedLog(beat, msg) {
  const log = document.getElementById('execution-feed-log');
  const time = new Date().toLocaleTimeString();
  
  const row = document.createElement('div');
  row.className = `feed-row feed-beat-${beat}`;
  row.innerHTML = `<span class="feed-time">[${time}]</span><span class="feed-beat">[${beat.toUpperCase()}]</span>${msg}`;
  
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;

  // Prune log length
  if (log.children.length > 20) {
    log.removeChild(log.firstChild);
  }
}

// ----------------------------------------
// Utilities & Global Actions
// ----------------------------------------
function appendChatMessage(type, text) {
  const chatMessagesBox = document.getElementById('chat-messages-box');
  const msg = document.createElement('div');
  msg.className = `message ${type}`;
  msg.innerHTML = `<p>${text}</p>`;
  chatMessagesBox.appendChild(msg);
  chatMessagesBox.scrollTop = chatMessagesBox.scrollHeight;
}

function triggerLoopLatencyPulse() {
  const indicators = ['latency-research', 'latency-strategy', 'latency-execution'];
  indicators.forEach(id => {
    const el = document.getElementById(id);
    const originalText = el.textContent;
    el.textContent = '...';
    
    setTimeout(() => {
      const lat = Math.floor(10 + Math.random() * 40);
      el.textContent = `${lat}ms`;
    }, 600);
  });
}

function flashPanelBorder(panelId) {
  const el = document.getElementById(panelId);
  el.style.borderColor = 'var(--neon-emerald)';
  el.style.boxShadow = 'var(--glow-emerald)';
  
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow = '';
  }, 1000);
}

function resetDemo() {
  // Clear Intervals
  if (paperInterval) clearInterval(paperInterval);
  if (autopilotInterval) clearInterval(autopilotInterval);

  // Reset state
  appState = {
    research: 'idle',
    strategy: 'locked',
    autopilot: 'off',
    currentThesis: null,
    activeTemplate: null,
    paperEquity: 100000.00,
    paperNetProfit: 0.00,
    paperTradesCount: 0,
    selectedLeverage: '5',
    selectedDrawdownLimit: '5',
    assetsWhitelist: { sol: true, hype: true, pol: false }
  };

  // Reset UI elements
  // Column 1
  document.getElementById('chat-messages-box').innerHTML = `
    <div class="message system-message">
      <p>Welcome to Minara AI Console. Run research on market segments, asset stats, and macro signals below.</p>
    </div>
  `;
  document.getElementById('thesis-body-content').innerHTML = '';
  document.getElementById('btn-send-to-studio').disabled = true;
  
  // Re-lock panels
  const thesisContainer = document.getElementById('thesis-container');
  if (!thesisContainer.querySelector('.lock-overlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'thesis-lock-overlay';
    overlay.className = 'lock-overlay';
    overlay.innerHTML = '<div class="lock-icon">🔒</div><p>Run a research query to compile thesis</p>';
    thesisContainer.appendChild(overlay);
    thesisContainer.classList.add('locked');
  }

  const strategyWorkspace = document.getElementById('testing-workspace-container');
  strategyWorkspace.classList.add('locked');
  const strategyLock = document.getElementById('testing-lock-overlay');
  if (strategyLock) strategyLock.classList.remove('hidden');

  document.getElementById('strategy-prompt').value = '';
  document.getElementById('strategy-template-select').value = '';
  document.getElementById('btn-run-backtest').disabled = true;
  document.getElementById('strategy-status').textContent = 'Waiting';
  document.getElementById('strategy-status').className = 'panel-status-text neon-gold';

  // Stats
  document.getElementById('stat-sharpe').textContent = '--';
  document.getElementById('stat-drawdown').textContent = '--';
  document.getElementById('stat-winrate').textContent = '--';
  drawEmptyChart();
  drawHeatmap(true);
  resetTestCheckmarks();

  // Paper Trading reset
  document.getElementById('paper-equity').textContent = '$100,000.00';
  document.getElementById('paper-profit').textContent = '+$0.00 (0.00%)';
  document.getElementById('paper-profit').className = 'neon-emerald';
  document.getElementById('paper-fills-log').innerHTML = '<div class="empty-text">No active orders. Awaiting market entry conditions...</div>';
  document.getElementById('ob-spread').textContent = 'Spread: --';
  document.getElementById('ob-asks').innerHTML = '';
  document.getElementById('ob-bids').innerHTML = '';

  const gate = document.getElementById('validation-gate-status');
  gate.querySelector('.indicator-circle').className = 'indicator-circle circle-gold';
  gate.querySelector('.txt').textContent = 'Awaiting backtest completion';
  document.getElementById('btn-promote-to-live').disabled = true;

  // Column 3
  toggleAutopilot(false);
  document.getElementById('toggle-autopilot').disabled = true;
  document.getElementById('execution-status').textContent = 'Autopilot OFF';
  document.getElementById('execution-status').className = 'panel-status-text neon-crimson';
  document.getElementById('execution-feed-log').innerHTML = '<div class="empty-text">Autopilot inactive. Turn on engine to route live loops.</div>';

  appendChatMessage('system-message', 'Simulation reset. Ready for new research input.');
}
