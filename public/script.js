const ws = new WebSocket(`ws://localhost:41079`);

// BEGIN CONFIG VARIABLES
const radar_top_title = 'Falcon League 6 &ndash; Grupa A';
// END CONFIG VARIABLES

let last_winner = null;
let last_phase_start = null;
let remaining_time = 0;
let round_phase = null;

const MAP_CONFIG = {
	ar_baggage:       { pos_x: -1316, pos_y: 1288, scale: 2.539062 },
	ar_shoots:        { pos_x: -1368, pos_y: 1952, scale: 2.687500 },
	cs_italy:         { pos_x: -2647, pos_y: 2592, scale: 4.6 },
	cs_office:        { pos_x: -1838, pos_y: 1858, scale: 4.1 },
	de_ancient:       { pos_x: -2953, pos_y: 2164, scale: 5 },
	de_anubis:        { pos_x: -2796, pos_y: 3328, scale: 5.22 },
	de_dust:          { pos_x: -2850, pos_y: 4073, scale: 6 },
	de_dust2:         { pos_x: -2476, pos_y: 3239, scale: 4.4 },
	de_inferno:       { pos_x: -2087, pos_y: 3870, scale: 4.9 },
	de_inferno_s2:    { pos_x: -2087, pos_y: 3870, scale: 4.9 },
	de_mirage:        { pos_x: -3230, pos_y: 1713, scale: 5 },
	de_nuke:          { pos_x: -3453, pos_y: 2887, scale: 7 },
	de_overpass:      { pos_x: -4831, pos_y: 1781, scale: 5.2 },
	de_overpass_2v2:  { pos_x: -4831, pos_y: 1781, scale: 5.2 },
	de_train:         { pos_x: -2308, pos_y: 2078, scale: 4.082077 },
	de_vertigo:       { pos_x: -3168, pos_y: 1762, scale: 4 }
};

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

function world_to_radar(x, y, map_config, radar_width, radar_height)
{
	const dx = x - map_config.pos_x;
	const dy = map_config.pos_y - y; // flipped Y axis
	console.log(`dx=${dx} dy=${dy}`);

	const full_map_pixel_size = 1024;
	const display_scale = map_config.scale * (full_map_pixel_size / radar_width);

	const pixelX = (radar_width / 2 + dx / display_scale) - (radar_width / 2);
	const pixelY = (radar_height / 2 + dy / display_scale) - (radar_height / 2);
	console.log(`x=${pixelX} y=${pixelY}`);


	return { x: pixelX, y: pixelY };
}

function get_best_weapon_and_grenades(weapons)
{
	const priority = ['Rifle', 'SniperRifle', 'Submachine Gun', 'Shotgun', 'Pistol', 'Knife'];
	const grenade_priority = ['molotov', 'incgrenade', 'smokegrenade', 'flashbang', 'hegrenade'];

	let best_weapon = null;
	let best_priority = Infinity;
	let grenades = [];

	for (const key in weapons)
	{
		const w = weapons[key];

		if (!w || !w.name || !w.type) continue;

		if (w.type === 'Grenade')
		{
			grenades.push(w.name);
		}
		else
		{
			const prio = priority.indexOf(w.type);

			if (prio !== -1 && prio < best_priority)
			{
				best_priority = prio;
				best_weapon = w.name;
			}
		}
	}

	grenades.sort((a, b) => {
		const ia = grenade_priority.findIndex(g => a.toLowerCase().includes(g));
		const ib = grenade_priority.findIndex(g => b.toLowerCase().includes(g));
		return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
	});

	return { best_weapon, grenades };
}

function get_weapon_icon_path(weapon)
{
	const name = weapon.replace(/^weapon_/, '');
	return `./weapons/${name}.svg`;
}

let defuse_start_time = null;
let last_bomb_state = null;
let last_has_kit = false;

