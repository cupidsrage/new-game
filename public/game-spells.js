// Magic tab logic
let currentSpellFilter = 'all';
const TARGETED_SPELLS = new Set([
    'fireball',
    'lightning_storm',
    'meteor_strike',
    'plague',
    'clairvoyance',
    'teleport',
    'weakness',
    'confusion',
    'steal_mana',
    'summon_dragon'
]);

function getSpellResearchState(spellId) {
    const researchList = player?.spellResearch || [];
    const state = researchList.find(item => item.spell_id === spellId);
    if (!state) return { researched: false, inProgress: false, remainingMs: 0, completesAt: null };

    if (state.completed) {
        return { researched: true, inProgress: false, remainingMs: 0, completesAt: null };
    }

    const completesAt = state.completes_at || null;
    const remainingMs = Math.max(0, (completesAt || 0) - Date.now());
    return { researched: false, inProgress: remainingMs > 0, remainingMs, completesAt };
}

function renderSpells() {
    const container = document.getElementById('spellsList');
    container.innerHTML = '';

    for (const [key, spell] of Object.entries(gameData.spells)) {
        if (currentSpellFilter !== 'all' && spell.school !== currentSpellFilter) continue;

        const research = getSpellResearchState(spell.id);
        const researchDays = Math.max(1, Number(spell.researchDays) || 1);
        let actionButton = `<button onclick="researchSpell('${spell.id}')">Research Spell</button>`;

        if (research.researched) {
            actionButton = `<button onclick="castSpellPrompt('${spell.id}')">Cast Spell</button>`;
        } else if (research.inProgress) {
            actionButton = `<button disabled><span class="spell-research-timer" data-completes-at="${research.completesAt || ''}">Researching (${formatTime(research.remainingMs)})</span></button>`;
        }

        const card = document.createElement('div');
        card.className = 'spell-card';
        card.innerHTML = `
            <div class="spell-school">${spell.school}</div>
            <h4>${spell.name}</h4>
            <p>${spell.description}</p>
            <p><strong>Mana Cost:</strong> ${spell.manaCost}</p>
            <p><strong>Cooldown:</strong> ${formatTime(spell.cooldown * 1000)}</p>
            <p><strong>Research Time:</strong> ${researchDays} day${researchDays === 1 ? '' : 's'}</p>
            ${actionButton}
        `;
        container.appendChild(card);
    }
}

function filterSpells(school, triggerElement = null) {
    currentSpellFilter = school;

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const clickedFilter = triggerElement?.currentTarget || triggerElement || Array.from(document.querySelectorAll('.filter-btn'))
        .find(btn => btn.getAttribute('onclick')?.includes(`filterSpells('${school}'`));
    if (clickedFilter) {
        clickedFilter.classList.add('active');
    }
    
    renderSpells();
}

function researchSpell(spellId) {
    socket.emit('researchSpell', { spellId });

    socket.once('researchSpellResult', (result) => {
        if (result.success) {
            showNotification(`Research started. Completes in ${formatTime(result.estimatedResearchTime * 1000)}`, 'success');
            socket.emit('getMessages');
        } else {
            showNotification(result.error, 'danger');
        }
    });
}

function castSpellPrompt(spellId) {
    if (!TARGETED_SPELLS.has(spellId)) {
        castSpell(spellId);
        return;
    }

    showModal('Cast Targeted Spell', `
        <p style="margin-bottom: 0.75rem;">Enter a target username:</p>
        <input id="spellTargetInput" type="text" placeholder="Target username" style="width: 100%; padding: 0.5rem; margin-bottom: 0.75rem;" />
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button onclick="closeModal()">Cancel</button>
            <button onclick="submitSpellTarget('${spellId}')">Cast</button>
        </div>
    `);

    setTimeout(() => {
        document.getElementById('spellTargetInput')?.focus();
    }, 0);
}

function submitSpellTarget(spellId) {
    const target = document.getElementById('spellTargetInput')?.value?.trim();
    if (!target) {
        showNotification('Please enter a target username.', 'danger');
        return;
    }

    closeModal();
    castSpell(spellId, target);
}

function castSpell(spellId, targetPlayerId = null) {
    socket.emit('castSpell', { spellId, targetPlayerId });
    
    socket.once('castSpellResult', (result) => {
        if (result.success) {
            showNotification(`Spell cast successfully!`, 'success');
        } else {
            showNotification(result.error, 'danger');
        }
    });
}

