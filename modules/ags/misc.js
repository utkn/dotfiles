import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import { execAsync} from 'resource:///com/github/Aylur/ags/utils.js';

export const DateTime = () => Widget.EventBox({
    vpack: 'center',
    child: Widget.Label({
        class_name: 'datetime',
        connections: [
            [1000, self => execAsync(['date', '+%a %d %b, %H:%M'])
                .then(date => self.label = date)
                .catch(console.error)]
        ],
    }),
});
