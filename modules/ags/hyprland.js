import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import Hyprland from 'resource:///com/github/Aylur/ags/service/hyprland.js';
import Variable from 'resource:///com/github/Aylur/ags/variable.js';
import { exec, execAsync} from 'resource:///com/github/Aylur/ags/utils.js';
import App from 'resource:///com/github/Aylur/ags/app.js';

import { HSeparator } from './components.js';
import { TooltipWindow } from './windows.js';

export const WindowTitle = () => Widget.Label({
  connections: [
    [Hyprland.active.client, self => self.label = Hyprland.active.client.title]
  ]
});

export const MiniWorkspaces = (monitor) => {
  const workspaceIndicators = () => {
    const workspaces = [...Hyprland.workspaces];
    workspaces.sort((ws1, ws2) => ws1.id - ws2.id);
    return workspaces
        .map((workspace, i) => {
          return Widget.Box({
            children: [
              WorkspaceIndicator({
                previewPosition: { x: Math.max(0, i * 30 - 15), y: -5 },
                workspace,
                monitor
              }),
              HSeparator(),
            ]
          });
        });
  };
  return Widget.Box({
    connections: [
      [Hyprland, self => self.children = workspaceIndicators(), 'workspace-added'],
      [Hyprland, self => self.children = workspaceIndicators(), 'workspace-removed']
    ]
  })
};

const WorkspaceIndicator = ({ previewPosition, workspace, monitor }) => {
  const primaryIcon = Variable('');
  const isActive = Variable(false);
  const isHovered = Variable(false);
  const showBorders = Variable(false);
  const windowName = `workspace-${workspace.id}-preview-${monitor}`;
  // Try to remove it in case it was created before.
  App.removeWindow(windowName);
  const previewWindow = WorkspacePreviewWindow({ 
    windowName,
    workspaceId: workspace.id, 
    width: 90,
    monitor, 
    position: Variable(previewPosition), 
    revealPopup: isHovered,
  });
  App.addWindow(previewWindow);
  // App.addWindow(previewWindow);
  const getPrimaryClientName = () => {
    const relevantClients = Hyprland.clients.filter(/** @param {any} app */ (app) => app.workspace.id === workspace.id);
    const maxClient = relevantClients[0];
    return maxClient?.initialClass || '';
  }
  const setVariables = () => {
    isActive.setValue(Hyprland.active.workspace.id == workspace.id);
    primaryIcon.setValue(getPrimaryClientName());
  };
  const on_hover = () => {
    isHovered.setValue(!isActive.value);
    showBorders.setValue(true);
  };
  return Widget.EventBox({
    on_hover,
    on_hover_lost: () => {
      isHovered.setValue(false);
      showBorders.setValue(false);
      setVariables();
    },
    on_primary_click: () => execAsync(`hyprctl dispatch workspace ${workspace.id}`),
    child: Widget.Overlay({
			pass_through: true,
      vpack: "center",
      child: Widget.Icon({
        class_name: 'workspace-icon',
        size: 14,
        binds: [
          ['icon', primaryIcon]
        ]
      }),
      overlays: [
        Widget.EventBox({
          child: Widget.Label({
            hpack: "start",
            vpack: "end",
            css: `font-size: 10px`,
            label: ` ${workspace.name}`,
          }),
        }),
        Widget.Revealer({
          transition: "crossfade",
          transition_duration: 500,
          child: Widget.EventBox({
            css: 'border: 1px solid #cd5d6c; border-radius: 5px;',
            on_hover,
          }),
          binds: [['reveal-child', showBorders]],
        }),
      ],
      connections: [
        [Hyprland, () => setVariables(), 'workspace-added'],
        [Hyprland, () => setVariables(), 'workspace-removed'],
        [Hyprland.active.workspace, () => setVariables()],
        [Hyprland.active.client, () => setVariables()],
        [isActive, () => showBorders.setValue(isActive.value || isHovered.value)],
        [isHovered, () => showBorders.setValue(isActive.value || isHovered.value)],
      ]
    })
  }) 
}

const WorkspacePreview = ({ workspaceId, width }) => {
  const windowPreviews = () => {
    /** @type {any} */
    const workspace = Hyprland.workspaces.find(ws => ws.id === workspaceId);
    if(workspace === undefined) {
      return null;
    }
    // There is a bug that causes Hyprland.clients to not update when the sizes/positions change.
    const all_clients = JSON.parse(exec('hyprctl clients -j'));
    // const all_clients = Hyprland.clients;
    /** @type {any} */
    const relevantMonitor = Hyprland.monitors.find(monitor => monitor.id === workspace.monitorID);
    // Compute the height of the whole preview workspace.
    const height = Math.round((width * relevantMonitor.height) / relevantMonitor.width );
    const relevantClients = all_clients.filter(/** @param {any} app */ (app) => app.workspace.id === workspace.id);
    return relevantClients.map(/** @param {any} client */ (client) => {
      const x = Math.round((client.at[0] / relevantMonitor.width) * width);
      const y = Math.round((client.at[1] / relevantMonitor.height) * height);
      const w = Math.round((client.size[0] / relevantMonitor.width) * width);
      const h = Math.round((client.size[1] / relevantMonitor.height) * height);
      return {x, y, w, h, icon: client.initialClass}
    });
  };
  return Widget.Fixed({
    connections: [
      [5000, self => {
        self.foreach(w => {
          self.remove(w);
        });
        const previews = windowPreviews();
        if(previews === null) {
          return;
        }
        previews.forEach(({x, y, w, h, icon}) => {
          self.put(Widget.Icon({ 
            width_request: w, 
            height_request: h, 
            icon, 
            css: 'border: 1px solid #276095; border-radius: 3px' 
          }), x, y);
        });
        self.show_all();
      }]
    ]
  })
};

const WorkspacePreviewWindow = ({ workspaceId, windowName, width, monitor, position, revealPopup }) => TooltipWindow({
  windowProps: {
    anchor: ['top', 'left'],
    name: windowName,
    class_name: 'workspace-preview',
    monitor,
  },
  revealPopup,
  position,
  content: WorkspacePreview({ workspaceId, width }),
});
