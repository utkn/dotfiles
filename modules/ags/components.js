import Widget from "resource:///com/github/Aylur/ags/widget.js";
import { primaryWindowName } from "./globals.js";

export const Icon = ({ icon, ... props }) => {
  if(icon === 'microphone-sensitivity-muted-symbolic') {
    return Widget.Icon({ icon, css: 'opacity: 0.3', ...props })
  } else if(icon === 'bluetooth-disabled-symbolic') {
    return Widget.Icon({ icon, css: 'opacity: 0.3', ...props })
  } else if(icon === 'bluetooth-connected-symbolic') {
    return Widget.Overlay({
      child: Widget.Icon({ icon: 'bluetooth-active-symbolic', css: 'opacity: 0.5' }),
      overlays: [
        Widget.Icon({ icon: 'content-loading-symbolic', size: 10 })
      ]
    });
  } else {
    return Widget.Icon({ icon, ...props})
  }
};

// Should be placed on every monitor.
export const PrimaryWindow = (/** @type {number} */ monitor) => Widget.Window({
  name: primaryWindowName(monitor),
  monitor,
  layer: 'background',
  visible: false,
  focusable: false,
  anchor: ['top', 'left', 'right', 'bottom'],
});

export const DynamicIcon = (
  /** @type {{
    listeners: any[], 
    getIcon: () => string,
    getTransition: (arg0: string) => "crossfade" | "slide_left" | "slide_right",
    icons: string[],
  }} */ 
  { listeners, getIcon, getTransition, icons  }) => {
  /** @type { (arg0: import("./types/widgets/stack.js").default) => void } */ 
  const updateSelf = (self) => {
    const shown = getIcon();
    self.shown = shown;
    self.transition = getTransition(shown);
  };
  return Widget.Stack({
    class_name: 'dynamic-icon',
    items: icons.map(icon => {
      return [icon, Icon({ icon, size: 14 })]
    }),
    connections: listeners.map(listener => [listener, self => updateSelf(self)]),
  });
};

export const HSeparator = () => Widget.Box({
  css: 'min-width: 5px',
});

export const VSeparator = () => Widget.Box({
  css: 'min-height: 5px',
});

export const BoxedRevealer = ({ reveal, revealerChild, revealerProps, ... props }) => {
  return Widget.Box({
    ...props,
    class_name: (props.class_name || '') + ' boxed-revealer-box',
    children: [
      Widget.Revealer({
        ...revealerProps,
        class_name: 'boxed-revealer',
        child: revealerChild,
        binds: [['reveal-child', reveal]]
      })
    ]
  });
};

export const NiceEventBox = ({ child, ... props}) => Widget.EventBox({
  ...props,
  child: Widget.EventBox({
    child
  })
});
