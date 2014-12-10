// stick everything inside a namespace because of paranoia
if (typeof VIZ == "undefined" || !VIZ) {
  var VIZ = {
    windowDiv: '#visualisation',
    windowCount: 0
  };
}

// Given a location for inserting the chart and which probes to listen to generate a chart
// TODO: these parameters could be managed better
VIZ.genChart = function(probeLabelList, label, probeDispatch, windowHeight, windowWidth, displayedDataSize){

  // In case we forget the 'new' keyword
  if ( !(this instanceof VIZ.genChart) ) {
    return new VIZ.genChart(selector, probeLabelList, label, probeDispatch);
  }

  self = this //necessary so that code can still work while changing contexts
  self.windowHeight = windowHeight;
  self.windowWidth = windowWidth;
  self.selector = "#chart-window-"+VIZ.windowCount;
  $(VIZ.windowDiv).append("<div id='chart-window-"+VIZ.windowCount+"'>");
  VIZ.windowCount += 1;
  // Will "this" still work here?
  self.container = $(self.selector).window({
    width: self.windowWidth,
    height: self.windowHeight,
    resizeStop: function(event, ui){
      self.windowWidth = ui.size.width;
      self.windowHeight = ui.size.height;
      self.draw();
    }
  });

  // The fact that we're copying the data to each chart feels weird.
  self.chartInputs = probeLabelList; //Probes to listen to
  self.label = label;

  self.init(displayedDataSize);
  self.draw();
}

// These are functions that other charts might want to modify
VIZ.genChart.prototype = {
  
  init: function(displayedDataSize){
    self.n = 100; // TODO: rename this variable
    self.chartData = Array.apply(null, Array(displayedDataSize)).map(Number.prototype.valueOf,0);
  },

  draw: function(){
    // TODO: How to set these ranges according to the expected output? 
    // How did Javaviz do it?
    // Was it based off the radius?
    var margin = {top: 20, right: 20, bottom: 20, left: 40},
      width = self.windowWidth - margin.left - margin.right,
      height = self.windowHeight - margin.top - margin.bottom;

    // Domain is the minimum and maximum values to display on the graph
    // Range is the mount of SVG to cover
    // Get passed into the axes constructors
    // TODO: better names for these variables
    self.xAxisScale = d3.scale.linear()
        .domain([0, self.n - 1])
        .range([0, width]);
    
    var yAxisScale = d3.scale.linear()
        .domain([-30, 30])
        .range([height, 0]);
     
    // gets a set of x and y co-ordinates from our data
    self.line = d3.svg.line()
        // sets the x value to move forward with time
        .x(function(data, index) { return self.xAxisScale(index); })
        // sets the y value to just use the data y value
        .y(function(data, index) { return yAxisScale(data); });

    // Remove previously rendered graph
    d3.select(self.selector).selectAll("*").remove();

    var svg = d3.select(self.selector).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    svg.append("defs").append("clipPath")
        .attr("id", "clip")
      .append("rect")
        .attr("width", width)
        .attr("height", height);

    // create the x and y axis // the number of ticks for this can be a bit silly
    // how to improve?

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + yAxisScale(0) + ")") // code for moving the x axis as it updates
        .call(d3.svg.axis().scale(self.xAxisScale).orient("bottom"));

    svg.append("g")
        .attr("class", "y axis")
        .call(d3.svg.axis().scale(yAxisScale).orient("left"));

    self.path = svg.append("g")
        .attr("clip-path", "url(#clip)") // limit where the line can be drawn
      .append("path")
        .datum(self.chartData) // chartData is the data we're going to plot
        .attr("class", "line")
        .attr("d", self.line); // This is to help draw the sgv path

    probeDispatch.on(("probeLoad."+self.label), self.probeParse);
  },

  probeParse: function(probeData, simTime) {
    // Filter until you have only the desired data
    // TODO: Make this work for multiple probes

    // Loop through each of the inputs you want to plot
    self.chartInputs.forEach(function(input) {
          // Remove the old data
        self.chartData.shift();
        self.chartData.push(probeData[input].data[0]);
    });

    // Then update the path
    self.path
      .attr("d", self.line)
      .attr("transform", null)
    .transition()
      .duration(0.1) // is it the duration of the transition?
      .ease("linear") // this is just to say that the speed of the line should be constant
      .attr("transform", "translate(" + self.xAxisScale(-1) + ",0)");
  }
}

// taskbar has to be created first before creating any windows
$( ".taskbar" ).taskbar();

var probeDispatch = d3.dispatch("probeLoad");


new VIZ.genChart(["prod_probe"], "foo", probeDispatch, 500, 400, 40);


// Trying desperatly to imitate reading from web socket
var lines;
var parse_timer;
var line_count = 0;

function parse_dispatch(){
  tmp_d = $.parseJSON(lines[line_count]);
  console.log("parsed");
  $("#simulation #time").text(tmp_d.data.t.toFixed(3));
  probeDispatch.probeLoad(tmp_d.data.probes, tmp_d.data.t);
  line_count += 1;
  if(line_count >= lines.length){
    //line_count = 0
    window.clearInterval(parse_timer);
  }
}

$.get('static/messages.json', function (data) {
  lines = data.split("\n");
  parse_timer = window.setInterval(function () {parse_dispatch()}, 50);
}, 'text');