import Applications from "resource:///com/github/Aylur/ags/service/applications.js";
import Variable from "resource:///com/github/Aylur/ags/variable.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js"
import App from "resource:///com/github/Aylur/ags/app.js";

import { registerWindow } from "./windows.js";
import { BoxedRevealer, HSeparator, VSeparator } from "./components.js";
import { execAsync } from "resource:///com/github/Aylur/ags/utils.js";
import Gdk from "gi://Gdk";

const INPUT_WIDTH = 200;
const EXPANDED_WIDTH = INPUT_WIDTH + 20;
const ENTRY_WIDTH = EXPANDED_WIDTH + 15;

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
						.then(res => parseInt(res))
            .then(res => isNaN(res) ? output.setValue(NO_OUTPUT) : output.setValue(`${res}`))
            .catch(err => { output.setValue(NO_OUTPUT); console.log(err); });
        },
				binds: [['label', output]]
      },
      onClick: self => execAsync(['wl-copy', output.value])
    })
	];
}

const BashEntryProvider = ({ query }) => query.trim() === '' ? [] : [
	Entry({ 
		icon: 'utilities-terminal-symbolic', 
		labelProps: { label: `Execute ${query}` }, 
		onClick: () => execAsync(`hyprctl dispatch exec -- ${query}`),
		keyCombo: [Gdk.KEY_Control_L, Gdk.KEY_Return]
	})
]

const AppEntryProvider = ({ query }) => {
	const applications = Applications.query(query)
		.sort((a, b) => a.frequency - b.frequency)
		.reverse()
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
	BashEntryProvider,
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
		App.toggleWindow('launcher');
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
		} else if(matches([Gdk.KEY_Return]) || matches([Gdk.KEY_Tab])) {
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
			on_primary_click: () => activateEntry(entry),
			child: Widget.Overlay({
				child: Widget.Box({
					width_request: ENTRY_WIDTH, 
					height_request: 26,
					child: Widget.Revealer({
						transition: 'crossfade',
						child: Widget.Box({
							hexpand: true,
							css: 'background: #303030; border-radius: 20px',
						}),
						binds: [['reveal-child', currSelection, 'value', s => s === i]],
					})
				}),
				overlays: [
					Widget.Box({
						// hexpand: true,
						vpack: 'center',
						css: 'padding: 2px 10px',
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
		css: 'background: #000; border-radius: 0px 0px 10px 10px; padding: 10px',
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

const SearchBox = ({ currQuery }) => {
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

const LauncherWindow = ({ windowVisible }) => {
	const currQuery = Variable('');
	const currKeyCombo = Variable([]);
  return Widget.Window({
    anchor: ['top'],
    layer: 'top',
    name: 'launcher',
    exclusivity: 'ignore',
    visible: windowVisible ,
    focusable: true,
    popup: true,
    child: Widget.Box({
      vertical: true,
      children: [
        SearchBox({ currQuery }),
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
		on_primary_click: () => App.toggleWindow(launcherWindow.name || ''),
		child: Widget.Box({
			class_name: 'groupoid',
	    children: [
				Widget.Icon('system-search-symbolic'),
				BoxedRevealer({
					reveal: visible,
					revealerChild: Widget.Box({
						width_request: EXPANDED_WIDTH
					}),
					revealerProps: {
						transition: 'slide_left',
						transition_duration: 200,
					}
				})
			]
	  }),
	});
}

