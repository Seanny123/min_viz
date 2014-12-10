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

  this.windowHeight = windowHeight;
  this.windowWidth = windowWidth;
  this.selector = "#chart-window-"+VIZ.windowCount
  $(VIZ.windowDiv).append("<div id='chart-window-"+VIZ.windowCount+"'>")
  VIZ.windowCount += 1;
  // Will "this" still work here?
  this.container = $(this.selector).window({
    width: this.windowWidth,
    height: this.windowHeight,
    resizeStop: function(event, ui){
      console.log("resizing")
      console.log(ui.size)
      this.windowWidth = ui.size(0);
      this.windowHeight = ui.size(1);
      this.draw();
    }
  });

  // The fact that we're copying the data to each chart feels weird.
  this.chartInputs = probeLabelList; //Probes to listen to
  // WTF is label a reserved keyword in JavaScript?
  this.label = label;

  this.init(displayedDataSize);
  this.draw();

  probeDispatch.on(("probeLoad."+label), this.probeLoad());
}

// These are functions that other charts might want to modify
VIZ.genChart.prototype {
  
  init: function(displayedDataSize){
    this.n = 100; // TODO: rename this variable
    this.chartData = Array.apply(null, Array(displayedDataSize)).map(Number.prototype.valueOf,0);
  },

  draw: function(){
    // TODO: How to set these ranges according to the expected output? 
    // How did Javaviz do it?
    // Was it based off the radius?
    var margin = {top: 20, right: 20, bottom: 20, left: 40},
      width = this.windowWidth - margin.left - margin.right,
      height = this.windowHeight - margin.top - margin.bottom;

    // Domain is the minimum and maximum values to display on the graph
    // Range is the mount of SVG to cover
    // Get passed into the axes constructors
    // TODO: better names for these variables
    var xAxisScale = d3.scale.linear()
        .domain([0, this.n - 1])
        .range([0, width]);
     
    var yAxisScale = d3.scale.linear()
        .domain([-30, 30])
        .range([height, 0]);
     
    // gets a set of x and y co-ordinates from our data
    var line = d3.svg.line()
        // sets the x value to move forward with time
        .x(function(data, index) { return xAxisScale(index); })
        // sets the y value to just use the data y value
        .y(function(data, index) { return yAxisScale(data); });

    var svg = d3.select(this.selector).append("svg")
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

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + yAxisScale(0) + ")") // code for moving the x axis as it updates
        .call(d3.svg.axis().scale(xAxisScale).orient("bottom"));

    svg.append("g")
        .attr("class", "y axis")
        .call(d3.svg.axis().scale(yAxisScale).orient("left"));

    var path = svg.append("g")
        .attr("clip-path", "url(#clip)") // limit where the line can be drawn
      .append("path")
        .datum(chartData) // chartData is the data we're going to plot
        .attr("class", "line")
        .attr("d", line); // This is to help draw the sgv path
  },

  probeLoad: function(probeData, simTime) {
    // Filter until you have only the desired data
    // TODO: Make this work for multiple probes

    // Loop through each of the inputs you want to plot
    chartInputs.forEach(function(input) {
          // Remove the old data
        chartData.shift();
        chartData.push(probeData[input].data[0]);
    });

    // Then update the path
    path
      .attr("d", line)
      .attr("transform", null)
    .transition()
      .duration(0.1) // is it the duration of the transition?
      .ease("linear") // this is just to say that the speed of the line should be constant
      .attr("transform", "translate(" + xAxisScale(-1) + ",0)");
  }
}

// taskbar has to be created first before creating any windows
$( ".taskbar" ).taskbar();

var probeDispatch = d3.dispatch("probeLoad");


new VIZ.genChart(".window", ["prod_probe"], "foo", probeDispatch);


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