import { createRNBODevice, noteOn, noteOff } from './rnbo-helpers.js';
import { linearScale } from './utils.js';

let audioContext = new (window.AudioContext || window.webkitAudioContext)();

const arpPatternGeneratorURL = 'export/arp-notes.export.json';
const drumsDeviceURL = 'export/analog-drums.rnbopat.export.json';
const euclideanPatternGeneratorURL = 'export/euclidean.rnbopat.export.json';
const noteRepeaterURL = 'export/note-repeater.rnbopat.export.json';
const pafferDeviceURL = 'export/paffer.rnbopat.export.json';
const padChordsDeviceURL = 'export/pad-chords.export.json';
const arpeggiosURL = 'export/arp-notes.json';

let arpPatterns = null;
let drumSynth = null;
let kickPatternGenerator = null;
let clickPatternGenerator = null;
let repeaterGenerator = null;
let padSynth = null;
let arpSynth = null;
let arpPatternGenerator = null;
let padChordsSynth = null;
let namedSynths = {};
let scaleNotes = [69, 71, 72, 76, 77, 81, 83, 84, 88, 89];
let quantizedNoteEvents = [];
let transportTime = 0;
let active = false;
let sixteenthCounter = 0;

const euclideanPatternGenerators = [];
let activeGenerators = Array(8).fill(false);
const arpGain = audioContext.createGain();
const drumGain = audioContext.createGain();
const padGain = audioContext.createGain();
arpGain.connect(audioContext.destination);
drumGain.connect(audioContext.destination);
padGain.connect(audioContext.destination);

function configureSynthesizers() {

    // Load the "links-adventure" arpeggio
    if (arpPatterns && arpPatterns['links-adventure']) {
        const linksAdventure = arpPatterns['links-adventure'];
        linksAdventure.forEach((notes) => {
            const event = new RNBO.MessageEvent(RNBO.TimeNow, "in2", notes);
            arpPatternGenerator.scheduleEvent(event);
        });
    } else {
        console.warn("Arpeggio patterns not loaded or 'links-adventure' not found.");
    }

    // Click
    euclideanPatternGenerators[0].parametersById.get('rotation').value = 0;
    euclideanPatternGenerators[0].parametersById.get('steps').value = 2;
    euclideanPatternGenerators[0].parametersById.get('grid').value = 16;
    euclideanPatternGenerators[0].parametersById.get('pitch').value = 38;
    euclideanPatternGenerators[0].parametersById.get('velocity').value = 76;
    
    // Something
    euclideanPatternGenerators[7].parametersById.get('rotation').value = 0;
    euclideanPatternGenerators[7].parametersById.get('steps').value = 5;
    euclideanPatternGenerators[7].parametersById.get('grid').value = 16;
    euclideanPatternGenerators[7].parametersById.get('pitch').value = 36;
    euclideanPatternGenerators[7].parametersById.get('velocity').value = 77;

    // Ping
    euclideanPatternGenerators[2].parametersById.get('rotation').value = 1;
    euclideanPatternGenerators[2].parametersById.get('steps').value = 1;
    euclideanPatternGenerators[2].parametersById.get('grid').value = 16;
    euclideanPatternGenerators[2].parametersById.get('pitch').value = 40;
    euclideanPatternGenerators[2].parametersById.get('velocity').value = 120;

    // Something else
    euclideanPatternGenerators[3].parametersById.get('rotation').value = 2;
    euclideanPatternGenerators[3].parametersById.get('steps').value = 7;
    euclideanPatternGenerators[3].parametersById.get('grid').value = 16;
    euclideanPatternGenerators[3].parametersById.get('pitch').value = 41;
    euclideanPatternGenerators[3].parametersById.get('velocity').value = 60;

    // Percussion 1
    euclideanPatternGenerators[4].parametersById.get('rotation').value = 3;
    euclideanPatternGenerators[4].parametersById.get('steps').value = 6;
    euclideanPatternGenerators[4].parametersById.get('grid').value = 16;
    euclideanPatternGenerators[4].parametersById.get('pitch').value = 43;
    euclideanPatternGenerators[4].parametersById.get('velocity').value = 65;

    // Percussion 2
    euclideanPatternGenerators[5].parametersById.get('rotation').value = 2;
    euclideanPatternGenerators[5].parametersById.get('steps').value = 4;
    euclideanPatternGenerators[5].parametersById.get('grid').value = 16;
    euclideanPatternGenerators[5].parametersById.get('pitch').value = 45;
    euclideanPatternGenerators[5].parametersById.get('velocity').value = 60;

    // Percussion 3
    euclideanPatternGenerators[6].parametersById.get('rotation').value = 0;
    euclideanPatternGenerators[6].parametersById.get('steps').value = 4;
    euclideanPatternGenerators[6].parametersById.get('grid').value = 16;
    euclideanPatternGenerators[6].parametersById.get('pitch').value = 47;
    euclideanPatternGenerators[6].parametersById.get('velocity').value = 98;

    // Kick
    euclideanPatternGenerators[1].parametersById.get('rotation').value = 1;
    euclideanPatternGenerators[1].parametersById.get('steps').value = 5;
    euclideanPatternGenerators[1].parametersById.get('grid').value = 16;
    euclideanPatternGenerators[1].parametersById.get('pitch').value = 48;
    euclideanPatternGenerators[1].parametersById.get('velocity').value = 94;

    padSynth.parametersById.get('mto-center-freq').value = 55;
    padSynth.parametersById.get('bandwidth').value = 69;
    padSynth.parametersById.get('paffer/attack').value = 4;
    padSynth.parametersById.get('paffer/decay').value = 40;
    padSynth.parametersById.get('paffer/sustain').value = 0.4;
    padSynth.parametersById.get('paffer/release').value = 500;

    arpSynth.parametersById.get('mto-center-freq').value = 36;
    arpSynth.parametersById.get('bandwidth').value = 57;
    arpSynth.parametersById.get('paffer/attack').value = 4;
    arpSynth.parametersById.get('paffer/decay').value = 40;
    arpSynth.parametersById.get('paffer/sustain').value = 0.4;
    arpSynth.parametersById.get('paffer/release').value = 500;

    arpGain.gain.value = 1.0;
    drumGain.gain.value = 0.3;
    padGain.gain.value = 0.2;
}

