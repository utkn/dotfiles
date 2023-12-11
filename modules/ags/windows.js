import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import Variable from 'resource:///com/github/Aylur/ags/variable.js';
import App from 'resource:///com/github/Aylur/ags/app.js';
import { timeout } from 'resource:///com/github/Aylur/ags/utils.js';

import { HSeparator } from './components.js';
import { MiniAudioControl } from './audio.js';
import { MiniBluetoothControl } from './bluetooth.js';
import { TrayRevealer } from './tray.js';
import { MiniWorkspaces, WindowTitle } from './hyprland.js';
import { MiniMonitor } from './monitor.js';
import { DateTime } from './misc.js';
import { MiniNetworkControl } from './network.js';
import { MiniLauncher } from './launcher.js';

const POPUP_TRANSITION_DURATION = 200;

export const BarWindow = (/** @type {number} */  monitor) => Widget.Window({
  name: `bar-${monitor}`,
  class_name: 'bar',
  focusable: false,
  monitor,
  anchor: ['top', 'left', 'right'],
  layer: 'top',
  exclusivity: 'exclusive',
  child: Widget.CenterBox({
    class_name: 'bar-content',
    hexpand: true,
    start_widget: 
      Widget.Box({
        hpack: 'start',
        children: [
          HSeparator(),
          MiniWorkspaces(monitor),
          HSeparator(),
          WindowTitle(),
        ],
    }),
    center_widget: MiniLauncher(),
    end_widget: 
      Widget.Box({
        hpack: 'end',
        children: [
          MiniMonitor({}),
          HSeparator(),
          HSeparator(),
          MiniAudioControl(monitor),
          HSeparator(),
          MiniBluetoothControl(monitor),
          HSeparator(),
          MiniNetworkControl(),
          HSeparator(),
          TrayRevealer(),
          HSeparator(),
          HSeparator(),
          DateTime(),
          HSeparator(),
        ],
      })   
  }),
});

const WindowRevealer = ({ position, reveal, windowContent, revealerProps }) => {
  const fixedContainer = Widget.Fixed({
    class_name: 'window-fixed-container',
  });
  // We need this otherwise the contents won't be rendered except when we have a crossfade transitions.
  // Why? Ask the developers of gtk. Ask them wtf they were thinking.
  fixedContainer.put(Widget.Label({ label: ''  }), 0, 0);
  fixedContainer.put(
    Widget.Revealer({
      ...revealerProps,
      class_name: 'window-revealer',
      child: Widget.Box({
        class_name: 'window-revealer-positioner',
        child: windowContent,
        connections: [
          [position, self => {
            // Handle the negative values in x and y.
            const [[l, r], [t, b]] = [
              position.value.x >= 0 ? [position.value.x, 0] : [0, -position.value.x],
              position.value.y >= 0 ? [position.value.y, 0] : [0, -position.value.y]
            ];
            self.setCss(`margin: ${t}px ${r}px ${b}px ${l}px`);
          }]
        ]
      }),
      binds: [['reveal-child', reveal]],
    }), 0, 0);
  return fixedContainer;
};

export const TooltipWindow = ({ windowProps, revealPopup, position, content, transition = 'crossfade' }) => 
  Widget.Window({
    ...windowProps,
    class_name: 'window',
    visible: true,
    focusable: false,
    binds: [
      ...(windowProps.binds || []),
    ],
    connections: [
      ...(windowProps.connections || []),
      // Push to the background when not revealed
      [revealPopup, self => {
          if(!revealPopup.value) {
            // Do not push back too early, otherwise the animation will be cut short 
            timeout(POPUP_TRANSITION_DURATION, () => { if(!revealPopup.value) self.layer = 'background' })
          } else {
            self.layer = 'overlay';
          }
        }
      ],
    ],
    child: WindowRevealer({ 
      position,
      reveal: revealPopup, 
      windowContent: Widget.Box({
        class_name: 'window-frame',
        child: Widget.Box({
          class_name: 'window-content',
          child: content
        }),
      }),
      revealerProps: {
        transition,
        transition_duration: POPUP_TRANSITION_DURATION,
      },
    }),
  });

export const PopupWindow = ({ windowProps, revealPopup, content, position = Variable({x: 0, y: 0}), transition = 'slide_down' }) => 
  TooltipWindow({
    windowProps: {
      ...windowProps,
      layer: 'overlay',
      binds: [
        ...(windowProps.binds || []),
       ['focusable', revealPopup]
      ],
      connections: [
        ...(windowProps.connections || []),
        ['button-press-event', self => {
          const [x, y] = self.get_pointer();
          if(x <= position.value.x || y <= position.value.y) {
            revealPopup.setValue(false);
          }
        }],
      ]
    },
    revealPopup,
    content,
    transition,
		position,
  });

export const registerWindow = (window)  => {
	const windowName = window.name;
	App.removeWindow(windowName);
	App.addWindow(window);
}
