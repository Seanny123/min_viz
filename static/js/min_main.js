// stick everything inside a namespace to avoid conflicts with different scripts
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

  // the next line is necessary so that code can still work while 
  // changing contexts, for example while in the window constructor
  var self = this
  self.windowHeight = windowHeight;
  self.windowWidth = windowWidth;
  this.label = label;
  self.selector = "#chart-window-"+VIZ.windowCount;

  // Create the window object which holds the chart
  $(VIZ.windowDiv).append("<div id='chart-window-"+VIZ.windowCount+"'>");
  VIZ.windowCount += 1;
  self.container = $(self.selector).window({
    width: self.windowWidth,
    height: self.windowHeight,
    title: label,
    // subcribe to the resize event so that we can resize the chart
    resizeStop: function(event, ui){
      self.windowWidth = ui.size.width;
      self.windowHeight = ui.size.height;
      self.draw(self);
    }
  });

  self.chartInputs = probeLabelList; //Probes to listen to

  self.init(displayedDataSize);
  self.draw(self);
};

// These are the default functions that other charts might want to modify
VIZ.genChart.prototype = {
  
  // initialize the chart
  init: function(displayedDataSize){
    this.n = 100; // TODO: rename this variable
    this.chartData = Array.apply(null, Array(displayedDataSize)).map(Number.prototype.valueOf,0);
    probeDispatch.on(("probeLoad."+this.label), this.probeParse.bind(this));
  },

  // draw the chart, called on construction and update of the chart
  draw: function(self){
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

    // Remove previously rendered graph (used when updating)
    d3.select(self.selector).selectAll("*").remove();

    // create the svg canvas
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

    // create the x and y axis 
    // TODO: the number of ticks for this can be a bit silly
    // how should this be improved?

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + yAxisScale(0) + ")") // code for moving the x axis as it updates
        .call(d3.svg.axis().scale(self.xAxisScale).orient("bottom"));

    svg.append("g")
        .attr("class", "y axis")
        .call(d3.svg.axis().scale(yAxisScale).orient("left"));

    // create the line or the "path" for the appended data
    self.path = svg.append("g")
        .attr("clip-path", "url(#clip)") // limit where the line can be drawn
      .append("path")
        .datum(self.chartData) // chartData is the data we're going to plot
        .attr("class", "line")
        .attr("d", self.line); // This is to help draw the svg path
  },

  // triggered whenever the Dispatcher updates
  probeParse: function(probeData, simTime) {
    // Filter until you have only the desired data
    // TODO: Make this work for multiple probes in one chart
    // currently only works for one probe per chart
    var self = this;
    // Loop through each of the inputs you want to plot
    this.chartInputs.forEach(function(input) {
          // Remove the old data
        self.chartData.shift();
        self.chartData.push(probeData[input].data[0]);
    });
    // Then update the path
    self.path
      .attr("d", self.line)
      .attr("transform", null)
    .transition()
      .duration(0.1) // this is the duration of the transition
      .ease("linear") // this is just to say that the speed of the line should be constant
      .attr("transform", "translate(" + self.xAxisScale(-1) + ",0)");
  }
};

// this is where the script actually starts

// taskbar has to be created first before creating any windows
// because that's what the library forces us to do
$( ".taskbar" ).taskbar();

// create a "dispatch" to co-ordinate updates between charts
var probeDispatch = d3.dispatch("probeLoad");

new VIZ.genChart(["inputB_probe"], "Input B", probeDispatch, 500, 400, 40);
new VIZ.genChart(["prod_probe"], "Product", probeDispatch, 500, 400, 40);

// Imitate reading from web socket
var lines;
var parse_timer;
var line_count = 0;

// read from our data file and load it into the dispatch
function parse_dispatch(){
  tmp_d = $.parseJSON(lines[line_count]);
  console.log("parsed");
  $("#simulation #time").text(tmp_d.data.t.toFixed(3));
  probeDispatch.probeLoad(tmp_d.data.probes, tmp_d.data.t);
  line_count += 1;
  if(line_count >= lines.length){
    //line_count = 0
    // stop event trigger uncomment the previous line and comment out this line
    // to make the script loop after it's done parsing the data
    window.clearInterval(parse_timer);
  }
};

// read the data file
$.get('static/messages.json', function (data) {
  // load the data and parse it at a rate of 1/50ms
  lines = data.split("\n");
  parse_timer = window.setInterval(
    function () {
      parse_dispatch();
    }, 50);
}, 'text');