import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import SystemTray from 'resource:///com/github/Aylur/ags/service/systemtray.js';
import Variable from 'resource:///com/github/Aylur/ags/variable.js';

import { DynamicIcon, HSeparator } from './components.js';

export const Tray = () => Widget.Box({
  vpack: 'center',
  class_name: 'groupoid',
  binds: [
    ['children', SystemTray, 'items', items => 
      items.map((/** @type {import('types/service/systemtray').TrayItem} */ item) =>
       [Widget.EventBox({
          child: Widget.Icon({
            binds: [['icon', item, 'icon']],
            size: 16,
          }),
          on_primary_click: (_, evt) => item.activate(evt),
          on_secondary_click: (_, evt) => item.openMenu(evt),
          binds: [['tooltip-markup', item, 'tooltip-markup']]
        })]).reduce((a, b) => a.concat(HSeparator(), b))
    ]
  ]
});

export const TrayRevealer = () => {
  const revealTray = Variable(false);
  const shouldReveal = () => {
    return revealTray.value;
  };
  return Widget.EventBox({ 
    child: Widget.EventBox({ 
      child: Widget.Box({
        vpack: 'center',
        children: [
          Widget.Revealer({
            transition: 'slide_left',
            transition_duration: 300,
            child: Tray(),
            connections: [
              [SystemTray, self => self.reveal_child = shouldReveal() ],
              [revealTray, self => self.reveal_child = shouldReveal() ],
            ],
          }),
          Widget.EventBox({
            on_primary_click: () => revealTray.setValue(!revealTray.value),
            child: DynamicIcon({
              listeners: [revealTray],
              getIcon: () => shouldReveal() ? 'go-next-symbolic' : 'view-more-symbolic',
              getTransition: () => shouldReveal() ? 'slide_right' : 'slide_left',
              icons: [
                'view-more-symbolic',
                'go-next-symbolic'
              ],
            })
          })
        ]
      }) 
    }) 
  });
}