let subscribers = {};

export function subscribeToSynthesizer(name, callback) {
    if (!subscribers[name]) {
        subscribers[name] = [];
    }
    subscribers[name].push(callback);
}

export function unsubscribeFromSynthesizer(name, callback) {
    if (subscribers[name]) {
        subscribers[name] = subscribers[name].filter((cb) => cb !== callback);
    }
}

function forwardEventToSynthesizer(name, event) {
    const synth = namedSynths[name];
    if (synth) {
        synth.scheduleEvent(event);
    }
    if (subscribers[name]) {
        subscribers[name].forEach((callback) => {
            callback(event);
        });
    }
}

let synthsReady = false;

export async function createSynthesizers() {

    arpPatterns = await fetch(arpeggiosURL);
    arpPatterns = await arpPatterns.json();
    [arpPatternGenerator] = await createRNBODevice(arpPatternGeneratorURL, audioContext);
    [drumSynth] = await createRNBODevice(drumsDeviceURL, audioContext);

    let dependencies = [];
    try {
        const dependenciesResponse = await fetch("export/drum-dependencies.json");
        dependencies = await dependenciesResponse.json();

        // Prepend "export" to any file dependenciies
        dependencies = dependencies.map(d => d.file ? Object.assign({}, d, { file: "export/" + d.file }) : d);
    } catch (e) {}

    if (dependencies.length)
        await drumSynth.loadDataBufferDependencies(dependencies);

    namedSynths['drums'] = drumSynth;
    [kickPatternGenerator] = await createRNBODevice(euclideanPatternGeneratorURL, audioContext);
    [clickPatternGenerator] = await createRNBODevice(euclideanPatternGeneratorURL, audioContext);
    [repeaterGenerator] = await createRNBODevice(noteRepeaterURL, audioContext);
    [padSynth] = await createRNBODevice(pafferDeviceURL, audioContext);
    namedSynths['pad'] = padSynth;
    [arpSynth] = await createRNBODevice(pafferDeviceURL, audioContext);
    namedSynths['arp'] = arpSynth;
    [padChordsSynth] = await createRNBODevice(padChordsDeviceURL, audioContext);
    let resetEvent = new RNBO.MessageEvent(RNBO.TimeNow, "in3", -1);
    padChordsSynth.scheduleEvent(resetEvent);

    for (let i = 0; i < 8; i++ ) {
        const [euclideanPatternGenerator] = await createRNBODevice(euclideanPatternGeneratorURL, audioContext);
        euclideanPatternGenerators.push(euclideanPatternGenerator);
        euclideanPatternGenerator.midiEvent.subscribe((event) => {

            if (event.data[2] > 0) {
                if (!activeGenerators[i]) {
                    return; // Skip if the generator is not active
                }
            }

            if (i == 0) {
                repeaterGenerator.scheduleEvent(event);
            }  else {
                forwardEventToSynthesizer('drums', event);
            }
        });
    }

    configureSynthesizers();

    arpPatternGenerator.midiEvent.subscribe((event) => {
        forwardEventToSynthesizer('arp', event);
    });
    padChordsSynth.midiEvent.subscribe((event) => {
        if (active) {
            forwardEventToSynthesizer('pad', event);
        }
    });
    // kickPatternGenerator.midiEvent.subscribe((event) => {
    //     drumSynth.scheduleEvent(event);
    //     forwardEventToSynthesizer('drums', event);
    // });
    // clickPatternGenerator.midiEvent.subscribe((event) => {
    //     repeaterGenerator.scheduleEvent(event);
    // });
    repeaterGenerator.midiEvent.subscribe((event) => {
        forwardEventToSynthesizer('drums', event);
    });
    arpSynth.node.connect(arpGain);
    drumSynth.node.connect(drumGain);
    padSynth.node.connect(padGain);

    synthsReady = true;
}

