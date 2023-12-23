import Bluetooth from 'resource:///com/github/Aylur/ags/service/bluetooth.js';
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import Variable from 'resource:///com/github/Aylur/ags/variable.js';
import { execAsync, timeout } from 'resource:///com/github/Aylur/ags/utils.js';

import { DynamicIcon, HSeparator, VSeparator } from './components.js';
import { PopupWindow, registerWindow } from './windows.js';

const BLUETOOTH_CONTROL_APP = 'blueman-manager';

export const MiniBluetoothControl = (monitor) => {
  const isConnected = Variable(false);
  const revealDevices = Variable(false);
  const position = Variable({ x: 0, y: 0 });
  const devicesWindow = PopupWindow({
    windowProps: {
      name: `bluetooth-devices-window-${monitor}`,
      anchor: ['top', 'left'],
      monitor,
    },
    revealPopup: revealDevices,
    content: BluetoothDevices(),
    position,
  });
  registerWindow(devicesWindow);
  return Widget.EventBox({
    // Right click to open the device list
    on_secondary_click: self => {
      const [_, x, y] = self.translate_coordinates(self.get_toplevel(), 0, 0);
      position.setValue({ x: x - 30, y: 0 });
      revealDevices.setValue(true);
    },
    // Left click to toggle bluetooth
    on_primary_click: () => { Bluetooth.enabled = !Bluetooth.enabled },
    child: Widget.Box({
      vpack: 'center',
      children: [
        Widget.Revealer({
          transition: 'slide_left',
          transition_duration: 300,
          binds: [['reveal-child', isConnected]],
          child: Widget.Label({
            connections: [
              [Bluetooth, self => { self.label = `${Bluetooth.connected_devices.length}` }],
            ],
          })
        }),
        Widget.Overlay({
          child: DynamicIcon({
            listeners: [Bluetooth, isConnected],
            getIcon: () => `bluetooth-${isConnected.value ? 'connected' : (Bluetooth.enabled ? 'active' : 'disabled')}-symbolic`,
            getTransition: () => 'crossfade',
            icons: [
                'bluetooth-disabled-symbolic',
                'bluetooth-active-symbolic',
                'bluetooth-connected-symbolic',
            ],
          }),
          overlays: [
            Widget.Revealer({
              transition: 'crossfade',
              transition_duration: 300,
              child: Widget.Icon('content-loading-symbolic'),
            })
          ]
        })
      ],
      connections: [
        [Bluetooth, () => { 
          isConnected.setValue(Bluetooth.enabled && Bluetooth.connected_devices.length > 0); 
        }],
        [Bluetooth, self => {
          self.tooltip_text = Bluetooth.enabled ? 'Enabled' : 'Disabled';
          if(Bluetooth.connected_devices.length > 0) {
            self.tooltip_text = `Connected (${Bluetooth.connected_devices.length})`;
          }
        }]
    ]})
  })
}

export const BluetoothDevice = (dev) => {
  const state = Variable('idle');
  return Widget.Box({
    hexpand: true,
    children: [
      Widget.Stack({
        transition: 'crossfade',
        items: [
          ['idle',   
            Widget.Button({
              on_primary_click: () => { 
                state.setValue('working'); 
                dev.setConnection(!dev.connected); 
                timeout(5000, () => { if(state.value === 'working') state.setValue('idle') });
              },
              tooltip_text: dev.connected ? 'Disconnect' : 'Connect',
              child: Widget.Label(dev.connected ? '' : ''),
              binds: [['sensitive', state, 'value', s => s === 'idle'],]
            })], 
          ['working', 
            Widget.Box({ 
              class_name: 'false-button',
              child: Widget.Spinner({ 
                setup: self => { self.start() },
              }), 
            })]
        ],
        binds: [['shown', state], ],
      }),
      HSeparator(),
      Widget.Label({ xalign: 0, hexpand: true, label: dev.name }),
      HSeparator(),
      Widget.Icon({ icon: dev.icon_name, size: 16 }),
    ],
  });
}

export const BluetoothDevices = () => Widget.Box({
  class_name: 'bluetooth-devices',
  vertical: true,
  connections: [
    [Bluetooth, self => {
      let children = Bluetooth.devices.flatMap(dev => [BluetoothDevice(dev), VSeparator()]);
      children.push(
        Widget.Button({
          on_clicked: () => {
            execAsync(`hyprctl dispatch exec ${BLUETOOTH_CONTROL_APP}`);
          },
          child: Widget.Icon({ icon: 'preferences-system-symbolic' }),
        })
      );
      self.children = children;
    }, 'notify::connected-devices']
  ]
});
