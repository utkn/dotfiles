import Service from 'resource:///com/github/Aylur/ags/service.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';

class Brightness extends Service {
    static {
        Service.register(
            this,
            {
                'changed': ['float'],
            },
            {
                'value': ['float', 'rw'],
            },
        );
    }

    #interface = Utils.exec("sh -c 'ls -w1 /sys/class/backlight | head -1'");

    #screenValue = 0;
    #max = Number(Utils.exec('brightnessctl max'));

    // the getter has to be in snake_case
    get screen_value() {
        return this.#screenValue;
    }

    // the setter has to be in snake_case too
    set screen_value(percent) {
        if (percent < 0)
            percent = 0;

        if (percent > 1)
            percent = 1;

        Utils.execAsync(`brightnessctl set ${percent * 100}% -q`)
        // the file monitor will handle the rest
    }

    constructor() {
        super();

        // setup monitor
        const brightness = `/sys/class/backlight/${this.#interface}/brightness`;
        Utils.monitorFile(brightness, () => this.#onChange());

        // initialize
        this.#onChange();
    }

    #onChange() {
        this.#screenValue = Number(Utils.exec('brightnessctl get')) / this.#max;

        // signals have to be explicity emitted
        this.emit('changed'); // emits "changed"
        this.notify('screen-value'); // emits "notify::screen-value"

        // or use Service.changed(propName: string) which does the above two
        // this.changed('screen-value');

        // emit screen-changed with the percent as a parameter
        this.emit('screen-changed', this.#screenValue);
    }

    // overwriting the connect method, let's you
    // change the default event that widgets connect to
    connect(event = 'screen-changed', callback) {
        return super.connect(event, callback);
    }
}

// export to use in other modules
export default Brightness;

