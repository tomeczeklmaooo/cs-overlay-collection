const { app, BrowserWindow, globalShortcut, screen } = require('electron');
const path = require('path');
const url = require('url');

let main_window;

function create_window()
{
	const primary_display = screen.getPrimaryDisplay();
	const { width, height } = primary_display.size;
	const x = primary_display.bounds.x;
	const y = primary_display.bounds.y;

	main_window = new BrowserWindow({
		width: width,
		height: height,
		x: x,
		y: y,
		frame: false,
		transparent: true,
		type: 'toolbar',
		// alwaysOnTop: true,
		resizable: false,
		fullscreenable: false,
		skipTaskbar: false,
		focusable: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: true
		}
	});

	main_window.setAlwaysOnTop(true, 'screen-saver');

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

app.whenReady().then(() => {
	create_window();

	const ret = globalShortcut.register('CommandOrControl+R', () => {
		console.log('Reloading HUD...');
		if (main_window)
		{
			main_window.webContents.reloadIgnoringCache();
		}
	});

	if (!ret)
	{
		console.log('Failed to register reload shortcut');		
	}
	else
	{
		console.log('Registered the reload shortcut');
	}
});

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

app.on('will-quit', () => {
	globalShortcut.unregisterAll();
});