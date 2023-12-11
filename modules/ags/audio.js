import Audio from 'resource:///com/github/Aylur/ags/service/audio.js';
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import Variable from 'resource:///com/github/Aylur/ags/variable.js';
import { execAsync, timeout } from 'resource:///com/github/Aylur/ags/utils.js';
import App from 'resource:///com/github/Aylur/ags/app.js';

import { DynamicIcon, HSeparator, BoxedRevealer, VSeparator } from './components.js';
import { PopupWindow, registerWindow } from './windows.js';

const AUDIO_CONTROL_APP = 'pavucontrol';
const TRANSITION_DURATION = 300;

/** @type {[number, string][]} */ 
const AUDIO_VOLUME_ICON_MAP = [
  [0, 'audio-volume-muted-symbolic'],
  [1, 'audio-volume-low-symbolic'],
  [34, 'audio-volume-medium-symbolic'],
  [67, 'audio-volume-high-symbolic'],
  [101, 'audio-volume-overamplified-symbolic'],
];

/** @type {[number, string][]} */ 
const MIC_SENSITIVITY_ICON_MAP = [
  [0, 'microphone-sensitivity-muted-symbolic'],
  [1, 'microphone-sensitivity-low-symbolic'],
  [34, 'microphone-sensitivity-medium-symbolic'],
  [67, 'microphone-sensitivity-high-symbolic'],
];


const IconVolumeControl = ({ stream, iconMap, scrollSensitivity = 0.05, indicateHeadphones = false }) => {
  const withHeadphones = Variable(false);
  const iconMapReversed = [...iconMap];
  iconMapReversed.reverse();
  const control = Widget.EventBox({
    on_scroll_up: () => {
      const streamRef = stream();
      if(!streamRef) return;
      streamRef.volume += scrollSensitivity;
    },
    on_scroll_down: () => {
      const streamRef = stream();
      if(!streamRef) return;
      streamRef.volume -= scrollSensitivity;
    },
    on_primary_click: () => {
      const streamRef = stream();
      if(!streamRef) return;
      streamRef.stream.change_is_muted(!streamRef.stream.isMuted);
    },
    connections: [
      [Audio, self => {
        const streamRef = stream();
        if(!streamRef) return;
        const streamVol = Math.round(streamRef.volume * 100);
        const streamName = streamRef.description || 'Unknown';
        self.tooltip_text = `${streamName}: ${streamVol}%` + (streamRef.stream.is_muted ? ' (Muted)' : '');
      }],
      [Audio, () => 
        withHeadphones.setValue((indicateHeadphones && Audio.speaker?.icon_name?.includes('headphones')) || false) 
      ],
    ],
    child: Widget.Overlay({
      child: DynamicIcon({
        listeners: [Audio],
        getIcon: () => {
            const streamRef = stream();
            if (!streamRef) return iconMapReversed[0][1];
            const curr = streamRef.stream.is_muted ? 0 : streamRef.volume * 100;
            return iconMapReversed.find(([threshold, _]) => threshold <= curr)?.[1] || iconMapReversed[0][1];
        },
        getTransition: () => 'crossfade',
        icons: iconMapReversed.map(([_, iconName]) => iconName),
      }),
      overlays: [
        Widget.Revealer({
          transition: 'crossfade',
          // child: Widget.Icon({ icon: 'action-unavailable-symbolic', size: 14 }),
          child: Widget.Label({ vpack: 'end', hpack: 'start', label: '', css: 'margin-bottom: 3px; font-size: 8px; padding: 1px; background: #000; border-radius: 5px;' }),
          binds: [
            ['reveal-child', withHeadphones],
          ]
        }),
        Widget.Revealer({
          transition: 'crossfade',
          // child: Widget.Icon({ icon: 'action-unavailable-symbolic', size: 14 }),
          child: Widget.Label({ vpack: 'center', hpack: 'end', label: '', css: 'font-size: 9px; color: #cd5d6c' }),
          connections: [
            [Audio, self => self.reveal_child = stream()?.stream.is_muted ]
          ]
        }),
      ]
    }),
  });
  return control;
};

const VolumeSlider = ({ stream }) => Widget.Slider({
  hexpand: true,
  draw_value: false,
  min: 0,
  max: 1,
  on_change: ({ value }) => {
      const streamRef = stream();
      if (!streamRef) return;
      streamRef.volume = value;
  },
  connections: [
      [Audio, self => { self.value = stream()?.volume || 0; } ],
  ],
});

const FixedSliderVolumeControl = ({ stream, iconMap, iconOnLeft, scrollSensitivity = 0.05, indicateHeadphones = false }) => {
  const children = [
    Widget.Box({
      css: 'min-width: 100px',
      child: VolumeSlider({ stream }),
    }),
    HSeparator(),
    IconVolumeControl({ stream, iconMap, scrollSensitivity, indicateHeadphones })
  ];
  if(iconOnLeft) {
    children.reverse();
  }
  return Widget.Box({
    vertical: false,
    children,
  })
}

