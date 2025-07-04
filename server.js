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

wss.on('connection', ws => {
	clients.push(ws);
	ws.on('close', () => {
		clients = clients.filter(c => c !== ws);
	});
});

app.use(bodyParser.json());

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

app.use(express.static(path.join(__dirname, 'public')));

server.listen(port, () => {
	console.log(`Server listening on http://localhost:${port}`);
	console.log(`HUD available at http://localhost:${port}/hud`);
	console.log(`Break scene available at http://localhost:${port}/break`);
	console.log(`Configuration panel available at http://localhost:${port}/panel`);
});