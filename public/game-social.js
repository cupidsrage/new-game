// Combat, leaderboard, and messages logic
// Combat tab
function attackPlayer() {
    const targetUsername = document.getElementById('targetUsername').value;
    if (!targetUsername) {
        showNotification('Please enter a username', 'danger');
        return;
    }

    // In real implementation, we'd look up player ID from username
    socket.emit('attack', { targetPlayerId: targetUsername });
    
    socket.once('attackResult', (result) => {
        if (result.success) {
            const report = result.report;
            showModal('Battle Report', `
                <div style="margin-bottom: 1rem;">
                    <strong>${report.victory ? 'VICTORY!' : 'DEFEAT'}</strong>
                </div>
                <p>Your Power: ${report.attackerPower}</p>
                <p>Enemy Power: ${report.defenderPower}</p>
                <p>Your Casualties: ${report.attackerUnitsLost} units</p>
                <p>Enemy Casualties: ${report.defenderUnitsLost} units</p>
                ${report.victory ? `
                    <p style="color: #2ecc71;">Gold Stolen: ${report.goldStolen}</p>
                    <p style="color: #2ecc71;">Land Captured: ${report.landCaptured}</p>
                ` : ''}
            `);
        } else {
            showNotification(result.error, 'danger');
        }
    });
}

function renderCombatHistory(history) {
    const container = document.getElementById('combatHistory');
    container.innerHTML = '';

    if (history.length === 0) {
        container.innerHTML = '<p>No combat history</p>';
        return;
    }

    history.forEach(combat => {
        const report = JSON.parse(combat.combat_report);
        const isAttacker = combat.attacker_id === player.id;
        const victory = isAttacker ? report.victory : !report.victory;
        
        const div = document.createElement('div');
        div.className = `combat-item ${victory ? 'victory' : 'defeat'}`;
        div.innerHTML = `
            <div><strong>${victory ? 'Victory' : 'Defeat'}</strong></div>
            <div>${isAttacker ? 'Attacked' : 'Defended against'} player</div>
            <div>${new Date(combat.timestamp).toLocaleString()}</div>
        `;
        container.appendChild(div);
    });
}

// Leaderboard
function renderLeaderboard(players) {
    const container = document.getElementById('leaderboardList');
    container.innerHTML = '';

    players.forEach((p, index) => {
        const div = document.createElement('div');
        div.className = 'leaderboard-item';
        div.innerHTML = `
            <div class="rank">#${index + 1}</div>
            <div><strong>${p.username}</strong></div>
            <div>Lvl ${p.level}</div>
            <div>${p.land} wild / ${p.total_land} total</div>
            <div>${p.wins}W/${p.losses}L</div>
        `;
        container.appendChild(div);
    });
}

// Messages
function renderMessages(messages) {
    const container = document.getElementById('messagesList');
    container.innerHTML = '';

    const unreadCount = messages.filter(m => m.read === 0).length;
    document.getElementById('unreadCount').textContent = unreadCount || '';

    messages.slice(0, 10).forEach(msg => {
        const div = document.createElement('div');
        div.className = `message-item ${msg.type}`;
        div.innerHTML = `
            <div>${msg.message}</div>
            <div style="font-size: 0.8rem; color: #95a5a6; margin-top: 0.3rem;">
                ${new Date(msg.timestamp).toLocaleTimeString()}
            </div>
        `;
        container.appendChild(div);
    });

    if (unreadCount > 0) {
        socket.emit('markMessagesRead');
    }
}
