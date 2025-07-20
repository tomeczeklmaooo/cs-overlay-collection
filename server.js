const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const port = 41079;

let clients = [];

// +++ GLOBAL CONFIGURATION OBJECT
let current_overlay_config = {
	tournament_name: '',
	tournament_stage: '',
	team_left_name: '',
	team_left_score: 0,
	team_right_name: '',
	team_right_score: 0,
	show_scores: false,
	break_scene_type: 'break',
	group_standings_a: [
		{ name: '', win: 0, draw: 0, loss: 0, points: 0 },
		{ name: '', win: 0, draw: 0, loss: 0, points: 0 },
		{ name: '', win: 0, draw: 0, loss: 0, points: 0 },
		{ name: '', win: 0, draw: 0, loss: 0, points: 0 }
	],
	group_standings_b: [
		{ name: '', win: 0, draw: 0, loss: 0, points: 0 },
		{ name: '', win: 0, draw: 0, loss: 0, points: 0 },
		{ name: '', win: 0, draw: 0, loss: 0, points: 0 },
		{ name: '', win: 0, draw: 0, loss: 0, points: 0 }
	],
	production: 'toaster',
	casters: 'CASTER_A$CASTER_B' // new lines as $ symbol
};
// --- GLOBAL CONFIGURATION OBJECT

wss.on('connection', ws => {
	console.log('Connected to WebSocket');
	ws.send(JSON.stringify({ type: 'config_payload', payload: current_overlay_config }));

	ws.on('close', () => {
		console.log('WebSocket connection closed');
	});

	ws.on('error', error => {
		console.error('WebSocket error: ', error);
	});
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/config-update', (req, res) => {
	const new_config = req.body;
	current_overlay_config = { ...current_overlay_config, ...new_config };

	wss.clients.forEach(client => {
		if (client.readyState === WebSocket.OPEN)
		{
			client.send(JSON.stringify({ type: 'config_payload', payload: current_overlay_config }));
		}
	});

	res.json({ message: 'Configuration updated!' });
});

app.get('/config-get', (req, res) => {
	res.json(current_overlay_config);
});

app.post('/', (req, res) => {
	const data = JSON.stringify(req.body);
	clients.forEach(client => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(data);
		}
	});
	res.sendStatus(200);
});

app.get('/hud', (req, res) => {
	const timestamp = new Date();
	res.sendFile(path.join(__dirname, 'public', 'hud.html'));
	console.log(`[${timestamp.toLocaleTimeString('en-GB')}] GET: /hud -> hud.html`);
});

app.get('/break', (req, res) => {
	const timestamp = new Date();
	res.sendFile(path.join(__dirname, 'public', 'break.html'));
	console.log(`[${timestamp.toLocaleTimeString('en-GB')}] GET: /break -> break.html`);
});

app.get('/panel', (req, res) => {
	const timestamp = new Date();
	res.sendFile(path.join(__dirname, 'public', 'panel.html'));
	console.log(`[${timestamp.toLocaleTimeString('en-GB')}] GET: /panel -> panel.html`);
});

server.listen(port, () => {
	console.log(`Server listening on http://localhost:${port}`);
	console.log(`HUD available at http://localhost:${port}/hud`);
	console.log(`Break scene available at http://localhost:${port}/break`);
	console.log(`Configuration panel available at http://localhost:${port}/panel`);
});