// waveformProcessing-nogit.js
//
// <PLUGIN MOD>
// Sort of from template for Plugin, modified, comments added as needed
// See also: README-Plugins.md

const path  = require('path');
const fs    = require('fs');

// Not (below) needed since this module (parent) calls a child module in fork that accesses the dll via edge-cs
//var edge = require('electron-edge-js');

// "nogit" added to names just to ensure this sample file not included in the repo, matching .gitignore directive
const pluginName = "waveformProcessing";      // Any name for identification on logs eg
//const libName = "PluginLibrary";                  // Actual lib dll filename without extension

// If any additional files needed, define here and implement the check that they are present
const optionsFilename = 'processing-options.json'
const optionsSubdir = ''; // 'user-data'; // leave blank for file living right next to the wrappers in the plugins dir

// If any additional child wrappers needed, define them, and maybe implement presence checking
const childWrapperFilename = 'waveformProcessingChild.js';

// Use path join and __dirname etc for auto-handling the plugins path in dev vs deploy
// and thus might be in project root (relative) or in asar / unpacked etc.
// __dirname uses the directory that this wrapper file lives in - so it will include the
// plugins directory in its path
// Not needed since this is a parent wrapper that doesn't load the dll
// For testing purposes, add this and related library check functions into the child function
//const libFileName = `${libName}.dll`;
//const libPath = path.join(__dirname, libFileName);
// etc

// If there are extra files to load into this wrapper
// CAUTION: double check this logic if opting to use non-plugins/same root or alt directory
const optionsPath = path.join(__dirname, optionsSubdir, optionsFilename);

// Any child wrappers create path and optionally check for presence
const childWrapperPath = path.join(__dirname, childWrapperFilename);

// CAUTION / NOTES on paths also: 3 example contexts may create different __dirname realities:
// 1. wrappers and dlls live in plugins, not root directory, but are included during dev and bundling
// 2. Same as (1) but package is bundled into asar, with plugins as --asar.unPacked=plugins
// 3. Same as (1) or (2) but are NOT included during dev and packaging
// Probably additional path logic needed
// Module includes, like the child wrapper's electron-edge-js, seems effected by conditions above
// and may require more explicit / specific path handling

// Not required in testing so far - dlls all together, edge_native dll context
//process.env.EDGE_APP_ROOT = path.join(__dirname);

// </PLUGIN MOD>


const { fork } = require('child_process');

class ProcessWaveform {
  constructor ({
      numChannels = 1,
      thicknessElementName = '',
      processingOptionsFile = ''
    } = {}) {
      console.log("ProcessWaveform constructor");
      this.numChannels = numChannels;
      this.thicknessElementName = thicknessElementName;
      this.processingOptionsFile = processingOptionsFile;

      // <PLUGIN MOD>
      // Events - for all plugins
      this.ev = null;

      // Create null var at this level of scope
      this.wf_child = null;

      // For use in delayed/triggered init and for checking for existence,
      // if desired to implement that check on file presence - idealy also,
      // this wrapper encapsulates the file as it always lives in the same place
      // not yet handled by custom relocation options
      this.processingOptionsFile = optionsPath;

      // Is the library present or should we just create a pretend function to be called
      // Not needed or implemented further since parent wrapper doesn't use the dll
      //this.libPresent = false;
      //this.theMainEdgeFunction = null;
      // </PLUGIN MOD>

      // run this as a forked child process, otherwise everything hangs up during wf processing
      // <PLUGIN MOD> Moving this inside Init function
      // this.wf_child = fork('./plugins/waveformProcessingChild-nogit.js', [processingOptionsFile, numChannels]);
      // this.wf_child.on('message', (msg) => {
      //   // the child process should be sending new thicknes values as a hash: "Channel", "Thickness", "Rms"
      //   this.UpdateThickness(msg);
      // });

      this.Init = () => {
        //console.log(`Init: ${__filename}: ${optionsPath} ${childWrapperPath}`);
        //this.wf_child = fork('./plugins/waveformProcessingChild-nogit.js', [processingOptionsFile, numChannels]);
        this.wf_child = fork(childWrapperPath,
          [this.processingOptionsFile, this.numChannels],
           // DEMO ADD - this allows stdio pipe between parent-child for console output to show in UI - see child comments
        );
        this.wf_child.on('message', (msg) => {
          // the child process should be sending new thicknes values as a hash: "Channel", "Thickness", "Rms"
          this.UpdateThickness(msg);
        });
        // DEMO ADD: Added stdout on. handler for logging child to parent for UI console
        this.wf_child.stdout.on('data', (data) => {
          console.log(`${pluginName}: stdout: ${data}`);
        });
        // DEMO ADD: Added stderr on. handler for logging child to parent for UI console (on Win err output even in dev was muted otherwise)
        this.wf_child.stderr.on('data', (data) => {
          console.log(`${pluginName}: stderr: ${data}`);
        });
        console.log(`${pluginName}: this.Init() complete.`)
      } // end of Init
      // </PLUGIN MOD>

      this.UpdateWaveformData = function (ch, wf_data) {
        if (wf_data && wf_data.length > 0) {
          var params = {
            ch: ch,
            wf_data: wf_data
          };
          //console.log(params);
           
          //console.log(`Init: ${__filename}: ${optionsPath} ${childWrapperPath}`);
          
     
          if ( this.wf_child ) { // PLUGIN TEMP MOD: Since start on construction in testing and we need Init first
            this.wf_child.send(params);
          }
        }
      }

      this.UpdateThickness = function (val) {
          if (val.Thickness > 0 && val.Rms > 0)
          {
              console.log("UpdateThickness, thickness element: " + this.thicknessElementName);
              console.log("val: " + JSON.stringify(val));
              $('#' + this.thicknessElementName + (val.Channel - 1).toString()).text("THK: " + val.Thickness.toFixed(5) + ", RMS: " + val.Rms.toFixed(1));
              $('#' + this.thicknessElementName).text("THK: " + val.Thickness.toFixed(5) + ", RMS: " + val.Rms.toFixed(1));
          }
      }

      this.Start = function() {
        console.log("ProcessWaveform Start");
        this.wf_child.send('start');
      }
      this.Stop = function() {
        console.log("ProcessWaveform Stop");
        this.wf_child.send('stop');
      }



      // <PLUGIN MOD>
      this.Ident = function() {
          return pluginName;
      } // end of this.Ident

      this.SetEv = (em) => {

        this.ev = em;

        this.ev.on("dataSetReady", (data) => {
            this.UpdateWaveformData( data.chan, data.wf );
        });

        // This plugin subscribes to the rawWaveformProcessing data available event
        this.ev.on('initRawWaveformProcessing', (data) => {
            // In addition to the constructor, in the wrapper class, add an init function
            // The wrapper itself encapsulates the knowledge of what processingOptionsFile to use
            console.log(`${pluginName}: numChannels: ${data.numChannels}`);
            console.log(`${pluginName}: returnDataElementBaseName: ${data.returnDataElementBaseName}`);
            this.numChannels = data.numChannels;
            this.thicknessElementName = data.returnDataElementBaseName;
            this.Init();
        });

        console.log(`SetEv called for ${pluginName}`);

      }
      // </PLUGIN MOD>

  } // end of contructor

} // end of class ProcessWaveforms

module.exports = {
  Plugin: ProcessWaveform // PLUGIN MOD: Add: "Plugin : "" to expose the plugin's class generically as Plugin
};
