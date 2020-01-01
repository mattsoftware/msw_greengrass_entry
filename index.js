//@format

const {Gpio} = require('onoff');
const Mfrc522 = require('mfrc522-rpi');
const SoftSPI = require('rpi-softspi');

const LED_GPIO = 12;
const RFID_CS = 24;
const RFID_CLK = 23;
const RFID_MOSI = 19;
const RFID_MISO = 21;
const RFID_IRQ = null;
const RFID_RST = 22;
const FEEDBACK_BUZZER = 16;
const FEEDBACK_LED = 18;
const GPIO_1_GPIO = 4;
const GPIO_2_GPIO = 17;
const GPIO_3_GPIO = 27;
const GPIO_4_GPIO = 22;
const DOOR_ENABLE_GPIO = 1;
const DOOR_ACTIVATE_GPIO = 26;
const DOOR_EXIT_GPIO = 16;
const DOOR_OPEN_GPIO = 13;
const DOOR_AUTO_GPIO = 6;
const DOOR_AUTO_OUT_GPIO = 5;
const DOOR_CLOSED_GPIO = 0;

const STATUS_OFF = 100;
const STATUS_READY = 101;
const STATUS_WAITING = 102;
const STATUS_WORKING = 103;
const STATUS_ERROR = 104;
const TIMER_WAITING = 1000;
const TIMER_WORKING = 50;
const TIMER_ERROR = 5000;

const softSPI = new SoftSPI({
    clock: RFID_CLK, // pin number of SCLK
    mosi: RFID_MOSI, // pin number of MOSI
    miso: RFID_MISO, // pin number of MISO
    client: RFID_CS, // pin number of CS
});
const mfrc522 = new Mfrc522(softSPI).setResetPin(RFID_RST).setBuzzerPin(FEEDBACK_BUZZER);
const led = new Gpio(LED_GPIO, 'out');

const wait = ms => {
    return new Promise(r => setTimeout(r, ms));
};

const scanForCard = () => {
    return new Promise((res, rej) => {
        mfrc522.reset();
        const response = mfrc522.findCard();
        if (!response.status) {
            res(false);
        } else {
            const uid = mfrc522.getUid();
            if (!uid.status) {
                res(null);
            } else {
                const hex = uid.data.slice(0, -1).reduce((i, v) => `${v.toString(16)}${i}`, '');
                res(parseInt(hex, 16));
            }
        }
        mfrc522.stopCrypto();
    });
};

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
const setState = state => {
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
const waitForCard = (pollMs = 500) => {
    return new Promise((res, rej) => {
        const interval = setInterval(() => {
            scanForCard().then(v => {
                if (v) {
                    clearInterval(interval);
                    res(v);
                }
            });
        }, pollMs);
    });
};

module.exports = () => {
    return {
        STATUS_OFF,
        STATUS_READY,
        STATUS_WAITING,
        STATUS_WORKING,
        setState,
        waitForCard,
        scanLoop: async (cb, waitMs = 2000) => {
            while (true) {
                await setState(STATUS_READY);
                const v = await waitForCard();
                await setState(STATUS_WORKING);
                cb(v);
                await wait(1000);
                await setState(STATUS_OFF);
                await wait(waitMs);
            }
        },
    };
};