function setActive(state) {
    active = state;
    if (subscribers['state']) {
        subscribers['state'].forEach((callback) => {
            callback(active);
        });
    }
}
export async function start() {
    await audioContext.resume();

    // I'm lazy, just wait if the synths aren't ready yet
    if (!synthsReady) {
        await new Promise((resolve) => {setTimeout(resolve, 1000)});
    }

    Tone.Transport.swing = 0;
    Tone.Transport.bpm.value = 120;

    Tone.Transport.stop();
    Tone.Transport.cancel(); // Clear any scheduled events
    Tone.Transport.seconds = 0;
    sixteenthCounter = 0;
    
    Tone.Transport.start();
    console.log('Transport state after start:', Tone.Transport.state);
    let timeOffset = Tone.getContext().currentTime;
    let rnboTimeZero = 0;

    Tone.Transport.scheduleRepeat((time) => {

        if (!active) return;

        if (sixteenthCounter === 0) {
            rnboTimeZero = audioContext.currentTime;

            let resetEvent = new RNBO.MessageEvent(RNBO.TimeNow, "in3", -1);
            padChordsSynth.scheduleEvent(resetEvent);
        }

        // const currentTransportTime = Tone.getTransport().position;

        // console.log('Loop callback triggered at time:', time); // Add this to see if callback fires
        // console.log('Transport time:', currentTransportTime); // Add this to see if callback fires

        // const bartime = Tone.Time(currentTransportTime).toBarsBeatsSixteenths();
        // const [bars, beats, sixteenths] = bartime.split(':').map(Number);
        // transportTime = bars * 16 + beats * 4 + sixteenths;

        transportTime = Math.floor((time - timeOffset) * 4 * Tone.Transport.bpm.value / 60); // Convert time to sixteenth notes;

        // transportTime = sixteenthCounter; // so annoying but this seems to be the best way to get accurate timing

        const bars = Math.floor(transportTime / 16);
        const beats = Math.floor((transportTime % 16) / 4);
        const sixteenths = transportTime % 4;
        const sixteenthsPerSecond = Tone.Transport.bpm.value / 60 * 4; // 4 sixteenths per beat
        let nextQuantizedTime = (rnboTimeZero + (transportTime / sixteenthsPerSecond)) * 1000 + 50; // Convert to seconds (16th note = 62.5ms)

        if (padChordsSynth && padSynth) {
            const maxFormattedTime = [ bars, beats + 1, sixteenths * 120 ];
            const event = new RNBO.MessageEvent(nextQuantizedTime, "in1", maxFormattedTime);
            padChordsSynth.scheduleEvent(event);
            kickPatternGenerator.scheduleEvent(event);
            clickPatternGenerator.scheduleEvent(event);

            euclideanPatternGenerators.forEach((generator) => {
                generator.scheduleEvent(event);
            });
        } else {
            console.log("no pad synth");
        }

        if (arpSynth) {
            let arpEvents = [];
            if (subscribers["transport"]) {
                subscribers["transport"].forEach((callback) => {
                    arpEvents = arpEvents.concat(callback(transportTime, nextQuantizedTime));
                });
            }

            arpEvents.forEach((event) => {
                arpSynth.scheduleEvent(event);
            });
        }

        sixteenthCounter++;
    }, '16n', 0);
    
    setActive(true);
}