ws.onmessage = e => {
	const s = JSON.parse(e.data);
	const ps = Object.values(s.allplayers || {});

	ps.forEach(p => {
		console.log(`Player ${p.name} - SteamID: ${p.steamid} - ObsSlot: ${p.observer_slot}`);
	});

	const obs = ps.find(p => p.observer_slot == s.player?.observer_slot);
	const t_L = ps.filter(p => p.team === 'CT');
	const t_R = ps.filter(p => p.team === 'T');
	// const t_L = ps.filter(p => p.team === 'CT' && (!obs || p.observer_slot !== obs.observer_slot));
	// const t_R = ps.filter(p => p.team === 'T' && (!obs || p.observer_slot !== obs.observer_slot));

	document.getElementsByClassName('tournament-bar')[0].innerHTML = radar_top_title;

	// document.getElementsByClassName('radar')[0].innerHTML = `
	// <img src="./radars/ingame/${s.map.name}.png" alt="FL6_RADAR_OVERVIEW" class="radar-img">
	// `;
	document.getElementsByClassName('radar')[0].style.backgroundImage = `url('./radars/ingame/${s.map.name}.png')`;

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

	const radar = document.querySelector('.radar');
	const radar_width = radar.clientWidth;
	const radar_height = radar.clientHeight;
	console.log(`radar_width=${radar_width} radar_height=${radar_height}`);

	// const player_slot_numbers = {};
	// [t_L, t_R].forEach(team => {
	// 	team
	// 		.filter(p => typeof p.observer_slot === 'number')
	// 		.sort((a, b) => a.observer_slot - b.observer_slot)
	// 		.forEach((p, index) => {
	// 			const player_entry = Object.entries(s.allplayers).find(([id, val]) => val === p);
	// 			if (player_entry)
	// 			{
	// 				const [id] = player_entry;
	// 				player_slot_numbers[id] = index + 1;
	// 			}
	// 		});
	// });

	const cfg = MAP_CONFIG[s.map.name];
	if (!cfg) return;

	document.querySelectorAll('.radar-dot').forEach(dot => dot.remove());
	for (const id in s.allplayers)
	{
		const p = s.allplayers[id];
		const [wx, wy] = p.position.split(',').map(parseFloat);
		const { x, y } = world_to_radar(wx, wy, cfg, radar_width, radar_height);

		let dot = document.getElementById(`dot-${id}`);
		// const slot = player_slot_numbers[id] ?? '?';
		const slot = typeof p.observer_slot === 'number'
					? (p.observer_slot === 9 ? '0' : (p.observer_slot + 1).toString())
					: '?';
		// const slot = p.observer_slot;
		// slot = slot === 10 ? 0 : slot;

		if (!dot)
		{
			dot = document.createElement('div');
			dot.id = `dot-${id}`;
			radar.appendChild(dot);
		}

		dot.className = p.team === 'CT' ? 'radar-dot ct' : 'radar-dot t';
		dot.textContent = slot;
		dot.style.left = `${x}px`;
		dot.style.top = `${y}px`;
		console.log(`${p.name} → observer_slot=${p.observer_slot} → label=${slot}`);
	}

	const rnd = (s.map?.round || 0) + 1;
	document.getElementsByClassName('round-counter')[0].textContent = `Runda ${rnd}/24`;

	const bomb_timer_bar = document.querySelector('.bomb-timer');
	const defuse_timer_bar = document.querySelector('.defuse-timer');

	// bomb_timer_bar.classList.add('hidden');
	// defuse_timer_bar.classList.add('hidden');

	if (s.bomb?.state == 'planted' && s.round?.phase !== 'over')
	{
		const time_left = parseFloat(s.phase_countdowns?.phase_ends_in || 0);
		const percent = Math.max(0, Math.min(100, (time_left / 40) * 100));
		bomb_timer_bar.style.width = `${percent}%`;
		bomb_timer_bar.style.opacity = `1`;
	}
	else
	{
		bomb_timer_bar.style.opacity = `0`;
	}

	const bomb_state = s.bomb?.state;

	if (bomb_state === 'defusing' && last_bomb_state !== 'defusing')
	{
		defuse_start_time = Date.now();
		last_has_kit = !!s.bomb?.haskit;
	}

	if (bomb_state === 'defusing' && defuse_start_time)
	{
		const defuse_duration = last_has_kit ? 5000 : 10000;
		const elapsed = Date.now() - defuse_start_time;

		const remaining = Math.max(0, defuse_duration - elapsed);
		const percent = (1- remaining / defuse_duration) * 100;
		// defuse_timer_bar.classList.remove('hidden');
		defuse_timer_bar.style.width = `${percent}%`;
		defuse_timer_bar.style.opacity = `1`;

		if (remaining <= 0)
		{
			// defuse_timer_bar.classList.add('hidden');
			defuse_timer_bar.style.opacity = `0`;
			defuse_start_time = null;
		}
	}
	else
	{
		if (bomb_state !== 'defusing')
		{
			defuse_start_time = null;
			// defuse_timer_bar.classList.add('hidden');
			defuse_timer_bar.style.opacity = `0`;
		}
	}

	last_bomb_state = bomb_state

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
	
	const { best_weapon, grenades } = get_best_weapon_and_grenades(p.weapons || {});

	const weapons = Object.values(p.weapons || {});
	const active_weapon = weapons.find(w => w.state === 'active');
	const is_active = active_weapon?.name === best_weapon;
	const dim_class = is_active ? '' : 'dimmed';

	const best_weapon_icon = best_weapon ? `<img src="${get_weapon_icon_path(best_weapon)}" alt="FL6_PLAYER_GUN" class="player-weapon-gun ${dim_class}">` : '';
	const grenade_icons = grenades.map(g => `<img src="${get_weapon_icon_path(g)}" alt="FL6_PLAYER_GRENADE" class="player-weapon-gun">`).join('');

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
			${best_weapon_icon}
			<div class="grenades">
				${grenade_icons}
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

setInterval(() => {
	if (!isNaN(remaining_time))
	{
		remaining_time = Math.max(0, remaining_time - 0.5);
		const text = format_time(remaining_time);
		const timer = document.getElementsByClassName('round-timer')[0];
		if (timer) timer.textContent = text;
	}
}, 500);
