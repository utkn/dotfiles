import App from 'resource:///com/github/Aylur/ags/app.js';
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import Variable from 'resource:///com/github/Aylur/ags/variable.js';
import { execAsync} from 'resource:///com/github/Aylur/ags/utils.js';

import { BoxedRevealer, HSeparator } from './components.js';
import { TERMINAL_NAME } from './globals.js';

const HEAT_SENSOR_NAME = 'nvme-pci-0200';
const TRANSITION_DURATION = 200;
const FORCE_GIGS = true;
const SYSTEM_MONITOR_APP = `${TERMINAL_NAME} -e btop`;
const POLL_TIME = 5000;

/** @type{[number, string][]} */
const USAGE_THRESHOLDS = [
    [90, 'critical'],
    [66, 'high'], 
    [33, 'medium'], 
    [0, 'low'], 
  ];

/** @type{[number, string][]} */
const HEAT_THRESHOLDS = [
    [80, 'critical'],
    [40, 'high'],
    [25, 'medium'],
    [0, 'low'],
  ];

const SysStat = ({ name = '', units = '', data = {} }) =>{
  const percentUsage = data['used'] || data['load'] || 0;
  const current = data['current'];
  const total = data['total'];
  let description = `${name}: ${percentUsage}%`;
  let shortDescription = `${percentUsage.toFixed(1)}%`;
  if (current && total) {
    let displayCurrent = current;
    let displayTotal = total;
    let displayUnits = units;
    if(FORCE_GIGS && units == 'M') {
      displayCurrent = (displayCurrent / 1000);
      displayTotal = (displayTotal / 1000);
      displayUnits = 'G';
    }
    description += ` (used ${displayCurrent}/${displayTotal}${displayUnits})`;
    // shortDescription += ` (${displayCurrent.toFixed(1)}/${displayTotal.toFixed(1)}${displayUnits})`;
  }
  const usageDescription = USAGE_THRESHOLDS
    .find(([threshold, _]) => threshold <= percentUsage)?.[1] || 'low';
  return {
    name,
    shortDescription,
    description,
    usageDescription,
    percentUsage,
    current,
    total,
    units,
  }
}

const MonitorGauge = ({ statProvider, showAlt, altText }) => {
  const gaugeView = Widget.CircularProgress({
    class_name: 'monitor-gauge',
    start_at: 0.75,
    binds: [
      ['value', statProvider, 'value', s => s.percentUsage / 100]
    ],
  });
  const altTextView = Widget.Overlay({
    child: Widget.Label({ label: '' }),
    overlays: [Widget.Label({ label: altText })]
  });
  return Widget.Stack({
    transition: 'crossfade',
    transition_duration: TRANSITION_DURATION,
    binds: [
      ['shown', showAlt, 'value', showAlt => showAlt ? 'alt' : 'gauge']
    ],
    items: [
      ['gauge', gaugeView],
      ['alt', altTextView],
    ]
  })
};

const RevealerMonitor = ({ reveal, revealerProps, statProvider, altText }) => Widget.Box({
  children: [
    MonitorGauge({ statProvider, showAlt: reveal, altText }),
    BoxedRevealer({
      revealerChild: Widget.Box({
        children: [
          HSeparator(),
          Widget.Label({
            connections: [
                [statProvider, self => self.label = statProvider.value.shortDescription],
            ],
          }),
          HSeparator(),
        ]
      }),
      revealerProps,
      reveal,
    }),
  ],
  binds: [
    ['tooltip-text', statProvider, 'value', s => s.description],
    ['class-name', statProvider, 'value', 
      s => `monitor-part monitor-${s.name.toLowerCase()} monitor-part-${s.usageDescription}`]
  ],
});

const TemperatureMonitor = ({ sensorName, pollTime = POLL_TIME }) => {
  const currTemp = Variable(0);
  const tempDescription = Variable('low');
  return Widget.Box({
    children: [
      HSeparator(),
      Widget.Label(""),
      HSeparator(),
      Widget.Label({
        label: "...",
        binds: [['label', currTemp, 'value', t => `${Math.round(t)}C`]]
      }),
    ],
    binds: [
      ['tooltip-text', currTemp, 'value', t => `${sensorName}: ${t}C`],
      ['class-name', tempDescription, 'value', 
        s => `monitor-part monitor-temperature monitor-part-${s}`]
    ],
    connections: [
      [currTemp, () => 
        tempDescription.setValue(HEAT_THRESHOLDS.find(([t, _]) => t <= currTemp.value)?.[1] || 'low')
      ],
      [pollTime, () => {
        execAsync(`bash ${App.configDir}/scripts/temperature.sh -- ${sensorName}`)
          .then(t => Number(t))
          .then(t => currTemp.setValue(t))
          .catch(e => console.log(e));
      }]
    ]
  });
}

export const MiniMonitor = ({ pollTime = POLL_TIME }) => {
  const diskInfo = Variable(SysStat({}));
  const cpuInfo = Variable(SysStat({}));
  const memInfo = Variable(SysStat({}));
  const reveal = Variable(false);
  const revealerProps = (/** @type {string} */ slideDir) => { 
    return {
      transition_duration: TRANSITION_DURATION,
      transition: `slide_${slideDir}`,
    }
  };
  const box = Widget.Box({
      children: [
        RevealerMonitor({ altText: ``, reveal, revealerProps: revealerProps('left'), statProvider: diskInfo }),
        HSeparator(),
        RevealerMonitor({ altText: ``, reveal, revealerProps: revealerProps('left'), statProvider: memInfo }),
        HSeparator(),
        RevealerMonitor({ altText: ``, reveal, revealerProps: revealerProps('left'), statProvider: cpuInfo }),
        BoxedRevealer({
          reveal,
          revealerChild: TemperatureMonitor({ sensorName: HEAT_SENSOR_NAME }),
          revealerProps: revealerProps('left'),
        })
      ],
      connections: [
          [pollTime, () => {
            execAsync(`${App.configDir}/scripts/stats.sh`)
              .then(res => JSON.parse(res))
              .then(res => {
                 diskInfo.setValue(SysStat({ name: 'Disk', units: 'G', data: res['disk'] }));
                 cpuInfo.setValue(SysStat({ name: 'CPU', data: res['cpu'] }));
                 memInfo.setValue(SysStat({ name: 'Memory', units: 'M', data: res['mem'] }));
              })
          }],
          [reveal, self => {
            if(reveal.value) {
              self.class_name = 'monitor groupoid';
            } else {
              self.class_name = 'monitor';
            }
          }]
      ]
  });
  return Widget.EventBox({
    vpack: 'center',
    // on_hover: () => {
    //   reveal.setValue(true);
    // },
    // on_hover_lost: () => {
    //   reveal.setValue(false);
    // },
    on_primary_click: () => {
      reveal.setValue(!reveal.value);
    },
		on_secondary_click: () => {
			execAsync(`hyprctl dispatch exec -- ${SYSTEM_MONITOR_APP}`)
				.catch(e => console.log(e))
		},
    child: Widget.EventBox({ child: box }),
  })
};
