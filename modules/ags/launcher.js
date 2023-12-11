import Applications from "resource:///com/github/Aylur/ags/service/applications.js";
import Variable from "resource:///com/github/Aylur/ags/variable.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js"
import App from "resource:///com/github/Aylur/ags/app.js";

import { registerWindow } from "./windows.js";
import { HSeparator, VSeparator } from "./components.js";
import { execAsync, timeout } from "resource:///com/github/Aylur/ags/utils.js";
import Gdk from "gi://Gdk";

const INPUT_WIDTH = 200;
const EXPANDED_WIDTH = INPUT_WIDTH + 20;
const ENTRY_WIDTH = EXPANDED_WIDTH + 30;
const LAUNCHER_WINDOW_NAME = 'launcher';
const ACTIVATE_COMBO = [Gdk.KEY_Return];

const Entry = ({icon, labelProps, onClick, keyCombo = [] }) => { return { icon, labelProps, onClick, keyCombo } };

const CalculatorEntryProvider = ({ query }) => {
	const NO_OUTPUT = 'Not a mathematical expression';
	const output = Variable('');
  return query.trim() === '' ? [] : [
    Entry({
      icon: 'accessories-calculator-symbolic',
      labelProps: {
        setup: self => {
					output.setValue('...');
          return execAsync(['awk', `BEGIN{print ${query}}`])
						.then(res => parseFloat(res))
            .then(res => isNaN(res) ? output.setValue(NO_OUTPUT) : output.setValue(`${res}`))
            .catch(err => { output.setValue(NO_OUTPUT); console.log(err); });
        },
				binds: [['label', output]]
      },
      onClick: self => execAsync(['wl-copy', output.value])
    })
	];
}

const ExecEntryProvider = ({ query }) => query.trim() === '' ? [] : [
	Entry({ 
		icon: 'utilities-terminal-symbolic', 
		labelProps: { label: `Execute ${query}` }, 
		onClick: () => execAsync(`hyprctl dispatch exec -- ${query}`),
		keyCombo: [Gdk.KEY_Control_L, Gdk.KEY_Return]
	})
]

const AppEntryProvider = ({ query }) => {
	const applications = Applications.query(query)
		.sort((a, b) => b.frequency - a.frequency)
		.slice(0, 5);
	return [...applications.entries()].map(([i, app]) => Entry({
			icon: app.icon_name,
			labelProps: { label: app.name || '' }, 
			onClick: () => app.launch(),
			keyCombo: (i == 0) ? [Gdk.KEY_Control_L, Gdk.KEY_1]
							: (i == 1) ? [Gdk.KEY_Control_L, Gdk.KEY_2]
							: (i == 2) ? [Gdk.KEY_Control_L, Gdk.KEY_3]
							: []
		})
	)
}

const PROVIDERS = [
	AppEntryProvider,
	ExecEntryProvider,
	CalculatorEntryProvider,
]

const key_name = (keyval) => {
	const gdk_name = Gdk.keyval_name(keyval);
	if(gdk_name === 'Return') {
		return '↩';
	} else if(gdk_name == 'Control_L') {
		return 'LCtrl';
	} else if(gdk_name == 'Control_R') {
		return 'RCtrl';
	}
	return gdk_name;
}

