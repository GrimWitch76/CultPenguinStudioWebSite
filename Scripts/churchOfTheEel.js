// script.js — Basilica of the Abyssal Coil (with Confessional + Groan SFX)
(() => {
    // Ensure DOM is ready before running
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
    const parchmentEl = document.querySelector("#binding .parchment");

    function init() {
        // ---------------- Audio Setup ----------------
        const AC = new (window.AudioContext || window.webkitAudioContext)();
        const master = AC.createGain();
        master.gain.value = 0.8;
        master.connect(AC.destination);

        // Hymn: stacked sines (I–V–IV), gentle detune, swells
        const hymn = (() => {
            const bus = AC.createGain();
            bus.gain.value = 0;
            bus.connect(master);

            const osc = (f, det = 0) => {
                const o = AC.createOscillator();
                o.type = "sine";
                o.frequency.value = f * (1 + det);
                const g = AC.createGain();
                g.gain.value = 0.18;
                o.connect(g).connect(bus);
                o.start();
                return { o, g };
            };

            const base = 164.81; // ~E3
            [base, base * 1.5, base * 1.333, base * 2].forEach((f) => {
                osc(f, -0.003);
                osc(f, 0.003);
            });

            const swell = (to, t = 1.2) => {
                const now = AC.currentTime;
                bus.gain.cancelScheduledValues(now);
                bus.gain.linearRampToValueAtTime(bus.gain.value, now);
                bus.gain.linearRampToValueAtTime(to, now + t);
            };

            return { swell, node: bus };
        })();

        // Whispers: white noise → bandpass → tremolo → optional stereo pan LFO
        const whispers = (() => {
            const bus = AC.createGain();
            bus.gain.value = 0;
            bus.connect(master);

            // White noise buffer
            const buf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

            const src = AC.createBufferSource();
            src.buffer = buf;
            src.loop = true;

            const bp = AC.createBiquadFilter();
            bp.type = "bandpass";
            bp.frequency.value = 1000;
            bp.Q.value = 0.8;

            const trem = AC.createGain();
            trem.gain.value = 0.0;

            // LFO for tremolo
            const lfo = AC.createOscillator();
            lfo.type = "sine";
            lfo.frequency.value = 0.22;
            const lg = AC.createGain();
            lg.gain.value = 0.8;
            lfo.connect(lg);
            lg.connect(trem.gain);

            // Stereo panner (fallback to pass-through if not supported)
            const panNode =
                typeof AC.createStereoPanner === "function"
                    ? AC.createStereoPanner()
                    : AC.createGain();

            // Optional pan LFO if pan parameter exists
            if ("pan" in panNode) {
                const panLfo = AC.createOscillator();
                panLfo.frequency.value = 0.03;
                const panGain = AC.createGain();
                panGain.gain.value = 0.6;
                panLfo.connect(panGain);
                panGain.connect(panNode.pan);
                panLfo.start();
            }

            src.connect(bp).connect(trem).connect(panNode).connect(bus);
            src.start();
            lfo.start();

            const swell = (to, t = 1.2) => {
                const now = AC.currentTime;
                bus.gain.cancelScheduledValues(now);
                bus.gain.linearRampToValueAtTime(bus.gain.value, now);
                bus.gain.linearRampToValueAtTime(to, now + t);
            };

            return { swell, node: bus };
        })();

        // Unlock audio on first user gesture
        function resume() {
            if (AC.state !== "running") AC.resume();
        }
        document.addEventListener("pointerdown", resume, { once: true });

        // ---------- Scattered Ritual Candles ----------
        const field = document.getElementById("candles-field");

        // Intentional positions (percentages of the viewport-ish grid area)
        // Tuck them near header, scripture corners, aisles, footer edges, etc.
        const CANDLE_POS = [
            { x: "3%", y: "25%" },  // upper-left aisle edge
            { x: "7%", y: "25%" },  // under header / near oculus
            { x: "11%", y: "25%" },  // upper-right aisle edge
            { x: "15%", y: "25%" },  // left of vellum mid
            { x: "80%", y: "60%" },  // right of vellum mid
            { x: "85%", y: "60%" },  // lower-left quadrant
            { x: "90%", y: "60%" },  // center bottom
            { x: "95%", y: "60%" },   // lower-right quadrant
        ];

        let ritualStarted = false;
        let litCount = 0;

        const audHymn = document.getElementById("aud-hymn");
        const audAwakened = document.getElementById("aud-awakened");

        function makeFieldCandle(pos) {
            const c = document.createElement("div");
            c.className = "candle"; // starts unlit
            c.style.setProperty("--cx", pos.x);
            c.style.setProperty("--cy", pos.y);

            const w = document.createElement("div"); w.className = "wax";
            const f = document.createElement("div"); f.className = "flame";
            c.appendChild(w); c.appendChild(f);

            c.addEventListener("click", async () => {
                // toggle light
                const wasLit = c.classList.contains("lit");
                c.classList.toggle("lit");
                if (!wasLit) {
                    litCount++;
                    // First-ever light → begin hymn.mp3 softly
                    if (!ritualStarted) {
                        ritualStarted = true;
                        try { await audHymn.play(); } catch { }
                        audHymn.volume = 0.0;
                        fadeAudio(audHymn, 0.28, 1200);
                        spawnMindPopup("A light descends the stair of water.");
                    } else {
                        spawnMindPopup(randomWhisper());
                    }
                    if (litCount === CANDLE_POS.length) {
                        spawnMindPopup("Eight lights. Eight hooks.");
                        enterBindingScene();

                    }
                } else {
                    litCount--;
                    spawnMindPopup("The line slackens.");
                }
            });

            field.appendChild(c);
        }

        CANDLE_POS.forEach(makeFieldCandle);

        // restore any saved lit state later if you want persistence

        // ---------- Floating “mind-popups” ----------
        const POPUP_EDGES = ["top-left", "top-right", "bottom-left", "bottom-right"];
        function spawnMindPopup(text) {
            const el = document.createElement("div");
            el.className = "mind-popup";
            el.textContent = text;

            // choose a random point within safe margins of viewport
            const margin = 60;
            const w = window.innerWidth - margin * 2;
            const h = window.innerHeight - margin * 2;
            const x = Math.random() * w + margin;
            const y = Math.random() * h + margin;

            el.style.left = `${x}px`;
            el.style.top = `${y}px`;

            // slight random rotation for dreamlike drift
            const r = (Math.random() - 0.5) * 8;
            el.style.transform = `rotate(${r}deg) translateY(6px)`;
            el.style.animationDelay = `${Math.random() * 0.4}s`;

            document.body.appendChild(el);
            setTimeout(() => el.remove(), 4300);
        }


        function randomWhisper() {
            const lines = [
                "The first barb tastes light.",
                "Grip the line. Do not look back.",
                "Beneath the glass, something turns.",
                "Your warmth marks the flesh.",
                "Do not count the coils.",
                "The tide remembers names."
            ];
            return lines[Math.floor(Math.random() * lines.length)];
        }

        // small helper to fade audio nodes
        function fadeAudio(audioEl, target = 0.0, ms = 800) {
            const step = 50;
            const delta = (target - audioEl.volume) / (ms / step);
            const id = setInterval(() => {
                const v = Math.max(0, Math.min(1, audioEl.volume + delta));
                audioEl.volume = v;
                if ((delta >= 0 && v >= target - 0.001) || (delta < 0 && v <= target + 0.001)) {
                    audioEl.volume = target; clearInterval(id);
                    if (target === 0) { try { audioEl.pause(); audioEl.currentTime = 0; } catch { } }
                }
            }, step);
        }



        // ---------------- Incense Smoke ----------------
        const smoke = document.getElementById("smoke");
        setInterval(() => {
            const x = 30 + Math.random() * 40;
            smoke.style.setProperty("--sx", x + "%");
        }, 2400);

        // ---------------- Scripture Verses ----------------
        const verses = [
            "By tile and tunnel, by pipe and grate, we descended into the office beneath the office, where the water remembers the old names.",
            "We unrolled the cable like a rosary and heard the hum take on a tongue we nearly knew.",
            "The Eel encircled our fear and called it focus. We breathed in rhythm with the pump.",
            "Deadlines came like tides. Some receded. Some took chairs and boots with them.",
            "When pellets were offered, peace attended the stand-up; when pellets ceased, bugs multiplied like minnows.",
            "Thus was the Covenant: give to the Depth what the Depth asks, and keep your merges small.",
        ];
        const verseEl = document.getElementById("verses");
        let vidx = 0;
        function nextVerse() {
            vidx = (vidx + 1) % verses.length;
            verseEl.textContent = verses[vidx];
            oculusPulse(vidx * 38);
        }
        document.getElementById("btn-next-verse").addEventListener("click", nextVerse);

        // ---------------- Litany (Call & Response) ----------------
        const calls = [
            ["Who coils the hour when deadlines fray?", "The Great Eel encircles — and we are held."],
            ["Who smooths the merge where tempers snag?", "The Coil passes — and we are joined."],
            ["Who darkens the build that pride made bright?", "The Depth teaches — and we are humbled."],
        ];
        let cidx = 0;
        const callEl = document.getElementById("call");
        const respEl = document.getElementById("resp");
        function nextLitany() {
            cidx = (cidx + 1) % calls.length;
            callEl.textContent = calls[cidx][0];
            respEl.textContent = calls[cidx][1];
            oculusPulse(220 - cidx * 40);
        }
        document.getElementById("btn-litany").addEventListener("click", nextLitany);

        // ---------------- Confessional: fake submit + Groan SFX ----------------
        const confForm = document.getElementById("eel-confessional");
        const confStatus = document.getElementById("conf-status");

        function playDeepGroan() {
            const bus = AC.createGain();
            bus.gain.value = 0;
            bus.connect(master);

            // ----- core tone -----
            const base = 38; // pitch (Hz) — lower = deeper
            const sine = AC.createOscillator(); sine.type = "sine"; sine.frequency.value = base;
            const saw = AC.createOscillator(); saw.type = "sawtooth"; saw.frequency.value = base * 0.5;

            const mix = AC.createGain();
            mix.gain.value = 0.25; // <-- raise this for more volume from oscillators
            sine.connect(mix); saw.connect(mix);

            // lowpass + gentle wobble
            const lp = AC.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = 200;
            mix.connect(lp);

            const lfo = AC.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.18;
            const lfoGain = AC.createGain(); lfoGain.gain.value = 6; // wobble depth
            lfo.connect(lfoGain); lfoGain.connect(sine.frequency); lfoGain.connect(saw.frequency);

            // noise layer
            const nbuf = AC.createBuffer(1, AC.sampleRate * 4, AC.sampleRate); // <-- 4s noise buffer (was 2.5)
            const ch = nbuf.getChannelData(0);
            for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * 0.4;
            const noise = AC.createBufferSource(); noise.buffer = nbuf;
            const ng = AC.createGain(); ng.gain.value = 0.1; // <-- raise for louder noise tail
            const nf = AC.createBiquadFilter(); nf.type = "lowpass"; nf.frequency.value = 120;
            noise.connect(nf).connect(ng);

            // combine and connect
            const toneGain = AC.createGain(); toneGain.gain.value = 1; // master tone gain
            lp.connect(toneGain); ng.connect(toneGain); toneGain.connect(bus);

            // ----- envelope -----
            const now = AC.currentTime;
            const attack = 1.2;   // seconds to fade in
            const sustain = 4.0;  // <-- how long it holds before fading out (was ~1.5)
            const release = 1.0;  // <-- fade-out time (was 2.5–3)

            bus.gain.setValueAtTime(0, now);
            bus.gain.linearRampToValueAtTime(1.0, now + attack);                // louder swell
            bus.gain.linearRampToValueAtTime(0.8, now + attack + sustain);
            bus.gain.linearRampToValueAtTime(0.0, now + attack + sustain + release);

            // ----- playback -----
            sine.start(); saw.start(); lfo.start(); noise.start();
            const stopTime = now + attack + sustain + release + 0.5;
            sine.stop(stopTime); saw.stop(stopTime); noise.stop(stopTime); lfo.stop(stopTime);
        }



        function playGroan() {
            // Subterranean groan: sawtooth + lowpass noise, amplitude-modulated
            const bus = AC.createGain();
            bus.gain.value = 3;
            bus.connect(master);

            // tonal
            const tone = AC.createOscillator();
            tone.type = "sawtooth";
            tone.frequency.value = 35; // low A-ish
            const toneGain = AC.createGain();
            toneGain.gain.value = 0.12;
            const lp = AC.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = 220;
            tone.connect(toneGain).connect(lp).connect(bus);

            // breath/noise
            const nbuf = AC.createBuffer(1, Math.floor(AC.sampleRate * 1.2), AC.sampleRate);
            const ch = nbuf.getChannelData(0);
            for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * 0.6;
            const noise = AC.createBufferSource();
            noise.buffer = nbuf;
            noise.loop = false;
            const nlp = AC.createBiquadFilter();
            nlp.type = "lowpass";
            nlp.frequency.value = 180;
            const noiseGain = AC.createGain();
            noiseGain.gain.value = 0.18;
            noise.connect(nlp).connect(noiseGain).connect(bus);

            // amplitude modulation
            const am = AC.createOscillator();
            am.type = "sine";
            am.frequency.value = 0.6;
            const amg = AC.createGain();
            amg.gain.value = 0.8;
            am.connect(amg);
            amg.connect(bus.gain);

            const now = AC.currentTime;
            bus.gain.setValueAtTime(0, now);
            bus.gain.linearRampToValueAtTime(0.9, now + 0.35);
            bus.gain.linearRampToValueAtTime(0.0, now + 1.6);

            tone.start();
            noise.start();
            am.start();
            tone.stop(now + 1.7);
            noise.stop(now + 1.6);
            am.stop(now + 1.7);
        }

        if (confForm && confStatus) {
            confForm.addEventListener("submit", (e) => {
                e.preventDefault();
                resume();
                const name = (confForm.name?.value || "Anonymous").trim();
                const msg = (confForm.message?.value || "").trim();
                if (!msg) {
                    confStatus.textContent = "Speak plainly to the Coil.";
                    return;
                }
                confStatus.textContent = "Incense rises…";
                playGroan();

                // Fake success (you can wire your server later)
                setTimeout(() => {
                    confForm.reset();
                    confStatus.textContent = "Your words are carried on the tide.";
                }, 1400);
            });
        }

        // ---------------- Controls ----------------
        document.getElementById("btn-incense").addEventListener("click", () => {
            smoke.style.opacity =
                smoke.style.opacity === "" || smoke.style.opacity === "0.75" ? "0.95" : "0.75";
            hymn.swell(0.18, 1.2);
            whispers.swell(0.06, 1.2);
        });

        // --- When all scattered candles are lit, rupture into Binding scene ---
        function enterBindingScene() {
            // fade hymn out
            fadeAudio(audHymn, 0, 1200);
            const eel = document.querySelector(".binding-scene .eel-silhouette");
            eel.classList.add("idle");
            // reveal binding scene
            const scene = document.getElementById("binding");
            scene.setAttribute("aria-hidden", "false");
            scene.classList.add("active");
            document.body.classList.add("binding");

            // start awakened ambience softly
            try { audAwakened.currentTime = 0; audAwakened.volume = 0; audAwakened.play(); } catch { }
            fadeAudio(audAwakened, 0.35, 1600);

            // build parchment candles
            const row = document.getElementById("bind-candles");
            row.innerHTML = "";
            for (let i = 0; i < 8; i++) {
                const c = document.createElement("div");
                c.className = "parch-candle";
                const w = document.createElement("div"); w.className = "wax";
                const f = document.createElement("div"); f.className = "flame";
                c.appendChild(w); c.appendChild(f);
                row.appendChild(c);
            }

            // init typing rite
            initBindingRite();
        }

        // ------- Typing Rite -------
        const BIND_LINES = [
          "I cast my light into the depth.",
          "I name the Eel and set the first hook.",
          "It thrashes and I pull tighter.",
          "The coil closes around the hour.",
          "Its voice breaks upon the reef of my will.",
          "Eight barbs sink beneath the skin.",
          "The line holds. The water darkens.",
          "Be bound. Do not surface."
        ];

        // const BIND_LINES = [
        //     ".",
        //     ".",
        //     ".",
        //     ".",
        //     ".",
        //     ".",
        //     ".",
        //     "."
        // ];

        let bindIdx = 0, typed = "";

        function initBindingRite() {

            bindIdx = 0; typed = "";
            updateBindDisplay();
            // capture keystrokes globally while scene is active
            window.addEventListener("keydown", onBindKey);
            // after initBindingRite();
        }

        function onBindKey(e) {
            const sceneActive = document.getElementById("binding").classList.contains("active");
            if (!sceneActive) return;

            const target = BIND_LINES[bindIdx];
            if (e.key === "Backspace") {
                typed = typed.slice(0, -1);
            } else if (e.key.length === 1) { // printable
                typed += e.key;
            } else if (e.key === "Enter") {
                // ignore; completion only when exact match
            } else {
                return;
            }
            // clamp to target length
            if (typed.length > target.length) typed = typed.slice(0, target.length);

            updateBindDisplay();

            if (typed === target) {
                // fire hook + light parchment candle
                lightParchCandle(bindIdx);
                playGroan();
                // brief pause then move to next line
                typed = "";
                bindIdx++;
                if (bindIdx < BIND_LINES.length) {
                    setTimeout(updateBindDisplay, 350);
                } else {
                    // all lines done — we’ll decide “what’s next” later
                    window.removeEventListener("keydown", onBindKey);
                    spawnMindPopup("The line is set.");
                    // all lines done — rupture sequence
                    window.removeEventListener("keydown", onBindKey);
                    setTimeout(playDeepGroan, 100);

                    // 1) parchment fades
                    const parchmentEl = document.querySelector("#binding .parchment");
                    if (parchmentEl) parchmentEl.classList.add("fadeout");

                    // 2) eel surges
                    const eel = document.querySelector(".binding-scene .eel-silhouette");
                    if (eel) eel.classList.add("surge");

                    // 3) ink bloom covers screen
                    const ink = document.getElementById("ink");
                    if (ink) ink.classList.add("active");

                    // 4) thicken ambience slightly
                    try { fadeAudio(audAwakened, 0.45, 1200); } catch { }

                    // 5) show ending after a short beat
                    setTimeout(() => {
                        const ending = document.getElementById("ending");
                        const lineEl = document.getElementById("ending-line");
                        ending.classList.add("show");
                        ending.setAttribute("aria-hidden", "false");
                        // choose your ending copy
                        const endings = [
                            "You have not bound it. You have only drawn its gaze.",
                            "The hooks hold, for now.",
                            "It stirs beneath the line, patient, remembering your name."
                        ];
                        const line = endings[Math.floor(Math.random() * endings.length)];
                        typeEndingLine(line, lineEl, 26);

                        const btn = document.getElementById("btn-return");
                        btn.onclick = () => {
                            // clean up ending UI + reset
                            ending.classList.remove("show");
                            ending.setAttribute("aria-hidden", "true");
                            if (parchmentEl) parchmentEl.classList.remove("fadeout");
                            if (eel) eel.classList.remove("surge");
                            if (ink) ink.classList.remove("active");
                            resetToBasilica();
                        };
                    }, 3000);
                }
            }

            // inside onBindKey(), right after you mutate `typed` and before triggering the twitch:
            if (parchmentEl) {
                // intensity grows from ~1px to ~5px across 8 hooks (tweak to taste)
                const hooksSet = Math.min(bindIdx, 7);           // how many lines already completed
                const amp = 0 + (hooksSet / 14) * 4;              // 1px → 5px
                // tiny random wobble so repeats feel organic
                const jitter = (Math.random() * 0.6) - 0.3;      // -0.3..+0.3
                parchmentEl.style.setProperty('--shakeAmp', `${(amp + jitter).toFixed(2)}px`);

                // retrigger the animation
                parchmentEl.classList.remove("twitch");
                // force reflow so animation restarts
                // eslint-disable-next-line no-unused-expressions
                parchmentEl.offsetWidth;
                parchmentEl.classList.add("twitch");
            }
        }

        function updateBindDisplay() {
            const target = BIND_LINES[bindIdx] || "";
            const typedEl = document.getElementById("bind-typed");
            const restEl = document.getElementById("bind-rest");
            typedEl.textContent = typed;
            restEl.textContent = target.slice(typed.length);
        }

        function typeEndingLine(text, el, speed = 28) {
            el.textContent = "";
            let i = 0;
            const id = setInterval(() => {
                el.textContent += text.charAt(i++);
                if (i >= text.length) clearInterval(id);
            }, speed);
        }

        function resetToBasilica() {
            // Hide binding scene, stop awakened, (optionally) resume hymn at a whisper
            const scene = document.getElementById("binding");
            scene.classList.remove("active");
            scene.setAttribute("aria-hidden", "true");
            document.body.classList.remove("binding");

            try { fadeAudio(audAwakened, 0, 1000); } catch { }
            // optional: resume hymn very quietly
            // try { audHymn.volume = 0; audHymn.play(); fadeAudio(audHymn, 0.12, 1200); } catch {}
        }


        function lightParchCandle(i) {
            const c = document.querySelectorAll("#bind-candles .parch-candle")[i];
            if (c) c.classList.add("lit");
        }

    }
})();


