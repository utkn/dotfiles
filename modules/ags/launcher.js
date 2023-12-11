import Applications from "resource:///com/github/Aylur/ags/service/applications.js";
import Variable from "resource:///com/github/Aylur/ags/variable.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js"
import App from "resource:///com/github/Aylur/ags/app.js";

import { registerWindow } from "./windows.js";
import { BoxedRevealer, HSeparator, VSeparator } from "./components.js";
import { exec, execAsync } from "resource:///com/github/Aylur/ags/utils.js";

const SEARCH_BOX_WIDTH = 200;
const ENTRY_WIDTH = 220;

const Entry = ({icon, labelWidget, onClick }) => {return { icon, labelWidget, onClick }};

const CalculatorEntryProvider = ({ query }) => {
	const output = Variable('');
  return [
    Entry({
      icon: 'accessories-calculator-symbolic',
      labelWidget: Widget.Label({
        setup: () => {
          return execAsync(['awk', `BEGIN{print ${query}}`])
            .then(res => output.setValue(res))
            .catch(err => { output.setValue('...'); console.log(err); });
        },
			binds: [['label', output]]
      }),
      onClick: self => execAsync(['wl-copy', output.value])
    })
	];
}

const BashEntryProvider = ({ query }) => [
	Entry({ 
		icon: 'utilities-terminal-symbolic', 
		labelWidget: Widget.Label(`Execute ${query}`), 
		onClick: () => execAsync(`hyprctl dispatch exec -- ${query}`)
	})
]

const AppEntryProvider = ({ query }) => Applications.query(query)
	.slice(0, 5)
	.map(app => Entry({
		icon: app.icon_name,
		labelWidget: Widget.Label(app.name), 
		onClick: () => app.launch() 
	})
)

const PROVIDERS = [
	BashEntryProvider,
	CalculatorEntryProvider,
	AppEntryProvider,
]

const EntryLister = ({ query }) => Widget.Box({
	css: 'background: #000; border-radius: 0px 0px 10px 10px; padding: 10px',
	vertical: true,
	connections: [
		[query, self => self.children = PROVIDERS
			.map(provider => provider({ query: query.value }))
			.flatMap(entries => entries)
			.flatMap(
				entry => [
					Widget.EventBox({
						on_primary_click: () => { 
							entry.onClick();
							App.toggleWindow('launcher');
						},
						child: Widget.Overlay({
							child: Widget.Box({ 
								width_request: ENTRY_WIDTH + 15, 
								height_request: 20 
							}),
							overlays: [
								Widget.Box({
									// hexpand: true,
									children: [
										Widget.Icon({
											hpack: 'start',
											size: 16,
											icon: entry.icon || ''
										}),
										HSeparator(),
										entry.labelWidget,
									]
								})
							]
						})
					}),
					VSeparator(),
				])
			]
		]
});

const SearchBox = ({ currQuery }) => {
	return Widget.Box({
		width_request: SEARCH_BOX_WIDTH,
		hpack: 'center',
		vertical: true,
		css: 'background: transparent;',
		children: [
			Widget.Entry({
				xalign: 0,
				placeholder_text: 'Search',
				on_change: ({ text }) => currQuery.setValue(text || ''),
				on_accept: () => console.log('accept'),
			}),
		],
	})
}

const LauncherWindow = ({ expand }) => {
	const currQuery = Variable('');
  return Widget.Window({
    anchor: ['top'],
    layer: 'top',
    name: 'launcher',
    exclusivity: 'ignore',
    visible: expand,
    focusable: true,
    popup: true,
    child: Widget.Box({
      vertical: true,
      children: [
        SearchBox({ currQuery }),
				VSeparator(),
        EntryLister({ query: currQuery })
      ],
    }),
    connections: [
      ['notify::visible', self => { expand.setValue(self.visible); } ],
    ]
  });
};

export const MiniLauncher = () => {
 	const expand = Variable(false);
	const launcherWindow = LauncherWindow({ expand });
	registerWindow(launcherWindow);
  return Widget.EventBox({
		on_primary_click: () => App.toggleWindow(launcherWindow.name || ''),
		child: Widget.Box({
			class_name: 'groupoid',
	    children: [
				Widget.Icon('system-search-symbolic'),
				BoxedRevealer({
					reveal: expand,
					revealerChild: Widget.Box({
						width_request: ENTRY_WIDTH
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

