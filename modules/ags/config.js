import App from 'resource:///com/github/Aylur/ags/app.js';

import { PrimaryWindow } from './components.js';
import { BarWindow } from './windows.js';

export default {
  style: App.configDir + '/style.css',
  windows: [
    PrimaryWindow(0),
    BarWindow(0),
  ]
};