export function stop() {
    
    Tone.Transport.stop();
    Tone.Transport.cancel(); // Clear any scheduled events
    
    for (let i = 1; i < 128; i++) {
        let noteOffMessage = [ 128, i, 0 ];
        let noteOffEvent = new RNBO.MIDIEvent(RNBO.TimeNow + 100, 0, noteOffMessage);
        drumSynth.scheduleEvent(noteOffEvent);
        arpSynth.scheduleEvent(noteOffEvent);
        padSynth.scheduleEvent(noteOffEvent);
    }
    let resetEvent = new RNBO.MessageEvent(RNBO.TimeNow, "in3", -1);
    padChordsSynth.scheduleEvent(resetEvent);
    setActive(false);
}

export function mouseToPad(px, py) {
    const fx = linearScale(px, -1, 1, 40, 80);
    const fy = linearScale(py, -1, 1, 40, 80);

    if (!!padSynth && !!arpSynth) {
        padSynth.parametersById.get('mto-center-freq').value = fx;
        padSynth.parametersById.get('bandwidth').value = fy;
        arpSynth.parametersById.get('mto-center-freq').value = fy;
    }
}

export function createArpEvents(pitchIndex, velocity, nextQuantizedTime) {
    let events = [];
    const pitch = scaleNotes[pitchIndex % scaleNotes.length]; // Ensure pitch is within the scale
    let midiChannel = 0;
    let midiPort = 0;

    let noteMessage = [
        144 + midiChannel, // Code for a note on: 10010000 & MIDI channel (0-15)
        pitch, // MIDI Note
        velocity // MIDI Velocity
    ];

    // When scheduling an event, use the current audio context time
    // multiplied by 1000 (converting seconds to milliseconds)
    let noteEvent = new RNBO.MIDIEvent(nextQuantizedTime, midiPort, noteMessage);
    events.push(noteEvent);

    // Now schedule the note off
    nextQuantizedTime += 62.5; // Note length of a 16th note
    let noteOffMessage = [
        128 + midiChannel, // Code for a note off: 10000000 & MIDI channel (0-15)
        pitch, // MIDI Note
        0 // Velocity 0 for note off
    ];
    let noteOffEvent = new RNBO.MIDIEvent(nextQuantizedTime, midiPort, noteOffMessage);
    events.push(noteOffEvent);
    return events;
}

export function handleKey(row, column, direction) {
    audioContext.resume();
    if (row === 0) {
        const pitch = scaleNotes[column] - 12;
        const velocity = 90;

        if (arpSynth) {
            let midiChannel = 0;
            let midiPort = 0;
            let nextQuantizedTime = Math.ceil(audioContext.currentTime * 16) * 62.5;
            if (direction === 0) {
                nextQuantizedTime += 62.5; // Advance to the next 16th note
            }

            let noteMessage = [
                (direction ? 144 : 128) + midiChannel, // Code for a note on: 10010000 & MIDI channel (0-15)
                pitch, // MIDI Note
                (direction ? velocity : 0) // MIDI Velocity
            ];

            // When scheduling an event, use the current audio context time
            // multiplied by 1000 (converting seconds to milliseconds)
            let noteEvent = new RNBO.MIDIEvent(nextQuantizedTime, midiPort, noteMessage);
            arpSynth.scheduleEvent(noteEvent);
        }
    }
}

export function toggleActiveGenerator(index) {
    if (index < 0 || index >= activeGenerators.length) {
        console.warn("Invalid generator index:", index);
        return;
    }
    activeGenerators[index] = !activeGenerators[index];
}

export function getTransportTime() {
    return transportTime;
}

export function getActive() {
    return active;
}
