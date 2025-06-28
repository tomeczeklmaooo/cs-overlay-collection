const ws = new WebSocket(`ws://${location.host}`);

// BEGIN CONFIG VARIABLES
const radar_top_title = '';
// END CONFIG VARIABLES

let last_winner = null;
let last_phase_start = null;
let remaining_time = 0;
let round_phase = null;

ws.onmessage = e => {
	const s = JSON.parse(e.data);
	const ps = Object.values(s.allplayers || {});
	const obs = ps.find(p => p.observer_slot == s.player?.observer_slot);
	const t_L = ps.filter(p => p.team === 'CT');
	const t_R = ps.filter(p => p.team === 'T');
	// const t_L = ps.filter(p => p.team === 'CT' && (!obs || p.observer_slot !== obs.observer_slot));
	// const t_R = ps.filter(p => p.team === 'T' && (!obs || p.observer_slot !== obs.observer_slot));

	document.getElementsByClassName('tournament-bar')[0].innerHTML = radar_top_title;

	document.getElementsByClassName('radar')[0].innerHTML = `
	<img src="./radars/ingame/${s.map.name}.png" alt="FL6_RADAR_OVERVIEW" class="radar-img">
	`;

	['team-left', 'team-right'].forEach(id => {
		document.getElementById(id).innerHTML = (id === 'team-left' ? t_L : t_R)
			.map(p => render_player(p, p.observer_slot === obs?.observer_slot))
			.join('');
	});
	document.getElementById('current-player').innerHTML = render_current(obs);

	document.getElementById('team-left-name').textContent = s.map?.team_ct?.name || 'CT';
	document.getElementById('team-right-name').textContent = s.map?.team_t?.name || 'T';
	document.getElementById('team-left-score').textContent = s.map?.team_ct?.score || 0;
	document.getElementById('team-right-score').textContent = s.map?.team_t?.score || 0;

	document.getElementById('team-left-series').innerHTML = `
	<div class="series-square"></div>
	`;

	// hardcode them idc
	// for (let i = 0; i < s.map?.num_matches_to_win_series; i++)
	// {
	// 	document.getElementById('team-left-series').innerHTML += `
	// 	<div class="series-square"></div>
	// 	`;
	// 	document.getElementById('team-right-series').innerHTML += `
	// 	<div class="series-square"></div>
	// 	`;
	// }

	// for (let i = 0; i < s.map?.team_ct?.matches_won_this_series; i++)
	// {
	// 	document.getElementsByClassName('series-square')[i].classList.add('series-square-ct');
	// }
	// for (let i = 0; i < s.map?.team_t?.matches_won_this_series; i++)
	// {
	// 	document.getElementsByClassName('series-square')[i].classList.add('series-square-t');
	// }

	const rnd = (s.map?.round || 0) + 1;
	document.getElementsByClassName('round-counter')[0].textContent = `Runda ${rnd}/24`;

	// last_phase_start = (s.provider?.timestamp || Date.now() / 1000) * 1000;
	// round_phase = s.round?.phase || 'live';

	const new_phase = s.round?.phase || 'live';
	const new_time = parseFloat(s.phase_countdowns?.phase_ends_in || 0);
	const server_time = (s.provider?.timestamp || Date.now() / 1000) * 1000;
	// round_phase = s.phase_countdowns?.phase || s.round?.phase || 'live';
	// remaining_time = parseFloat(phase_ends_in || 0);
	if (new_phase !== round_phase || Math.abs(new_time - remaining_time) > 1)
	{
		round_phase = new_phase;
		remaining_time = new_time;
	}
	// if (round_phase === null || last_phase_start === null || new_phase !== round_phase)
	// {
	// 	if (phase_time === 0 && ['live', 'bomb', 'defuse'].includes(new_phase))
	// 	{
	// 		console.warn(`Skipping timer initialization: phase = '${new_phase}' and phase_time = 0`);
	// 		return;
	// 	}

	// 	round_phase = new_phase;
	// 	last_phase_time = phase_time;
	// 	last_phase_start = (server_time - phase_time);
	// 	console.log(`Phase initialized/changed to: ${round_phase} at ${new Date(last_phase_start).toISOString()} (phase_time = ${phase_time})`);
	// }
	// last_phase_time = s.round?.phase_time || 0;

	if (s.bomb?.state === 'planting')
	{
		const is_local_player = s.bomb?.player.toString() === s.player?.steamid;
		const planter = is_local_player ? 'You' : s.allplayers?.[s.bomb?.player]?.name || 'Unknown';
		on_bomb_plant(planter);
	}

	const alive_ct = t_L.filter(p => p.state.health > 0).length;
	const alive_t = t_R.filter(p => p.state.health > 0).length;
	
	if (s.round?.phase === 'over' && s.map?.team_ct?.score !== last_winner)
	{
		last_winner = s.map?.team_ct?.score;
	}
};