const EntryLister = ({ currQuery, currKeyCombo }) => {
	const currSelection = Variable(0);
	const entries = Variable([]);
	const activateEntry = (entry) => {
		entry.onClick();
		App.toggleWindow(LAUNCHER_WINDOW_NAME);
	};
	const handleKeyCombo = (keyCombo) => {
		if(keyCombo.length === 0) {
			return;
		}
		const matches = (other) => other.toString() === keyCombo.toString();
		const numEntries = entries.value.length;
		if(matches([Gdk.KEY_Down])) {
			currSelection.setValue((currSelection.value + 1) % numEntries)
		} else if(matches([Gdk.KEY_Up])) {
			currSelection.setValue((currSelection.value === 0) ? (numEntries-1) : currSelection.value - 1);
		} else if(matches(ACTIVATE_COMBO)) {
			const selectedEntry = entries.value.at(currSelection.value);
			if(selectedEntry !== undefined) {
				activateEntry(selectedEntry)
			}
		} else {
			const matchingEntry = entries.value.find(entry => matches(entry.keyCombo));
			if(matchingEntry !== undefined) {
				activateEntry(matchingEntry);
			}
		}
	}
	const collectEntries = () => PROVIDERS
		.map(provider => provider({ query: currQuery.value }))
		.flatMap(entries => entries);
	const createWidgets = (entries) => [...entries.entries()].flatMap(([i, entry]) => [
		Widget.EventBox({
			on_hover: () => currSelection.setValue(i),
			on_primary_click: () => activateEntry(entry),
			child: Widget.Overlay({
				child: Widget.Box({
					width_request: ENTRY_WIDTH, 
					height_request: 26,
					child: Widget.Revealer({
						transition: 'crossfade',
						child: Widget.Box({
							hexpand: true,
							class_name: 'groupoid',
						}),
						binds: [['reveal-child', currSelection, 'value', s => s === i]],
					})
				}),
				overlays: [
					Widget.Box({
						// hexpand: true,
						vpack: 'center',
						css: 'padding: 2px 5px',
						children: [
							Widget.Icon({
								vpack: 'center',
								hpack: 'start',
								size: 16,
								icon: entry.icon || ''
							}),
							HSeparator(),
							Widget.Label({
								vpack: 'center',
								...entry.labelProps,
							}),
						]
					}),
					Widget.Box({
						hpack: 'end',
						css: 'color: #8c8c8c; padding-right: 8px',
						child: Widget.Label({
							label: entry.keyCombo.map(keyval => key_name(keyval)).join(' + ')
						})
					}),
				]
			})
		}),
		VSeparator(),
	])	
	return Widget.Box({
		class_name: 'launcher-list',
		// css: 'background: #000; border-radius: 0px 0px 10px 10px; padding: 10px 5px',
		vertical: true,
		binds: [
			['children', entries, 'value', s => createWidgets(s)]
		],
		connections: [
			[currQuery, () => entries.setValue(collectEntries())],
			[currKeyCombo, () => handleKeyCombo(currKeyCombo.value)],
		],
	});
}

const SearchBox = ({ currQuery, currKeyCombo }) => {
	return Widget.Box({
		width_request: INPUT_WIDTH,
		hpack: 'center',
		vertical: true,
		css: 'background: transparent;',
		children: [
			Widget.Entry({
				xalign: 0,
				placeholder_text: 'Search',
				on_change: ({ text }) => currQuery.setValue(text || ''),
			}),
		],
	})
}

const LauncherHidden = () => {
	const topApplicationIcons = (limit) => 
		Applications.list.sort((a1, a2) => a2.frequency - a1.frequency)
			.slice(0, limit)
			.map(app => app.icon_name);
		return Widget.Box({
			connections: [
				[Applications, self => self.children = topApplicationIcons(3)
						.map(icon => [
							Widget.Icon({ icon: icon || '', size: 16 }),
					]).reduce((a, b) => a.concat(HSeparator(), b))
				]
			]
		})
}


const LauncherExpanded = ({ visible }) => {
	return Widget.Box({
		children: [
			Widget.Icon({ icon: 'system-search-symbolic', size: 16 }),
			Widget.Revealer({
				transition: 'slide_left',
				child: Widget.Box({
					width_request: EXPANDED_WIDTH
				}),
				connections: [
					[visible, self => visible.value ? timeout(0, () => self.reveal_child = visible.value) : self.reveal_child = false]
				]
			})
		]
	})
};

const LauncherWindow = ({ windowVisible }) => {
	const currQuery = Variable('');
	const currKeyCombo = Variable([]);
  return Widget.Window({
    anchor: ['top'],
    layer: 'top',
    name: LAUNCHER_WINDOW_NAME,
    exclusivity: 'ignore',
    visible: windowVisible ,
    focusable: true,
    popup: true,
    child: Widget.Box({
			class_name: 'launcher-window-frame',
      vertical: true,
      children: [
        SearchBox({ currQuery, currKeyCombo }),
				VSeparator(),
        EntryLister({ currQuery, currKeyCombo })
      ],
    }),
    connections: [
      ['notify::visible', self => { 
				windowVisible .setValue(self.visible); 
				currKeyCombo.setValue([]);
			}],
      ['key-press-event', (_, /** @type{Gdk.Event} */ event) => {
					const keyval = event.get_keyval()[1];
					currKeyCombo.setValue(currKeyCombo.getValue().concat([keyval]));
				}
			],
			['key-release-event', () => currKeyCombo.setValue([])],
    ]
  });
};

export const MiniLauncher = () => {
 	const visible = Variable(false);
	const launcherWindow = LauncherWindow({ windowVisible: visible });
	registerWindow(launcherWindow);
	return Widget.EventBox({
		on_primary_click: () => App.toggleWindow(launcherWindow.name),
		child: Widget.Box({
			vpack: 'center',
			class_name: 'groupoid',
			children: [
				Widget.Stack({
					transition: 'crossfade',
					transition_duration: 100,
					items: [
						['expanded', LauncherExpanded({ visible })],
						['hidden', LauncherHidden()],
					],
					connections: [
						[visible, self => visible.value ? self.shown = 'expanded' : timeout(0, () => self.shown = 'hidden')]
					]
				}),
			]
		})
	})
};
