//@format

const {Gpio} = require('onoff');
const Mfrc522 = require('mfrc522-rpi');
const SoftSPI = require('rpi-softspi');
const constants = require('./constants');
const {sleep} = require('msw_nodejs_helper');

const softSPI = new SoftSPI({
    clock: constants.RFID_CLK, // pin number of SCLK
    mosi: constants.RFID_MOSI, // pin number of MOSI
    miso: constants.RFID_MISO, // pin number of MISO
    client: constants.RFID_CS, // pin number of CS
});
const mfrc522 = new Mfrc522(softSPI).setResetPin(constants.RFID_RST).setBuzzerPin(constants.FEEDBACK_BUZZER);

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

module.exports = {
    waitForCard,
    scanLoop: async (cb, waitMs = 2000) => {
        while (true) {
            const v = await waitForCard();
            cb(v);
            await sleep(waitMs, null);
        }
    },
};