function render_player(p, is_spectated = false)
{
	const dead = p.state.health <= 0;
	const spec = is_spectated ? 'player-card-spectated' : '';
	const w = p.state.weapon?.name || '';
	// const icon = w.includes
	return `
	<div class="player-card ${dead ? 'player-card-dead' : ''} ${spec}">
		<div class="player-name">
			<div class="name">${p.name}</div>
			${p.state.round_kills > 0 ? `<div class="roundkills">${p.state.round_kills}</div>` : ``}
		</div>
		<div class="player-health ${p.team === 'CT' ? 'player-ct' : 'player-t'}">
			<div class="health">
				<img src="./icons/health.svg" alt="FL6_PLAYER_HEALTH" class="icon">
				<div class="content">${p.state.health}</div>
			</div>
			<div class="armor">
				<img src="${p.state.helmet ? './icons/armor-helmet.svg' : './icons/armor.svg'}" alt="FL6_PLAYER_ARMOR" class="icon">
				<div class="content">${p.state.armor}</div>
			</div>
		</div>
		<div class="player-stats">
			<div class="kills">
				<div class="icon">K</div>
				<div class="content">${p.match_stats.kills}</div>
			</div>
			<div class="deaths">
				<div class="icon">D</div>
				<div class="content">${p.match_stats.deaths}</div>
			</div>
			<div class="money">
				<div class="content">$${p.state.money}</div>
			</div>
		</div>
		<div class="player-weapons">
			<img src="https://raw.githubusercontent.com/drweissbrot/cs-hud/56870aee627ae2d247fa36abd308795c4e6e1e02/src/themes/fennec/img/weapons/ak47.svg" alt="FL6_PLAYER_GUN" class="player-weapon-gun">
			<div class="grenades">
				<img src="https://raw.githubusercontent.com/drweissbrot/cs-hud/56870aee627ae2d247fa36abd308795c4e6e1e02/src/themes/fennec/img/weapons/frag_grenade.svg" alt="FL6_PLAYER_GRENADE" class="player-weapon-gun">
				<img src="https://raw.githubusercontent.com/drweissbrot/cs-hud/56870aee627ae2d247fa36abd308795c4e6e1e02/src/themes/fennec/img/weapons/flashbang.svg" alt="FL6_PLAYER_GRENADE" class="player-weapon-gun">
				<img src="https://raw.githubusercontent.com/drweissbrot/cs-hud/56870aee627ae2d247fa36abd308795c4e6e1e02/src/themes/fennec/img/weapons/smokegrenade.svg" alt="FL6_PLAYER_GRENADE" class="player-weapon-gun">
				<img src="https://raw.githubusercontent.com/drweissbrot/cs-hud/56870aee627ae2d247fa36abd308795c4e6e1e02/src/themes/fennec/img/weapons/firebomb.svg" alt="FL6_PLAYER_GRENADE" class="player-weapon-gun">
			</div>
		</div>
	</div>
	`;
}

function render_current(p)
{
	if (!p) return '';

	const weapons = Object.values(p.weapons || {});
	const active_weapon = weapons.find(w => w.state === 'active');
	const ammo_clip = active_weapon?.ammo_clip ?? 0;
	const ammo_reserve = active_weapon?.ammo_reserve ?? 0;

	return `
	<div class="player-name">
		<div class="name">${p.name}</div>
	</div>
	<div class="player-stats ${p.team === 'CT' ? 'player-ct' : 'player-t'}">
		<div class="player-ammo">
			<img src="https://raw.githubusercontent.com/drweissbrot/cs-hud/56870aee627ae2d247fa36abd308795c4e6e1e02/src/themes/fennec/img/weapons/ammobox_threepack.svg" alt="FL6_AMMO_ICON" class="icon">
			<div class="content">
			${ammo_clip}/${ammo_reserve}
			</div>
		</div>
		<div class="player-health">
			<div class="health">
				<img src="./icons/health.svg" alt="FL6_PLAYER_HEALTH" class="icon">
				<div class="content">${p.state.health}</div>
			</div>
			<div class="armor">
				<img src="${p.state.helmet ? './icons/armor-helmet.svg' : './icons/armor.svg'}" alt="FL6_PLAYER_ARMOR" class="icon">
				<div class="content">${p.state.armor}</div>
			</div>
		</div>
	</div>
	`;
}

