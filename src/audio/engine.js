// Motor de audio extraído del HTML en V12.5.
const AudioEngine = {
            ctx: null,
            ambientNodes: [],
            init() {
                if(!this.ctx) {
                    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                }
            },
            playCoin() {
                if(!this.ctx) return;
                let osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
                osc.type = 'sine'; osc.frequency.setValueAtTime(587.33, this.ctx.currentTime);
                osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);
                osc.connect(gain); gain.connect(this.ctx.destination);
                osc.start(); osc.stop(this.ctx.currentTime + 0.35);
            },
            playShoot() {
                if(!this.ctx) return;
                let osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
                osc.type = 'sawtooth'; 
                osc.frequency.setValueAtTime(600, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.12);
                gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
                osc.connect(gain); gain.connect(this.ctx.destination);
                osc.start(); osc.stop(this.ctx.currentTime + 0.12);
            },
            playHit() {
                if(!this.ctx) return;
                let osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
                osc.type = 'square'; osc.frequency.setValueAtTime(140, this.ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.25);
                gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
                osc.connect(gain); gain.connect(this.ctx.destination);
                osc.start(); osc.stop(this.ctx.currentTime + 0.25);
            },
            createNoiseBuffer() {
                const bufferSize = 2 * this.ctx.sampleRate;
                const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }
                return noiseBuffer;
            },
            stopAmbient() {
                this.ambientNodes.forEach(node => {
                    try { node.stop(); } catch(e) {}
                });
                this.ambientNodes = [];
            },
            playAmbient(biome) {
                if(!this.ctx) return;
                this.stopAmbient();

                const mainGain = this.ctx.createGain();
                mainGain.gain.setValueAtTime(0.1, this.ctx.currentTime);
                mainGain.connect(this.ctx.destination);

                if (biome === 'Selva') {
                    let hum = this.ctx.createOscillator();
                    hum.type = 'triangle'; hum.frequency.value = 65;
                    let humGain = this.ctx.createGain(); humGain.gain.value = 0.04;
                    hum.connect(humGain).connect(mainGain);
                    hum.start(); this.ambientNodes.push(hum);
                } else if (biome === 'Montaña') {
                    let noiseSource = this.ctx.createBufferSource();
                    noiseSource.buffer = this.createNoiseBuffer();
                    noiseSource.loop = true;
                    let windFilter = this.ctx.createBiquadFilter();
                    windFilter.type = 'bandpass'; windFilter.Q.value = 3.5;
                    let lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.1;
                    let lfoGain = this.ctx.createGain(); lfoGain.gain.value = 220;
                    lfo.connect(lfoGain).connect(windFilter.frequency);
                    noiseSource.connect(windFilter).connect(mainGain);
                    lfo.start(); noiseSource.start();
                    this.ambientNodes.push(lfo, noiseSource);
                } else if (biome === 'Desierto') {
                    let noiseSource = this.ctx.createBufferSource();
                    noiseSource.buffer = this.createNoiseBuffer();
                    noiseSource.loop = true;
                    let desertFilter = this.ctx.createBiquadFilter();
                    desertFilter.type = 'bandpass'; desertFilter.Q.value = 1.5;
                    let lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.15;
                    let lfoGain = this.ctx.createGain(); lfoGain.gain.value = 180;
                    lfo.connect(lfoGain).connect(desertFilter.frequency);
                    noiseSource.connect(desertFilter).connect(mainGain);
                    lfo.start(); noiseSource.start();
                    this.ambientNodes.push(lfo, noiseSource);
                } else if (biome === 'Bosque') {
                    let drone1 = this.ctx.createOscillator(), drone2 = this.ctx.createOscillator();
                    drone1.type = 'sawtooth'; drone1.frequency.value = 50;
                    drone2.type = 'triangle'; drone2.frequency.value = 50.5;
                    let lowpass = this.ctx.createBiquadFilter();
                    lowpass.type = 'lowpass'; lowpass.frequency.value = 110;
                    let droneGain = this.ctx.createGain(); droneGain.gain.value = 0.05;
                    drone1.connect(lowpass); drone2.connect(lowpass);
                    lowpass.connect(droneGain).connect(mainGain);
                    drone1.start(); drone2.start();
                    this.ambientNodes.push(drone1, drone2);
                }
                // --- AMBIENTES SONOROS NUEVOS NIVELES 7-11 ---
                else if (biome === 'Egipto') {
                    // Drone grave de cámara mortuoria + viento de arena tenue
                    let drone = this.ctx.createOscillator();
                    drone.type = 'sine'; drone.frequency.value = 72;
                    let droneGain = this.ctx.createGain(); droneGain.gain.value = 0.06;
                    let sand = this.ctx.createBufferSource();
                    sand.buffer = this.createNoiseBuffer(); sand.loop = true;
                    let sandFilter = this.ctx.createBiquadFilter();
                    sandFilter.type = 'highpass'; sandFilter.frequency.value = 2200;
                    let sandGain = this.ctx.createGain(); sandGain.gain.value = 0.015;
                    drone.connect(droneGain).connect(mainGain);
                    sand.connect(sandFilter).connect(sandGain).connect(mainGain);
                    drone.start(); sand.start();
                    this.ambientNodes.push(drone, sand);
                }
                else if (biome === 'Maya') {
                    // Percusión ritual con flauta grave sintetizada + selva densa
                    let flute = this.ctx.createOscillator();
                    flute.type = 'sine'; flute.frequency.value = 220;
                    let flGain = this.ctx.createGain(); flGain.gain.value = 0.035;
                    let lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.25;
                    let lfoGain = this.ctx.createGain(); lfoGain.gain.value = 25;
                    lfo.connect(lfoGain).connect(flute.frequency);
                    let hum = this.ctx.createOscillator();
                    hum.type = 'triangle'; hum.frequency.value = 60;
                    let humGain = this.ctx.createGain(); humGain.gain.value = 0.04;
                    flute.connect(flGain).connect(mainGain);
                    hum.connect(humGain).connect(mainGain);
                    flute.start(); lfo.start(); hum.start();
                    this.ambientNodes.push(flute, lfo, hum);
                }
                else if (biome === 'Azteca') {
                    // Tambores volcánicos graves con crepitar de fuego
                    let lowDrum = this.ctx.createOscillator();
                    lowDrum.type = 'square'; lowDrum.frequency.value = 45;
                    let drumGain = this.ctx.createGain(); drumGain.gain.value = 0.045;
                    let fire = this.ctx.createBufferSource();
                    fire.buffer = this.createNoiseBuffer(); fire.loop = true;
                    let fireFilter = this.ctx.createBiquadFilter();
                    fireFilter.type = 'bandpass'; fireFilter.frequency.value = 800; fireFilter.Q.value = 0.8;
                    let fireGain = this.ctx.createGain(); fireGain.gain.value = 0.03;
                    lowDrum.connect(drumGain).connect(mainGain);
                    fire.connect(fireFilter).connect(fireGain).connect(mainGain);
                    lowDrum.start(); fire.start();
                    this.ambientNodes.push(lowDrum, fire);
                }
                else if (biome === 'ChinaFeudal') {
                    // Campanas y cuerdas orientales sintetizadas
                    let bell = this.ctx.createOscillator();
                    bell.type = 'sine'; bell.frequency.value = 330;
                    let bellGain = this.ctx.createGain(); bellGain.gain.value = 0.025;
                    let lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.08;
                    let lfoGain = this.ctx.createGain(); lfoGain.gain.value = 8;
                    lfo.connect(lfoGain).connect(bell.frequency);
                    let string_ = this.ctx.createOscillator();
                    string_.type = 'triangle'; string_.frequency.value = 165;
                    let stringGain = this.ctx.createGain(); stringGain.gain.value = 0.03;
                    bell.connect(bellGain).connect(mainGain);
                    string_.connect(stringGain).connect(mainGain);
                    bell.start(); lfo.start(); string_.start();
                    this.ambientNodes.push(bell, lfo, string_);
                }
                else if (biome === 'Grecia') {
                    // Viento sobre mármol + coro de cuerdas graves de lira
                    let wind = this.ctx.createBufferSource();
                    wind.buffer = this.createNoiseBuffer(); wind.loop = true;
                    let windFilter = this.ctx.createBiquadFilter();
                    windFilter.type = 'bandpass'; windFilter.Q.value = 2.2;
                    let lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.12;
                    let lfoGain = this.ctx.createGain(); lfoGain.gain.value = 260;
                    lfo.connect(lfoGain).connect(windFilter.frequency);
                    let windGain = this.ctx.createGain(); windGain.gain.value = 0.03;
                    let lyre = this.ctx.createOscillator();
                    lyre.type = 'sine'; lyre.frequency.value = 196;
                    let lyreGain = this.ctx.createGain(); lyreGain.gain.value = 0.02;
                    wind.connect(windFilter).connect(windGain).connect(mainGain);
                    lyre.connect(lyreGain).connect(mainGain);
                    lfo.start(); wind.start(); lyre.start();
                    this.ambientNodes.push(lfo, wind, lyre);
                }
            }
        };

window.ExploradorAudioEngine = AudioEngine;
