// References (oh, so many):
//
// Lovely tutorial:
// https://www.dashingd3js.com/creating-svg-elements-based-on-data
// Additional lovely references:
// https://github.com/bignerdranch/music-frequency-d3/blob/master/app.js
// https://www.bignerdranch.com/blog/music-visualization-with-d3-js/
// http://square.github.io/crossfilter/
// http://christopheviau.com/d3list/gallery.html
// https://stackoverflow.com/questions/18244995/d3-how-to-show-large-dataset
// https://ff.cx/banksafe/
// https://www.developer.com/java/fun-with-d3.js-data-visualization-eye-candy-with-streaming-json.html
// https://bl.ocks.org/boeric/6a83de20f780b42fadb9
// https://www.freecodecamp.org/news/d3-and-canvas-in-3-steps-8505c8b27444/
// https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteFrequencyData
// https://developer.mozilla.org/en-US/docs/Web/API/Window/cancelAnimationFrame
// https://stackoverflow.com/questions/13230487/converting-a-buffer-into-a-readablestream-in-node-js
// https://github.com/samcday/node-stream-buffer
// https://nodejs.org/api/stream.html
// https://www.npmjs.com/package/stream-buffers
//
// Excellent d3 zoom how-to type of manual along with svg vs canvas (or mixed)
// https://www.freecodecamp.org/news/get-ready-to-zoom-and-pan-like-a-pro-after-reading-this-in-depth-tutorial-5d963b0a153e/
// https://github.com/larsvers/Understanding-Zoom/blob/master/zoom_step_01.html
//
// d3 and semantic zoom behavior of the drawn lines:
// https://www.dashingd3js.com/lessons/d3-zoom-for-svg-lines-and-svg-paths-part-two



// Now we convert to an "Object"


