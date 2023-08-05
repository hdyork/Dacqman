// waveformProcessingChild-nogit.js
// With PLUGIN mods, demos, comments

var path = require('path');
var edge = require('electron-edge-js');

// <DEMO MOD>
// NOTE: The modifications here are not necessarily required for a DacqMan plugin.
// Rather, they are included to be able to test the parent-child plugin without 
// having the actual dll library in place, and look at the inclusion of tests 
// that indicate library presence or absence. 
//
// NOTE: Also demonstrated (played around with), sending console log messages back to the parent so that 
// they show in the UI devTools Console.  In some cases here, the execution 
// context is different, so the console log output by default would go to the 
// command line if launched in dev mode by eg npm start. Take that with a grain 
// of salt, aka, so far in quick dev that is the case.
// UPDATE: Turns out that explicit setting up of parent message is possible but not necessary.
// The calling parent wrapper can just set silent=true and response to stdout and stderr
// </DEMO MOD>

// <DEMO MOD>
// Included just for if/when the library is not present 
// to allow the program to load generally
// Option in place here could create an alternate edge replacement function for loopback.
var fs = require('fs');
const libName = "BsiUtDataAnalysis";
const libFileName = `${libName}.dll`;
const libPath = path.join(__dirname, libFileName); // in dev it will be ./plugins and in packaged w/ asar: app.asar.unpacked/plugins/
// Please see path notes in the parent wrapper - regarding packaged, un/packed, drop-in contexts for caution here
var libPresent = false;

// Not needed in testing here (specific dll, edge_native) - keeping reference to this in case future benefits
//process.env.EDGE_APP_ROOT = path.join(__dirname);

if ( !fs.existsSync(libPath) ) {
  // console.log goes to command line if running in dev (aka npm start)
  // unless running in silent / stdio pipe modes
  console.log(`Not found: ${libPath} returning from wrapper load, or setting up test alt edge function.`); 
  //return false; // uncomment to just terminate execution - or leave commented to try dummy function for sim
} else {
  libPresent = true;
  console.log("Child: LibPresent = true")
}

if ( libPresent ) {
  var processWf = edge.func({                               // Original def
    // <PLUGIN MOD>
    // Original def is commented; replaced with libPath for PLUGIN MOD
    // See path notes in parent wrapper comments 
    // Oddly, unpacked, wrapper included in dev and then packaged, resolve returns root project directory 
    // which = crash
    assemblyFile: libPath, // path.resolve('BsiUtDataAnalysis.dll'),   
    // </PLUGIN MOD>
    typeName: 'BSI.UT.DataAnalysis.StartUp',                // Original def
    methodName: 'ProcessWaveform'                           // Original def
  });
} else {
  var processWf = (params) => {
    var res = {
      Channel: params.ch,
      Thickness: 0.5001,                                    //result.Thickness,
      Rms: 1.0001                                           //result.Rms
    };
    // this will actually go to the command line when launched by npm start (macos only?)
    // unless implement a message back or as demo'd here using stdout
    //console.log("processWf"); 
    //console.log(JSON.stringify(params));
    process.send(res);
    //return res;
  }
}
// </DEMO MOD>


console.log(process.argv);

// child process fork is initialized with args: processing options filename, number of channels
// access args in process.argv
// first two items are other things, our args start at the 3rd item, index=2
// index = 2: processing options filename
// index = 3: number of channels

// stop the processing loop after this long without receiving new data
const timeout = 10; // sec
var startTime = new Date().getTime(); // time last data was receieved (stop loop at startTime + timeout)

// processing loop is a setInterval, this is the variable for that
var continuousProcessWaveform = null;

// Number of channels given in process.argv at index = 3. Default to one.
var numChannels;
if (process.argv[3] === undefined) { numChannels = 1; }
else { numChannels = Number.parseInt(process.argv[3]); }
console.log("numChannels: " + numChannels);

// Current waveform for each channel
var current_wf = [];
for (var i = 0; i < numChannels; i++) {
  current_wf.push(null);
}

// the channel currently being processed in the processing loop
var current_ch;

// <DEMO MOD> Added the conditional libPresent to sim / test
if ( libPresent ) {

  // processing options json from file
  var processingOptionsJson = require(process.argv[2]);
  console.log(processingOptionsJson);

  // Sample frequency in Hz is given in process.argv at index = 2. Default to null (will use IMPACT default, 35 MHz).
  var sampleF = parseInt(processingOptionsJson.sampleFrequencyHz);
  console.log("sampleF: " + sampleF);

  // calibration waveform and algo props files from processing options file
  var cals = processingOptionsJson.calWaveFiles;
  var algos = processingOptionsJson.algoPropsFiles;

} // </DEMO MOD>

// Process the current waveform for the given channel number, and return the result to the parent process.
var processWaveform = function(ch) {
  if ( libPresent ) {                               // <DEMO MOD />
    var params = {
      data: current_wf[ch],
      fsample: sampleF,
      algo_props: algos["xd" + ch.toString()],
      cal_wf: cals["xd" + ch.toString()]
    };
  // <DEMO MOD>
  } else {                                          
    var params = {
      data: null,
      fsample: 40,
      algo_props: "algo_props",
      cal_wf: "cal_wf",
      ch: current_ch
    }
    console.log(JSON.stringify(params));
  }
  // </DEMO MOD>
  processWf(params, function(err, result) {
    if (err) {
    	throw err;
    } else {
    	console.log(result);
      var res = {
        Channel: ch,
        Thickness: result.Thickness,
        Rms: result.Rms
      };
      process.send(res);
    }
  });
}

// start the processing loop
var startProcessing = function() {
  startTime = new Date().getTime();
  current_ch = 1;
  continuousProcessWaveform = setInterval(function() {
    // loop through the channnels, processing the current wf for that channel
    if (new Date().getTime() - startTime > timeout * 1000 ) {
      stopProcessing();
      return;
    }
    processWaveform(current_ch);
    current_ch++;
    if (current_ch > numChannels) { current_ch = 1; }
  }, 500);
}

// stop the processing loop
var stopProcessing = function() {
  clearInterval(continuousProcessWaveform);
  continuousProcessWaveform = null;
}

// receiving data from the parent process
process.on('message', (msg) => {
  if (msg === 'start') { // the parent manually starts the processing loop
    if (continuousProcessWaveform === null) { startProcessing(); }
  } else if (msg === 'stop') { // the parent manually stops the processing loop
    stopProcessing();
  } else { // receiving a new waveform
    // new waveform is sent as a hash - "ch" is channel number, "wf_data" is the waveform data
    // it seems that sometimes wf_data arrives as a hash object with data in a "data" sub-field
    // and sometimes wf_data is just an array and can be used as-is
    if (msg.wf_data.data !== undefined) {
      current_wf[msg.ch] = msg.wf_data.data;
    }  else {
      current_wf[msg.ch] = msg.wf_data;
    }
    if (continuousProcessWaveform === null) {
      startProcessing(); // if not already running, start now
    } else {
      startTime = new Date().getTime(); // if already running, reset timeout
    }
  }
});