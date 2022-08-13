(function e(t, n, r) {
  function s(o, u) {
    if (!n[o]) {
      if (!t[o]) {
        var a = typeof require == "function" && require;
        if (!u && a) return a(o, !0);
        if (i) return i(o, !0);
        var f = new Error("Cannot find module '" + o + "'");
        throw f.code = "MODULE_NOT_FOUND", f;
      }
      var l = n[o] = { exports: {} };
      t[o][0].call(
        l.exports,
        function (e) {
          var n = t[o][1][e];
          return s(n ? n : e);
        },
        l,
        l.exports,
        e,
        t,
        n,
        r,
      );
    }
    return n[o].exports;
  }
  var i = typeof require == "function" && require;
  for (var o = 0; o < r.length; o++) s(r[o]);
  return s;
})(
  {
    1: [function (require, module, exports) {
      var Synth = require("./synth");

      function main() {
        function registerOscillatorControls(synth, id, oscIndex) {
          var prefix = "osc-" + id;
          var oscControls = document.getElementById(prefix);
          var waveformSelector = document.getElementsByName(
            prefix + "-waveform",
          );
          var slider = document.getElementById(prefix + "-detune");
          var gainSlider = document.getElementById(prefix + "-gain");
          var panSlider = document.getElementById(prefix + "-pan");
          gainSlider.oninput = function (e) {
            var evt = synth.events.gain(oscIndex, Number(e.target.value) / 100);
            synthElement.dispatchEvent(evt);
          };

          panSlider.oninput = function (e) {
            var evt = synth.events.pan(oscIndex, Number(e.target.value) / 100);
            synthElement.dispatchEvent(evt);
          };

          slider.oninput = function (e) {
            var evt = synth.events.detune(oscIndex, e.target.value);
            synthElement.dispatchEvent(evt);
          };
          waveformSelector.forEach(function (i) {
            i.onchange = function (e) {
              var evt = synth.events.waveform(oscIndex, e.target.value);
              synthElement.dispatchEvent(evt);
            };
          });
        }

        function registerOctaveButtons(synth, oscIndex) {
          var buttons = document.getElementsByName(
            "osc-" + (oscIndex + 1) + "-octave",
          );
          buttons.forEach(function (button) {
            button.onchange = function (changeEvt) {
              var evt = synth.events.octave(
                oscIndex,
                Number(changeEvt.target.value),
              );
              synthElement.dispatchEvent(evt);
            };
          });
        }

        function connectKeyboard(synth) {
          var keyboard = "awsedftgyhujkilo".split("");
          keyboard.forEach(function (k, i) {
            const e = document.getElementById("key-" + k);
            if (!e) return;
            e.onmousedown = e.ontouchstart = function (evt) {
              synth.noteOn(60 + i);
            };
            e.onmouseup = e.ontouchend = function (evt) {
              synth.noteOff();
            };
          });
          document.onkeydown = function (e) {
            if (keyboard.indexOf(e.key) != -1) {
              var midiNote = 60 + keyboard.indexOf(e.key);
              synth.noteOn(midiNote);
            }
          };
          document.onkeyup = function (e) {
            synth.noteOff();
          };
        }

        function createSynth() {
          var synth = new Synth(ac, synthElement);
          registerOscillatorControls(synth, "1", 0);
          registerOscillatorControls(synth, "2", 1);
          registerOctaveButtons(synth, 0);
          registerOctaveButtons(synth, 1);
          connectKeyboard(synth);
          return synth;
        }

        var ac, synthElement, synth;
        const start = () => {
          ac = new AudioContext();
          synthElement = document.getElementById("synth");
          synth = createSynth(synthElement);
          synth.start();
          document.querySelector("body").removeEventListener("click", start);
        };
        document.querySelector("body").addEventListener("click", start);
      }

      document.onload = window.onload = main;
    }, { "./synth": 2 }],
    2: [function (require, module, exports) {
      function Synth(ac, element) {
        this._midiNote = 60;
        this.osc1 = createOsc(ac);
        this.osc2 = createOsc(ac);
        this.oscs = [this.osc1, this.osc2];
        if (element) {
          [
            "detune",
            "waveform",
            "gain",
            "pan",
            "octave",
          ].forEach(function (eventType) {
            element.addEventListener(
              eventType,
              function (e) {
                this[eventType](e.detail);
              }.bind(this),
            );
          }.bind(this));
        }
      }

      Synth.prototype.start = function () {
        this.oscs.forEach(function (o) {
          o.gain.value = 0;
          o.osc.start();
        });
      };

      Synth.prototype.stop = function () {
        this.oscs.forEach(function (o) {
          o.osc.stop();
        });
      };

      Synth.prototype._guardOscIndex = function (oscIndex) {
        if (oscIndex < 0 || oscIndex > this.oscs.length) {
          throw new Error("Invalid oscillator specified: " + oscIndex);
        }
      };

      Synth.prototype.waveform = function (opts) {
        this._guardOscIndex(opts.oscIndex);
        this.oscs[opts.oscIndex].osc.type = opts.waveform;
      };

      Synth.prototype.detune = function (opts) {
        this._guardOscIndex(opts.oscIndex);
        this.oscs[opts.oscIndex].osc.detune.value = opts.cents;
      };

      Synth.prototype.pan = function (opts) {
        this._guardOscIndex(opts.oscIndex);
        this.oscs[opts.oscIndex].pan.value = opts.value;
      };

      Synth.prototype.octave = function (opts) {
        this._guardOscIndex(opts.oscIndex);
        this.oscs[opts.oscIndex]._octave = opts.value;
      };

      Synth.prototype.gain = function (opts) {
        this._guardOscIndex(opts.oscIndex);
        var osc = this.oscs[opts.oscIndex];
        osc._gain = opts.value;
        osc.gain.value = opts.value;
      };

      Synth.prototype.noteOn = function (midiNote) {
        this._midiNote = midiNote;
        this.oscs.forEach(function (o) {
          var actualNote = midiNote + (12 * o._octave);
          o.osc.frequency.value = frequencyFromNoteNumber(
            actualNote,
          );
          o.gain.value = o._gain;
        });
      };

      Synth.prototype.noteOff = function () {
        this.oscs.forEach(function (o) {
          o.gain.value = 0;
        });
      };

      Synth.prototype.events = {
        detune: function (oscIndex, cents) {
          return new CustomEvent("detune", {
            detail: {
              oscIndex: oscIndex,
              cents: cents,
            },
          });
        },
        waveform: function (oscIndex, waveform) {
          return new CustomEvent("waveform", {
            detail: {
              oscIndex: oscIndex,
              waveform: waveform,
            },
          });
        },
        gain: function (oscIndex, value) {
          return new CustomEvent("gain", {
            detail: {
              oscIndex: oscIndex,
              value: value,
            },
          });
        },
        pan: function (oscIndex, value) {
          return new CustomEvent("pan", {
            detail: {
              oscIndex: oscIndex,
              value: value,
            },
          });
        },
        octave: function (oscIndex, value) {
          return new CustomEvent("octave", {
            detail: {
              oscIndex: oscIndex,
              value: value,
            },
          });
        },
      };

      function createOsc(ac) {
        var osc = ac.createOscillator();
        var gain = ac.createGain();
        gain.gain.value = 0.1;
        var pan = ac.createStereoPanner();
        osc.type = "sawtooth";

        osc.connect(gain);
        gain.connect(pan);
        pan.connect(ac.destination);
        return {
          osc: osc,
          gain: gain.gain,
          pan: pan.pan,
          _gain: 0.1,
          _octave: 0,
        };
      }

      function frequencyFromNoteNumber(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
      }

      module.exports = Synth;
    }, {}],
  },
  {},
  [1],
);
