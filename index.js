const WebSocket = require('ws');
const LCUConnector = require('lcu-connector');
const connector = new LCUConnector();
const events = require('events');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

module.exports = new events.EventEmitter();

function emitError(err) {
    module.exports.emit('error', err);
}

connector.on('connect', (lcu) => {
    console.log('connect');

    const ws = new WebSocket(`wss://${lcu.username}:${lcu.password}@${lcu.address}:${lcu.port}/`, 'wamp');
    // const url = `${lcu.protocol}://${lcu.username}:${lcu.password}@${lcu.address}:${lcu.port}`

    let timerInterval;
    let initState = false;

    const data = { timer: undefined };
    function gameflowClearInterval(msg) {
        this.phase = msg.data;
        if (this.phase !== 'ChampSelect') {
            clearInterval(timerInterval);
            console.log(`cleared interval because gameflow phase is "${this.phase}" instead of "ChampSelect"`);
        }
    }

    function getTimer(adjustedTimeLeftInPhase, internalNowInEpochMs) {
        const diff = Date.now() - internalNowInEpochMs;
        const timeLeft = adjustedTimeLeftInPhase - diff;
        return Math.floor(timeLeft / 1000);
    }

    function startTimer(adjustedTimeLeftInPhase, internalNowInEpochMs) {
        timerInterval = setInterval(() => {
            this.timer = getTimer(adjustedTimeLeftInPhase, internalNowInEpochMs);
            if (this.timer !== data.timer) {
                data.timer = this.timer;
                module.exports.emit('timer', data);
                module.exports.emit('message', { type: 'timer', timer: data });
            }
        },100);
    }

    function resetTimer(adjustedTimeLeftInPhase, internalNowInEpochMs) {
        clearInterval(timerInterval);
        startTimer(adjustedTimeLeftInPhase, internalNowInEpochMs);
    }

    function initChampSelect(msg) {
        if (msg.eventType === 'Create') {
            initState = true;
        }
        
        if (initState === true && (msg.data.myTeam.length !== 0) || (msg.data.theirTeam.length !== 0)) {
            module.exports.emit('message', { type: 'create', timestamp: Date.now() });
            initState = false
        }
    }

    ws.on('open', () => {
        ws.send('[5, "OnJsonApiEvent"]');
    });

    ws.on('error', (err) => {
        emitError(err);
    });

    ws.on('message', (msg) => {
        this.message = JSON.parse(msg)[2];

        if (this.message.uri === '/lol-champ-select/v1/session') {

            initChampSelect(this.message)

            this.adjustedTimeLeftInPhase = this.message.data.timer.adjustedTimeLeftInPhase;
            this.internalNowInEpochMs = this.message.data.timer.internalNowInEpochMs;

            this.emitEventData = this.message.eventType === 'Delete' ? { type: 'delete', timestamp: Date.now() }
                : this.message.eventType === 'Update' ? { type: 'update', timestamp: Date.now(), data: this.message.data.myTeam }
                    : 'idk';


            module.exports.emit('message', this.emitEventData);

            resetTimer(this.adjustedTimeLeftInPhase, this.internalNowInEpochMs);
        }

        if (this.message.uri === '/lol-gameflow/v1/gameflow-phase') {
            gameflowClearInterval(this.message);
        }
    });
});

connector.start();