const RevealingSliderVolumeControl = ({ stream, iconMap, iconOnLeft, scrollSensitivity = 0.05, indicateHeadphones = false }) => {
  const hover = Variable(false);
  const reveal = Variable(false);
  const allowReveal = () => {
    const streamRef = stream(); 
    if(!streamRef) return false;
    return !streamRef.stream.is_muted; 
  };
  const children = [
    BoxedRevealer({
      revealerChild: Widget.Box({
        children: iconOnLeft ? [
          HSeparator(),
          VolumeSlider({ stream }),
        ] : [
          VolumeSlider({ stream }),
          HSeparator(),
        ]
      }),
      revealerProps: {
        transition_duration: TRANSITION_DURATION,
        transition: 'slide_left'
      },
      reveal,
    }),
    IconVolumeControl({ stream, iconMap, scrollSensitivity, indicateHeadphones })
  ];
  if(iconOnLeft) {
    children.reverse();
  }
  return Widget.EventBox({ 
    on_hover: () => {
      hover.setValue(true);
      reveal.setValue(allowReveal() && true);
    },
    on_hover_lost: () => {
      hover.setValue(false);
      reveal.setValue(false);
    },
    child: Widget.EventBox({ 
      child: Widget.Box({
        vertical: false,
        children,
      })
    }),
    connections: [
      [Audio, () => {
        const canReveal = allowReveal();
        if(canReveal && hover.value) {
          reveal.setValue(true);
        } else if(!canReveal && reveal.value) {
          reveal.setValue(false);
        }
      }]
    ]
  })
};

export const MiniAudioControl = (/** @type {number} */ monitor) => {
  const revealMicrophone = Variable(false);
  const revealMixer = Variable(false);
  const position = Variable({ x: 0, y: 0});
  const mixerWindow = PopupWindow({
    windowProps: {
      name: `volume-mixer-window-${monitor}`,
      anchor: ['top', 'left'],
      monitor,
    },
    revealPopup: revealMixer,
    content: VolumeMixer(),
    position,
  });
  registerWindow(mixerWindow);
  return Widget.Box({
    hpack: 'end',
    children: [
      Widget.EventBox({
        // Right click to open the mixer
        on_secondary_click: self => {
          const [_, x, y] = self.translate_coordinates(self.get_toplevel(), 0, 0);
          position.setValue({ x, y: 0 });
          revealMixer.setValue(true);
        },
        child: RevealingSliderVolumeControl({
          stream: () => Audio.speaker,
          iconMap: AUDIO_VOLUME_ICON_MAP,
          iconOnLeft: false,
          scrollSensitivity: 0.05,
          indicateHeadphones: true,
        })
      }),
      // Microphone icon that slides in
      BoxedRevealer({
        reveal: revealMicrophone,
        revealerChild: Widget.Box({
          children: [
            HSeparator(),
            IconVolumeControl({
              stream: () => Audio.microphone,
              iconMap: MIC_SENSITIVITY_ICON_MAP,
              scrollSensitivity: 0.1,
            })
          ]
        }),
        revealerProps: {
          transition_duration: TRANSITION_DURATION,
          transition: 'slide_left',
        }
      }),
    ],
    connections: [
      [Audio, () => revealMicrophone.setValue(Audio.microphone !== undefined) ],
    ],
  });
};

export const VolumeMixer = () => {
  const getChildren = () => {
    const speakerControls = Audio.speakers
      .filter(speaker => speaker.application_id == null)
      .filter(speaker => speaker === Audio.speaker) // only show the default speaker
      .flatMap(speaker => [
        Widget.Box({
          vertical: false,
          children: [
            FixedSliderVolumeControl({ 
              stream: () => speaker, 
              iconMap: AUDIO_VOLUME_ICON_MAP, 
              iconOnLeft: true, 
              scrollSensitivity: 0.05,
            }),
            HSeparator(),
            Widget.Icon({ 
              icon: speaker.icon_name?.startsWith('audio-card') ? 
                'audio-card-symbolic' : 'audio-headset-symbolic',
              css: 'min-width: 24px',
              size: 20,
              tooltip_text: speaker.description,
            })
          ]
        }),
        VSeparator(),
      ]);
    const appControls = Audio.apps.flatMap(app => [
      Widget.Box({
        vertical: false,
        children: [
          FixedSliderVolumeControl({ 
            stream: () => app, 
            iconMap: AUDIO_VOLUME_ICON_MAP, 
            iconOnLeft: true, 
            scrollSensitivity: 0.05,
          }),
          HSeparator(),
          Widget.Icon({ 
            icon: app.icon_name || undefined, 
            size: 24,
            tooltip_text: app.name,
          }),
        ]
      }),
      VSeparator(),
    ]);
    return [...speakerControls, ...appControls,  
      Widget.Button({
        on_clicked: () => {
          execAsync(`hyprctl dispatch exec ${AUDIO_CONTROL_APP}`);
        },
        child: Widget.Icon({ icon: 'preferences-system-symbolic' }),
      })
    ];
  };
  return Widget.Box({
    class_name: 'volume-mixer',
    css: 'min-width: 120px;',
    vertical: true,
    connections: [
      [Audio, self => { self.children = getChildren() }, 'stream-added'],
      [Audio, self => { self.children = getChildren() }, 'stream-removed']
    ]
  });
}
