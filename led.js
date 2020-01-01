//@format

const {Gpio} = require('onoff');
const {LED_GPIO, STATUS_READY, STATUS_WAITING, STATUS_WORKING, STATUS_ERROR, STATUS_OFF} = require('./constants');

const led = new Gpio(LED_GPIO, 'out');

const setLed = state => {
    if (state === undefined) {
        return led.read().then(v => led.write(v ^ 1));
    } else if (state) {
        return led.write(1);
    } else {
        return led.write(0);
    }
};

let interval = null;
const setStatus = state => {
    clearInterval(interval);
    return setLed(false).then(v => {
        switch (state) {
            case STATUS_READY:
                return setLed(true).then(v => true);
                break;
            case STATUS_WAITING:
                interval = setInterval(setLed, TIMER_WAITING);
                break;
            case STATUS_WORKING:
                interval = setInterval(setLed, TIMER_WORKING);
                break;
            case STATUS_ERROR:
                interval = setInterval(setLed, TIMER_ERROR);
                break;
            case STATUS_OFF:
            default:
            // do nothing
        }
        return Promise.resolve(true);
    });
};

module.exports = () => {
    return {
        setStatus,
    };
};
