// ==========================================
// 1. 全域狀態與初始化
// ==========================================
let state = {
    hero: {
        name: "Hero", avatar: "🧙‍♂️",
        level: 1, exp: 0, nextExp: 100, gold: 0,
        hp: 100, maxHp: 100,
        totalExp: 0, questsCompleted: 0,
        vitalityDifficulty: 24 // 預設 24 HP/天
    },
    quests: [],
    lastTick: Date.now(),
    lastResetDate: new Date().toLocaleDateString()
};

const CACHE_KEY = 'epic-quest-save';
let audioCtx = null;

function loadFromStorage() {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) state = JSON.parse(saved);
}

function saveToStorage() {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
}

// ==========================================
// 2. 核心迴圈 (The Sands of Time 機制)
// ==========================================
function gameTick() {
    const now = Date.now();
    const deltaMs = now - state.lastTick;
    
    // 計算扣血量：難度 (HP/天) 換算為每毫秒扣除量
    const msInDay = 24 * 60 * 60 * 1000;
    const hpDecay = (state.hero.vitalityDifficulty / msInDay) * deltaMs;
    
    state.hero.hp = Math.max(0, state.hero.hp - hpDecay);
    state.lastTick = now;

    // 檢查死亡
    if (state.hero.hp <= 0) handleDeath();

    // 跨日檢查 (Tomorrow -> Active)
    const today = new Date().toLocaleDateString();
    if (state.lastResetDate !== today) {
        state.quests.forEach(q => { if (q.type === 'tomorrow') q.type = 'active'; });
        state.lastResetDate = today;
        showToast("A new day dawns. Prophecies awaken!");
    }

    updateHUD();
    updateTimer();
    saveToStorage();
}

function handleDeath() {
    alert("💀 You have fallen! The world resets...");
    state.hero.level = 1; state.hero.exp = 0; state.hero.nextExp = 100;
    state.hero.hp = state.hero.maxHp; state.quests = [];
    saveToStorage();
    location.reload();
}

// ==========================================
// 3. 音效與特效 (Feedback)
// ==========================================
function playSlashSound() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    // 模擬斬擊聲 (1200Hz 降至 200Hz)
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    osc.start(); osc.stop(audioCtx.currentTime + 0.15);
}

function showFloatingText(x, y, text, color) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    el.style.color = color; el.innerText = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function showToast(msg) {
    const toast = document.getElementById('epic-toast');
    toast.innerText = msg; toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ==========================================
// 4. 介面更新與互動邏輯
// ==========================================
function updateHUD() {
    document.getElementById('hero-level').innerText = state.hero.level;
    document.getElementById('hero-gold').innerText = Math.floor(state.hero.gold);
    
    const hpPct = (state.hero.hp / state.hero.maxHp) * 100;
    const hpBar = document.getElementById('hp-bar');
    hpBar.style.width = `${hpPct}%`;
    document.getElementById('hp-text').innerText = `${Math.ceil(state.hero.hp)}/${state.hero.maxHp}`;
    
    // HP 顏色與 Debuff
    const debuffOverlay = document.getElementById('debuff-overlay');
    if (hpPct > 50) { hpBar.style.backgroundColor = 'var(--hp-high)'; debuffOverlay.classList.add('hidden'); }
    else if (hpPct > 25) { hpBar.style.backgroundColor = 'var(--hp-mid)'; debuffOverlay.classList.add('hidden'); }
    else { hpBar.style.backgroundColor = 'var(--hp-low)'; debuffOverlay.classList.remove('hidden'); }

    const expPct = (state.hero.exp / state.hero.nextExp) * 100;
    document.getElementById('exp-bar').style.width = `${expPct}%`;
    document.getElementById('exp-text').innerText = `${state.hero.exp}/${state.hero.nextExp}`;
}

function updateTimer() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const diff = tomorrow - now;
    const h = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
    const m = String(Math.floor((diff / 1000 / 60) % 60)).padStart(2, '0');
    const s = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
    document.getElementById('countdown-timer').innerText = `${h}:${m}:${s}`;
}

function addExp(amount) {
    state.hero.exp += amount; state.hero.totalExp += amount;
    while (state.hero.exp >= state.hero.nextExp) {
        state.hero.exp -= state.hero.nextExp;
        state.hero.level++;
        state.hero.nextExp = Math.floor(state.hero.nextExp * 1.5); // 經驗曲線
        showToast(`🌟 LEVEL UP! You are now Level ${state.hero.level}!`);
    }
}

// ==========================================
// 5. 任務系統 (Quest System)
// ==========================================
function renderQuests() {
    const activeList = document.getElementById('quest-list');
    activeList.innerHTML = '';
    
    const activeQuests = state.quests.filter(q => q.type === 'active');
    activeQuests.forEach(q => {
        const div = document.createElement('div');
        div.className = 'quest-card'; div.id = `quest-${q.id}`;
        div.innerHTML = `
            <div class="quest-card-content">
                <div class="quest-title">${q.title}</div>
                <div class="quest-reward">✨ +10 EXP 💰 +${q.gold} G</div>
            </div>
            <button class="complete-btn" onclick="completeQuest(${q.id}, event)">⚔️</button>
        `;
        activeList.appendChild(div);
        
        // 實作手勢滑動 (Swipe Right)
        let startX = 0;
        div.addEventListener('pointerdown', e => startX = e.clientX);
        div.addEventListener('pointerup', e => {
            if (e.clientX - startX > 100) completeQuest(q.id, { clientX: e.clientX, clientY: e.clientY });
        });
    });
}

function completeQuest(id, event) {
    const questIdx = state.quests.findIndex(q => q.id === id);
    if (questIdx === -1) return;
    
    const quest = state.quests[questIdx];
    const cardEl = document.getElementById(`quest-${id}`);
    
    // 視覺與聽覺回饋
    playSlashSound();
    cardEl.classList.add('slashed');
    if(event) {
        showFloatingText(event.clientX - 20, event.clientY - 20, "+10 EXP", "var(--exp)");
        showFloatingText(event.clientX + 20, event.clientY - 40, `+${quest.gold} G`, "var(--gold)");
    }

    setTimeout(() => {
        addExp(10);
        state.hero.gold += quest.gold;
        state.hero.questsCompleted++;
        state.quests.splice(questIdx, 1);
        saveToStorage();
        renderQuests();
        updateHUD();
    }, 800); // 等待 Slash 動畫結束
}

// 事件監聽器與初始化
document.getElementById('add-quest-btn').addEventListener('click', () => {
    const title = document.getElementById('new-quest-title').value;
    const gold = parseInt(document.getElementById('new-quest-gold').value) || 10;
    if (!title) return;
    
    state.quests.push({ id: Date.now(), title, gold, type: 'active' });
    document.getElementById('new-quest-title').value = '';
    saveToStorage(); renderQuests();
});

// SPA 導航切換
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById(e.target.dataset.target).classList.add('active');
    });
});

// 難度滑桿綁定
document.getElementById('difficulty-slider').addEventListener('input', (e) => {
    state.hero.vitalityDifficulty = parseInt(e.target.value);
    document.getElementById('difficulty-val').innerText = state.hero.vitalityDifficulty;
    saveToStorage();
});

// 啟動遊戲
window.onload = () => {
    loadFromStorage();
    renderQuests();
    document.getElementById('difficulty-slider').value = state.hero.vitalityDifficulty;
    document.getElementById('difficulty-val').innerText = state.hero.vitalityDifficulty;
    setInterval(gameTick, 1000); // 每秒觸發核心迴圈
};