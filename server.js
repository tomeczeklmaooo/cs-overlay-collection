const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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

app.use(express.static('public'));

server.listen(41079, () => {
	console.log('HUD server running on http://localhost:41079');
});