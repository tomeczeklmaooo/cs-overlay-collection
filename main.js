const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

let main_window;

function create_window()
{
	main_window = new BrowserWindow({
		width: 1920,
		height: 1080,
		x: 0,
		y: 0,
		frame: false,
		transparent: true,
		alwaysOnTop: true,
		resizable: false,
		fullscreenable: false,
		skipTaskbar: false,
		focusable: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: true
		}
	});

	main_window.loadURL(url.format({
		pathname: path.join(__dirname, 'public', 'hud.html'),
		protocol: 'file:',
		slashes: true
	}));

	main_window.setIgnoreMouseEvents(true, { forward: true });

	main_window.on('closed', () => {
		main_window = null;
	});
}

app.whenReady().then(create_window);

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin')
	{
		app.quit();
	}
});

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0)
	{
		create_window();
	}
});