function format_time(sec)
{
	const s = Math.max(Math.floor(sec), 0);
	const m = Math.floor(s / 60), r = s % 60;
	return `${m}:${r.toString().padStart(2, '0')}`;
}

// let current_defuse = null;
// let current_plant = null;
// let current_bomb_timer = null;

// function show_progress({
// 	type = 'defuse',
// 	player = '',
// 	label_text = '',
// 	time,
// 	color = '#6ab3e8',
// 	onComplete = () => {}
// })
// {
// 	const container = document.querySelector(`.middle-bar-${type}`);
// 	const label = document.querySelector('.label');
// 	const progress = document.querySelector('.progress');
// 	const timer = document.querySelector('.timer');

// 	container.style.transform = 'translateY(0)';
// 	progress.style.transition = 'none';
// 	progress.style.width = '0%';
// 	void progress.offsetWidth;

// 	label.textContent = label_text.replace('{player}', player);
// 	progress.style.backgroundColor = color;
// 	progress.style.transition = `width ${time}s linear`;

// 	let start = Date.now();

// 	let interval = setInterval(() => {
// 		let elapsed = (Date.now() - start) / 1000;
// 		let remaining = Math.max(0, time - elapsed);
// 		let percent = (elapsed / time) * 100;

// 		progress.style.width = `${Math.min(100, percent)}%`;
// 		timer.textContent = `${remaining.toFixed(1)}s`;

// 		if (elapsed >= time)
// 		{
// 			clearInterval(interval);
// 			container.style.transform = 'translateY(-100%)';
// 			onComplete();
// 		}
// 	}, 100);

// 	return () => {
// 		clearInterval(interval);
// 		container.style.transform = 'translateY(-100%)';
// 	};
// }

// function on_bomb_plant(player)
// {
// 	if (current_plant) current_plant();

// 	current_plant = show_progress({
// 		type: 'bombplant',
// 		player,
// 		label_text: '{player} is planting the bomb',
// 		time: 3,
// 		color: '#eca766',
// 		onComplete: () => {
// 			current_plant = null;
// 			on_bomb_planted();
// 		}
// 	});
// }

// function on_defuse(player, kit = false)
// {
// 	if (current_defuse) current_defuse();

// 	const time = kit ? 5 : 10;

// 	current_defuse = show_progress({
// 		type: 'defuse',
// 		player,
// 		label_text: '{player} is defusing',
// 		time: time,
// 		color: '#6ab3e8',
// 		onComplete: () => {
// 			current_defuse = null;
// 		}
// 	});
// }

// function cancel_defuse()
// {
// 	if (current_defuse)
// 	{
// 		current_defuse();
// 		current_defuse = null;
// 	}
// }

// function cancel_bomb_plant()
// {
// 	if (current_plant)
// 	{
// 		current_plant();
// 		current_plant = null;
// 	}
// }

// function on_bomb_planted()
// {
// 	if (current_bomb_timer) current_bomb_timer();

// 	current_bomb_timer = show_progress({
// 		type: 'bomb',
// 		player,
// 		label_text: 'Bomb planted',
// 		time: 40,
// 		color: '#ff2c2c',
// 		onComplete: () => {
// 			current_plant = null;
// 			on_bomb_planted();
// 		}
// 	});
// }

setInterval(() => {
	if (!isNaN(remaining_time))
	{
		remaining_time = Math.max(0, remaining_time - 0.5);
		const text = format_time(remaining_time);
		const timer = document.getElementsByClassName('round-timer')[0];
		if (timer) timer.textContent = text;
	}
}, 500);

window.addEventListener('DOMContentLoaded', () => {
	setTimeout(() => {
		const prod = document.querySelector('.production');
		if (prod)
		{
			prod.classList.remove('hidden');
			setTimeout(() => {
				prod.classList.add('hidden');
			}, 5000);
		}
	}, 2500);
});