function DataChart({
  parentElementIdName = 'chart',
  chartBuffer = Buffer.alloc(4095,64),
  title = "",
  dataLen = 4095
} = {}) {
  // Default params for ES >= 6 or 2015

  var doRenderLoops = false;
  var freshData = false;

  this._parentElementIdName = parentElementIdName;
  this._reqId = null;
  this._chartBuffer = chartBuffer;
  this._dataLen = dataLen; // 4095;
  this._context = null;

  //_self = this;

   // Get the dimensions of the parent element
   var parentElement = document.getElementById(parentElementIdName);
   var parentWidth = parentElement.clientWidth;

  // For tall graphs, use for 500 chartHeight below, with the .canvas-container-tall class instead of .canvas-container class
  var chartHeight = 300 //500 // was 300 // The larger height chart aka 500 goes along with the 560px width change in the custom.css until better implemented
  var chartWidth = 900
  var _margin = 20
  var margin = {top: _margin, right: _margin, bottom: _margin, left: _margin}
    , width = chartWidth - margin.left - margin.right // Use the window's width
    , height = chartHeight - margin.top - margin.bottom; // Use the window's height

  var strokeWidth = 1;

  // Create a canvas element
  var canvasContainer = d3.select('#' + this._parentElementIdName)
  .append("div")
  .classed("canvas-container", true)
  .style("position", "relative")
  .style("width", "100%")
  .style("height", "0")
  .style("padding-bottom", "33.33%"); // This sets the aspect ratio

  var canvas = canvasContainer
    .append("canvas")
    .classed("canvas-content-responsive", true)
    .style("position", "absolute")
    .style("width", "100%")
    .style("height", "100%")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .node();
  
  // Get the context
  this._context = canvas.getContext('2d');
  // Translate the context to respect the margins
  //this._context.translate(margin.left, margin.top);

  console.log("New bigWfDataChart for id name: " + this._parentElementIdName);
  console.log(this._chartBuffer.length);

  // Please See:
  // https://stackoverflow.com/questions/57007378/d3-zoom-and-drag-with-svg-axes-and-canvas-chart
  // As to why we are specifying all three of these below:
  var zoom;
  zoom = d3.zoom()
    .scaleExtent([1, 10])
    // The pair of the next two together is what allows us the sensible
    // implementation of zoom and pan extents:
    //              [[left, top] , [right, bottom]]
    .translateExtent([[0,0],[chartWidth, chartHeight]])
    .extent([[0,0],[chartWidth, chartHeight]])
    .on("zoom", function(event) {
      // This is the zoom event handler
      // event.transform contains the current zoom transform
      currentTransform = d3.event.transform;

      // Adjust the transform to account for the margins
      // currentTransform = currentTransform.translate(margin.left + margin.right, 0);

      // Redraw the chart with the new transform
      redraw(currentTransform);
    });




  // The number of datapoints
  //var n = 4095;
  var n;
  n = this._dataLen;

  //
  var xScale;
  xScale = d3.scaleLinear()
      .domain([0, n-1]) // input
      .range([25, width]); // output

  //
  var yInputMaxVal = 255;
  var yScale; 
  yScale = d3.scaleLinear()
      .domain([0, yInputMaxVal]) // input
      .range([height - 15, 0]); // output

  this._xPos = function(d, i) {
    return xScale(i); // xScale is a D3 scale
  };
  
  this._yPos = function(d) {
    return yScale(d); // yScale is a D3 scale
  };

  // Add some high freq low amp overlay to test semantic zoom
  // over geometric zoom ...
  var dataset = [];
  var j;
  var big;
  var little;
  for ( j = 0; j < n; j++ ) {
    big = 126 * Math.sin(2*3.14159/n*j*4) + 127;
    little = 2 * Math.sin(2*3.14159/n*j*800+2);
    dataset.push(big + little);
  }

  // Set up the canvas to be responsive and handle zoom and double-click events
  d3.select(canvas)
    .call(zoom)
    .on("dblclick.zoom", null) // cancels double-clicking to zoom
    .on("dblclick", ourDlbClick);

  // The chart body will be drawn directly on the canvas using the context

  var drawChart = (function(newXScale, newYScale) {

    // Y-axis minor grid lines
    for (let i = 0; i <= 255/5; i++) {
      if(i % 4 == 0 && i != 0) continue; // skip major grid lines
      let y = newYScale(i * 5) + margin.top;
      let x = newXScale(0) + margin.left;
      this._context.beginPath();
      this._context.moveTo(x, y);
      this._context.lineTo(width, y);
      this._context.strokeStyle = 'grey';
      this._context.lineWidth = 0.2;
      this._context.stroke();
    }
  
    // Y-axis major grid lines
    this._context.font = "8px Arial"; // Set the font size and family
    this._context.textAlign = "right"; // Align the text to the right
    this._context.textBaseline = "middle"; // Align the text vertically in the middle
  
    for (let i = 0; i <= 255/20; i++) {
      let y = newYScale(i * 20) + margin.top;
      let x = newXScale(0) + margin.left;
      this._context.beginPath();
      this._context.moveTo(x - 25, y);
      this._context.lineTo(width, y);
      this._context.strokeStyle = 'grey';
      this._context.lineWidth = 0.5;
      this._context.stroke();
      this._context.fillStyle = 'white';  // Set the text color to white
  
      // Add a label to the line
      let label = (i * 20); // Start at 0 and count up by 20 each line
      this._context.fillText(label, x - 25, y);
    }

    // X-axis labels
    for (let i = 0; i <= 4095/500; i++) {
      let x = newXScale(i * 500);
      let y = newYScale(0) + margin.top;

      if(i == 0) continue; // skip first label
      this._context.beginPath();
      this._context.moveTo(x - 25, y);
      this._context.lineTo(x - 25, y + 15);
      this._context.strokeStyle = 'grey'; // Set the line colour to grey
      this._context.lineWidth = 0.5; // Set the line width to 0.5 pixels
      this._context.stroke(); // Apply the stroke
      this._context.textAlign = "center"; // Align the text to the right
      this._context.fillStyle = 'white';  // Set the text color to white

      // Add a label to the line
      let label = i * 500; // Start at 0 and count up by 500 each line
      this._context.fillText(label, x - 25, y + margin.bottom);
    }

    let x = newXScale(0) + margin.left;
    let y = newYScale(0) + margin.top;

    // Y-axis
    this._context.beginPath();
    this._context.moveTo(x, y);
    this._context.lineTo(x, margin.top);
    this._context.strokeStyle = 'grey';
    this._context.lineWidth = 1;
    this._context.stroke();
  
    // X-axis
    this._context.beginPath();
    this._context.moveTo(x, y);
    this._context.lineTo(newXScale(4095) + margin.left, y);
    this._context.strokeStyle = 'grey';
    this._context.lineWidth = 1;
    this._context.stroke();
  
    // Draw data line
    this._context.beginPath();
    dataset.forEach((d, i) => {
      var x = newXScale(i) + margin.left;
      var y = newYScale(d) + margin.top;
      this._context.lineWidth = 1;
      this._context.strokeStyle = '#ffab00'; // match .line stroke color
      if (i === 0) {
        this._context.moveTo(x, y);
      } else {
        this._context.lineTo(x, y);
      }
    });
    this._context.stroke();
  }).bind(this);

  drawChart(xScale, yScale);

  // Set the stroke width
  this._context.lineWidth = strokeWidth;

  // Begin the path
  this._context.beginPath();

  // Stroke the path
  this._context.stroke();

  let rebuildChart = () => { // was function rebuildChart(that) {}

    //var xScale;
    //that.n = that.dataLen;
    //n = that._dataLen;
    n = this._dataLen;
    xScale = d3.scaleLinear()
        .domain([0, n-1]) // input
        .range([0, width]); // output

    // Add some high freq low amp overlay to test semantic zoom
    // over geometric zoom ...
    console.log("rebuildChart length: " + n);
    //var dataset = [];
    dataset = [];
    var j;
    var big;
    var little;
    for ( j = 0; j < n; j++ ) {
      big = 126 * Math.sin(2*3.14159/2500.*j*4) + 127; // n => 2500 to add cycles to 4095 from 2500
      little = 2 * Math.sin(2*3.14159/2500.*j*800+2); // same as above
      dataset.push(big + little);
    }
    console.log("dataset len " + dataset.length );

    // Clear the canvas before drawing the line
    this._context.clearRect(0, 0, canvas.width, canvas.height);

    // Generate the line
    drawChart(xScale, yScale);
  }


  // Define a zoom transform
  var zoomTransform = d3.zoomIdentity;
  var currentTransform = zoomTransform;

  // Define a function to redraw the chart
  var redraw = (function(transform) {

    if(transform == null) {
      transform = d3.zoomIdentity;
    }
  
    // Create new scale objects based on the zoom transform
    var newXScale = transform.rescaleX(xScale);
    var newYScale = transform.rescaleY(yScale);
  
    // Clear the canvas
    this._context.clearRect(0, 0, canvas.width, canvas.height);
  
    // Save the current context state
    this._context.save();

      // Apply the transform to the context
    this._context.translate(transform.x, transform.y);
    this._context.scale(transform.k, transform.k);
  
    // Redraw the chart with the new scales
    drawChart(newXScale, newYScale);
  
    // Restore the context state
    this._context.restore();

  }).bind(this);

  // Define a function to reset the zoom
  var resetZoom = (function() {

    // Reset the zoom behavior's state
    d3.select(canvas).call(zoom.transform, d3.zoomIdentity);

    // Redraw the chart
    redraw(d3.zoomIdentity);
  }).bind(this);

  // Define a function to generate a new dataset for testing
  // function generateDataset() {
  //   dataset = [];
  //   var j;
  //   var big;
  //   var little;
  //   for ( j = 0; j < n; j++ ) {
  //     big = 126 * Math.sin(2*3.14159/2500.*j*4) + 127; // n => 2500 to add cycles to 4095 from 2500
  //     little = 2 * Math.sin(2*3.14159/2500.*j*800+2); // same as above
  //     dataset.push((big + little) * Math.random());
  //   }
  //   return dataset;
  // }

  function ourDlbClick() {
    
    resetZoom();

    // TODO BUG there is still a bug where after reset, the next (scroll wheel at least)
    // attempt to zoom snaps right back to the last transform/zoom and thus doesn't make
    // any UI sense ...
    // Probably just add some capture and assign?


  }

  async function update(newdata) {
    // Update the data
    dataset = newdata;
  
    // Redraw the chart
    redraw();
  }





  //var reqId;

  this.RenderChart = function() {
    console.log("this.RenderChart " + this._parentElementIdName);
    doRenderLoops = true;
    renderChart();
  }

  let renderChart = () => {

    try {
      //console.log("doRenderLoops: " + doRenderLoops);
      if ( doRenderLoops === true ) {
        reqId = requestAnimationFrame(renderChart);
        //console.log("reqId for " + parentElementIdName + ": " + reqId);
      }

      if ( freshData === true ) {

        var thisStrokeWidth = strokeWidth;
        if ( currentTransform ) {
          thisStrokeWidth = strokeWidth / currentTransform.k;
        }

        // Clear the canvas
        this._context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Save the current context state
        this._context.save();
        
        // Apply the zoom transform
        this._context.translate(currentTransform.x, currentTransform.y);
        this._context.scale(currentTransform.k, currentTransform.k);
        
        // Adjust the stroke width based on the zoom level
        this._context.lineWidth = thisStrokeWidth;
        
        // Draw the chart
        dataset = this._chartBuffer;
        this._context.beginPath();
        drawChart(xScale, yScale);
        this._context.stroke();
        
        // Restore the context state
        this._context.restore();

          freshData = false;
          //console.log('freshData = false');

      } // freshData
    } catch ( e ) {
      console.log(this._parentElementIdName + ": Error in renderChart: " + e + " calling cancelRenderChart() ");
      cancelRenderChart();
    }

  }

  // Instead of:
  // DataChart.prototype.CancelRenderChart ...
  // So that we can have private and public style function access
  this.CancelRenderChart = function() {
    console.log("Chart: " + this._parentElementIdName + ": cancelRenderChart req.id: " + reqId);
    doRenderLoops = false;
    cancelRenderChart();
  }

  function cancelRenderChart() {
    //console.log("Chart: " + parentElementIdName + ": cancelRenderChart req.id: " + reqId);
    cancelAnimationFrame(reqId);
    //console.log("cancelAnimationFrame result: " + r)
  }


  // Option in place here:
  // Highlight the chart when new data is added, allowing the last update to
  // fade out within 1000 ms - such that if no new data, chart background
  // fades out
  this.flashColorTimeoutId; //= []; // TODO list / array ???
  let fadeOutMs = 1000;
  let timingMs = 500; // 500 ok for no flash missed for RS8 chan scan
  // was 1000 but in RS8 currently getting every other - haven't debugged yet - is it the 8 chan thing?
  // for DCF mode - or maybe we like the every other - easier on the brain?
  // Ok I think what is happening:
  // class is set for the flash color and the setTimeout is set 
  // the setTimeout starts firing and fading the color out 
  // but it takes long enough that the clearTimeout doesn't stop the fadeOut in progress 
  // so even if the class was added again it gets removed once the fadeout stops - or similar
  // Hence using a shorter time for the setTimeout specific to hardware maybe or just test for 
  // all seems a reasonable solution without getting more complicated 
  // Or even allowing the skip might be easier on the brain.
  // TODO still need to VFY what is happening with Chs 5 - 8 in DCF-UI
  this.UpdateChartBuffer = function(newBuffer) {
    //console.log(`${this._parentElementIdName} ${$('#' + this._parentElementIdName).attr('class')}`)
    //$('#' + this._parentElementIdName).removeClass("flash-color");
    $('#' + this._parentElementIdName).addClass("flash-color");
    if ( this.flashColorTimeoutId ) {
      //this.flashColorTimeoutId.forEach( function(v) {
        //console.log(`clearing flashColorTimeoutId ${this.flashColorTimeoutId}`);
        clearTimeout(this.flashColorTimeoutId);
      //});
      //this.flashColorTimeoutId = [];
      // console.log(`clearing flashColorTimeoutId ${this.flashColorTimeoutId}`);
      // clearTimeout(this.flashColorTimeoutId);
      //$('#' + this._parentElementIdName).removeClass("flash-color"); // testing - in case still there?
    }
    //let tid;
    this.flashColorTimeoutId = setTimeout( () => {
    //tid = setTimeout( () => {
      //console.log(`${this._parentElementIdName} ${$('#' + this._parentElementIdName).attr('class')}`);
      $('#' + this._parentElementIdName).removeClass("flash-color", fadeOutMs) // was 1000 - but add again a little easier on the eyes
    }, timingMs); // was 1000
    //this.flashColorTimeoutId.push(tid);
    //console.log(`flashColorTimeoutId ${this.flashColorTimeoutId}`);
    // Adding 2023 Q1 -- too long?
    if ( this._dataLen > this._chartBuffer.length ) {
      this._chartBuffer = Buffer.alloc(this._dataLen, 64);
    }
    // End of Add
    newBuffer.copy(this._chartBuffer, 0, 0, this._dataLen); // was testing for DLITE at 2400 // TODO hardware dependent --  4096); // was 4096
    //console.log("this._dataLen " + this._dataLen + " for " + this._parentElementIdName);
    //console.log("this._chartBuffer length " + this._chartBuffer.length + " for " + this._parentElementIdName);
    freshData = true;
  }





  let perGraphAudioIndicator = $(document.createElement("img"))
      .addClass("sound-indicator")
      .attr("src", "./assets/icon-audio-wave-50-wh.png")
      .attr("alt", "Playing Now")
      ;

  this.soundPlayingTimeoutId; // TODO list / array
  this.ShowPlayingSound = function(timeoutMs) {
    // let i = $(document.createElement("i"))
    // .text("play_circle_filled")
    // .addClass("material-icon")
    // ;
    // let i = $(document.createElement("img"))
    //   .addClass("sound-indicator")
    //   .attr("src", "./assets/icon-audio-wave-50-white.png")
    //   .attr("alt", "Playing Now")
    //   ;
    // <img src="./assets/icon-audio-wave-50.png" width="50" height="50" alt="PLAYING"></img>
    (perGraphAudioIndicator).insertAfter($('#' + this._parentElementIdName).parent().find('span')[0]); // append to the parent Channel label
    
    if ( this.soundPlayingTimeoutId ) {
      clearTimeout(this.soundPlayingTimeoutId);
    }
    this.soundPlayingTimeoutId = setTimeout( () => {
      $('#' + this._parentElementIdName).parent().find('.sound-indicator').remove();
    }, timeoutMs);
  }





  this.UpdateChartLength = function(newLength) {
    console.log("this.UpdateChartLength " + newLength);
    this._dataLen = newLength;
    //this.n = newLength;
    this._chartBuffer = Buffer.alloc(newLength, 64);
    rebuildChart(); // was (this)
  }


} // End of Function constructor DataChart(...)









module.exports = DataChart;
/*module.exports = {
  update: update,
  renderChart: renderChart,
  cancelRenderChart: cancelRenderChart,
};*/
