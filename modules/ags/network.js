import Network from "resource:///com/github/Aylur/ags/service/network.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js";

import { DynamicIcon } from "./components.js";

const WifiIcon = () => DynamicIcon({
  listeners: [Network],
  getIcon: () => Network.wifi.icon_name,
	getTransition: () => 'crossfade',
  icons: [
    'network-wireless-hotspot-symbolic',
    'network-wireless-acquiring-symbolic',
    'network-wireless-no-route-symbolic',
    'network-wireless-offline-symbolic',
    'network-wireless-signal-none-symbolic',
    'network-wireless-signal-weak-symbolic',
    'network-wireless-signal-ok-symbolic',
    'network-wireless-signal-good-symbolic',
    'network-wireless-signal-excellent-symbolic',
  ],
});

const EthernetIcon = () => DynamicIcon({
  listeners: [Network],
  getIcon: () => Network.wired.icon_name,
	getTransition: () => 'crossfade',
  icons: [
    'network-wired-symbolic',
    'network-wired-acquiring-symbolic',
    'network-wired-no-route-symbolic',
    'network-wired-disconnected-symbolic',
    'network-wired-offline-symbolic',
  ],
});

const getPrimaryNetworkIcon = () => {
  if(Network.primary === 'wifi') {
    return WifiIcon();
  } else {
    return EthernetIcon();
  }
}

const getPrimaryNetworkTooltip = () => {
  if(Network.primary === 'wifi') {
    return `${Network.wifi.ssid} (${Network.wifi.internet})`;
  } else {
    return `Wired (${Network.wired.internet})`;
  }
}

export const MiniNetworkControl = () => Widget.EventBox({
  vpack: 'center',
  // on_primary_click: () => Network.toggleWifi(),
  connections: [
    [Network, self => self.tooltip_text = getPrimaryNetworkTooltip()],
    [Network, self => self.child = getPrimaryNetworkIcon()]
  ]
});
