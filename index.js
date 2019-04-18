
const keys = Object.keys(airlines);
const HOURS = 24;
const TOTAL_AIRLINES = 'total';           
const TOTAL_AIRLINES_VALUE = 'Total Flights';  
const ANIMATION_DURATION = '0.5s';              
var dataPoints = new Array(HOURS);          
var airlineSelected = TOTAL_AIRLINES;     
var airlinePreviousSelected;                

//holds count of each airlines per hour
var airlinesCounterObj = {};
keys.map(function (key) {
  airlinesCounterObj[key] = 0;
});

//keeping total count of all airlines as well
airlinesCounterObj[TOTAL_AIRLINES] = 0;

initializeDataPoints(dataPoints);

//filter invalid entries and keep the count of each airlines
flights_jan_01_2008.map(function (data) {
  if (!!data) {
    var dataKeys = Object.keys(data);
    if (dataKeys.indexOf('airline') > -1 && dataKeys.indexOf('time') > -1 && keys.indexOf(data.airline) > -1) {
      var timeValues = data.time.split(':');
      if (timeValues.length === 3) {
        var bucket = parseInt(timeValues[0]);
        if (!!dataPoints[bucket]) {
          dataPoints[bucket][TOTAL_AIRLINES] += 1;
          dataPoints[bucket][data.airline] += 1;
        }
      }
    }
  }
});

//initialize array of data points to plot graph
function initializeDataPoints(dataPoints) {
  for (var i = 0; i < dataPoints.length; i++) {
    dataPoints[i] = Object.assign({}, airlinesCounterObj);
  }
}

//when page is loaded, process and render graph
window.onload = initPage;
//when page is resized, rerender graph
window.onresize = function () {
  var resizeTimeout;
  if (!resizeTimeout) {
    resizeTimeout = setTimeout(function () {
      resizeTimeout = null;
      createGraph();
    }, 300);
  }
};

/**
 * initial setup and rendering of the graph
 */
function initPage() {
  createGraph();
  setGraphHeaders();
}

/**
 * This function calculates the available space for the svg graph
 * and then plots it based on selected airline
 */
function createGraph() {
  var headerHeight = document.getElementById('header').clientHeight;
  var windowHeight = window.innerHeight;
  var availableHeight = windowHeight - headerHeight - Math.ceil(windowHeight / 5);
  var chartContainer = document.getElementById('chart-container');
  chartContainer.setAttribute("style", "height:" + availableHeight + "px");
  var chartWidth = chartContainer.clientWidth;
  var chartHeaderHeight = document.getElementById('chart-header').clientHeight;
  var bodyLeftMargin = window.getComputedStyle(document.body).marginLeft;
  plotGraph(dataPoints, airlineSelected, airlinePreviousSelected, chartWidth, availableHeight - chartHeaderHeight, parseInt(bodyLeftMargin) + 10, 0);
}

/**
 * gives the count data of selected airline
 */
function getCountsArray(graphData, attribute) {
  return graphData.map(function (item) {
    return item[attribute] || 0;
  });
}

/**
 * calculates the svg coordinate data to be used to draw the svg graph
 * and interval on x-axis in pixels
 */
function getSVGData(graphData, attribute, width, height, xOffset = 0, yOffset = 0) {
  var values = getCountsArray(graphData, attribute);
  return getCoordinates(values, width, height, xOffset, yOffset);
}

/**
 * calculates the svg coordinate data for an array of values(an airline/all airlines)
 * to be used to render the svg graph
 * and interval on x-axis in pixels
 */
function getCoordinates(values, width, height, xOffset = 0, yOffset = 0) {
  var min = Math.floor(Math.min.apply(null, values) * 0.8);
  var max = Math.ceil(Math.max.apply(null, values) * 1.2);

  var yRatio = (max - min) / height;
  var xRatio = width / (values.length);
  var coordinates = values.map(function (value, i) {
    var y = height - ((value - min) / (!!yRatio ? yRatio : 1));
    var x = (xRatio * i) - (xRatio / 2);
    return [x + xOffset, y + yOffset];
  });
  return {
    coordinates: coordinates,
    distance: xRatio
  };
}

/**
 * draws all the elements of the svg to render the graph
 */
function plotGraph(data, attribute, prevAttribute, width, height, xOffset = 0, yOffset = 0) {
  var calculatedSVGData = getSVGData(data, attribute, width, height, xOffset, yOffset);
  var prevSvgData = getSVGData(data, prevAttribute, width, height, xOffset, yOffset).coordinates;
  var svgData = calculatedSVGData.coordinates;
  var svgChart = document.getElementById('svg-chart');
  while (svgChart.firstChild) {
    svgChart.removeChild(svgChart.firstChild);
  }
  svgChart.innerHTML = "";
  svgChart.setAttribute("style", "shape-rendering:auto;height:" + height + "px; width:" + width + "px");

  if (data.length <= 0) {
    showErrorMessage(svgChart);
    return;
  }

  createArea(svgChart, svgData, prevSvgData, height, calculatedSVGData.distance);
  drawGridLines(svgChart, data.length, calculatedSVGData.distance, height);
  drawSelectionBackground(svgChart, data.length, calculatedSVGData.distance, height);
  createClipPath(svgChart, svgData, calculatedSVGData.distance, height);
  drawSelectionForeground(svgChart, data.length, calculatedSVGData.distance, height);
  createPath(svgChart, svgData, prevSvgData, height);
  createPath(svgChart, svgData, prevSvgData, height);
  createPoints(svgChart, svgData, prevSvgData);
  drawValues(svgChart, svgData, data, attribute);
  drawTransparentIntervalRects(svgChart, data.length, calculatedSVGData.distance, height);
  addHoverEffects();
}

/**
 * takes the generated svg coordinates and generates a command to draw svg path
 */
function getLineCommand(svgData, height, defaultLine = false) {
  var lineData = "";
  svgData.map(function (coordinates, i) {
    var command = i === 0 ? "M" : "L";
    lineData = lineData +
      " " +
      command +
      " " +
      coordinates[0] +
      "," +
      ((defaultLine && !!height) ? height : coordinates[1])
  });
  return lineData;
}

/**
 * alerts invalid data message
 */
function showErrorMessage(svgElement) {
  var value = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text"
  );
  value.setAttribute("x", 0);
  value.setAttribute("y", 20);
  value.setAttribute("style", "font:italic 15px sans-serif;fill:red;");
  value.textContent = "Invalid data!!!";
  svgElement.appendChild(value);
}

/**
 * creates a path in the specified svg element based on the generated svg coordinates
 */
function createPath(svgElement, svgData, prevSvgData) {
  var lineData = getLineCommand(svgData);
  var prevLineData = getLineCommand(prevSvgData);
  var line = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  line.setAttribute("d", prevLineData);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "#5CC0C0");
  line.setAttribute("stroke-width", 3);
  createAnimation(svgElement, line, "d", prevLineData, lineData);
}

/**
 * creates data points in the specified svg element based on the generated svg coordinates
 */
function createPoints(svgElement, svgData, prevSvgData) {
  prevSvgData.map(function (coordinates, i) {
    var point = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );

    point.setAttribute("cx", coordinates[0]);
    point.setAttribute("cy", coordinates[1]);
    point.setAttribute("r", 4);
    point.setAttribute("fill", "#5CC0C0");
    point.setAttribute("stroke", "#fff");
    point.setAttribute("stroke-width", 2);
    createAnimation(svgElement, point, "cy", coordinates[1], svgData[i][1]);
  });
}

/**
 * shades the area covered by the graph plotted
 */
function createArea(svgElement, svgData, prevSvgData, height, xDistance) {
  var areaPoints = getLineCommand(svgData);
  areaPoints = areaPoints +
    ' L' + (svgData[svgData.length - 1][0] + xDistance) + ", " + svgData[svgData.length - 1][1] +
    ' L' + (svgData[svgData.length - 1][0] + xDistance) + ", " + height +
    ' L' + 0 + ", " + height +
    ' L' + 0 + ", " + svgData[0][1] +
    ' L' + svgData[0][0] + ", " + svgData[0][1] +
    ' z';

  var prevPointsOfAreas = getLineCommand(prevSvgData);
  prevPointsOfAreas = prevPointsOfAreas +
    ' L' + (prevSvgData[prevSvgData.length - 1][0] + xDistance) + ", " + prevSvgData[prevSvgData.length - 1][1] +
    ' L' + (prevSvgData[prevSvgData.length - 1][0] + xDistance) + ", " + height +
    ' L' + 0 + ", " + height +
    ' L' + 0 + ", " + prevSvgData[0][1] +
    ' L' + prevSvgData[0][0] + ", " + prevSvgData[0][1] +
    ' z';

  var area = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  area.setAttribute("d", prevPointsOfAreas);
  area.setAttribute("fill", "#e8f8ed");
  createAnimation(svgElement, area, "d", prevPointsOfAreas, areaPoints);
}

/**
 * creates animation to component of svg

 */
function createAnimation(rootElement, element, attributeName, from, to) {
  var animate = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "animate"
  );
  animate.setAttribute("attributeName", attributeName);
  animate.setAttribute("from", from);
  animate.setAttribute("to", to);
  animate.setAttribute("dur", ANIMATION_DURATION);
  animate.setAttribute("begin", "indefinite");
  animate.setAttribute("end", "indefinite");
  animate.setAttribute("fill", "freeze");
  animate.setAttribute("calcMode", "spline");
  animate.setAttribute("keySplines", "0.5 0 0.5 1"); //ease-in-out
  animate.setAttribute("keyTimes", "0;1");
  element.appendChild(animate);
  rootElement.appendChild(element);
  animate.beginElement();
}

/**
 * draws the vertical grid lines on the graph showing the 24 hours intervals
 */
function drawGridLines(svgElement, dataCount, xDistance, height) {
  var lineData = "";
  for (var i = 1; i < dataCount; i++) {
    lineData += "M " + (xDistance * i) + "," + height + " L " + (xDistance * i) + ",0";
  }

  var line = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  line.setAttribute("d", lineData);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "#f6dede");
  line.setAttribute("stroke-width", 1);
  svgElement.appendChild(line);
}

/**
 * creates invisible rectangles in each inteval.
 * Used to listen to mouse-hover event in each interval
 */
function drawTransparentIntervalRects(svgElement, dataCount, xDistance, height) {
  for (var i = 1; i <= dataCount; i++) {
    var rect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    rect.setAttribute("width", xDistance);
    rect.setAttribute("height", height);
    rect.setAttribute("x", xDistance * (i - 1));
    rect.setAttribute("y", 0);
    rect.setAttribute("fill", "transparent");
    rect.setAttribute('class', 'hoverArea');
    svgElement.appendChild(rect);
  }
}

/**
 * highlights the area under the graph in the interval which is in focus
 */
function drawSelectionForeground(svgElement, dataCount, xDistance, height) {
  for (var i = 1; i <= dataCount; i++) {
    var rect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    rect.setAttribute("width", xDistance);
    rect.setAttribute("height", height);
    rect.setAttribute("x", xDistance * (i - 1));
    rect.setAttribute("y", 0);
    rect.setAttribute("fill", "#f6dede");
    rect.setAttribute("clip-path", "url(#graphClipPath)");
    rect.style.display = 'none';
    rect.setAttribute('class', 'selectionForeground');
    svgElement.appendChild(rect);
  }
}

/**
 * highlights the area above the graph in the interval which is in focus
 
 */
function drawSelectionBackground(svgElement, dataCount, xDistance, height) {
  for (var i = 1; i <= dataCount; i++) {
    var rect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    rect.setAttribute("width", xDistance);
    rect.setAttribute("height", height);
    rect.setAttribute("x", xDistance * (i - 1));
    rect.setAttribute("y", 0);
    rect.setAttribute("fill", "#f6f6f6");
    rect.style.display = 'none';
    rect.setAttribute('class', 'selectionBackground');
    svgElement.appendChild(rect);
  }
}

/**
 * crops the highlighted selection rectangle
 */
function createClipPath(svgElement, svgData, xDistance, height) {
  var clipPathElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "clipPath"
  );
  clipPathElement.setAttribute("id", "graphClipPath");
  svgElement.appendChild(clipPathElement);
  var clipPathPoints = getLineCommand(svgData);
  clipPathPoints = clipPathPoints +
    ' L' + (svgData[svgData.length - 1][0] + xDistance) + ", " + svgData[svgData.length - 1][1] +
    ' L' + (svgData[svgData.length - 1][0] + xDistance) + ", " + height +
    ' L' + 0 + ", " + height +
    ' L' + 0 + ", " + svgData[0][1] +
    ' L' + svgData[0][0] + ", " + svgData[0][1] +
    ' z';

  var clipPath = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );
  clipPath.setAttribute("d", clipPathPoints);
  clipPathElement.appendChild(clipPath);
}

/**
 * renders the value of the points in the graph
 */
function drawValues(svgElement, svgData, data, attribute) {
  for (var i = 0; i < data.length; i++) {
    var value = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    value.setAttribute("x", svgData[i][0] - 10);
    value.setAttribute("y", svgData[i][1] - 10);
    value.setAttribute("class", "pointValue");
    value.setAttribute("style", "font:italic 15px sans-serif;fill:#483d8b;");
    value.textContent = data[i][attribute];
    value.style.display = 'none';

    var xAxisValue = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    xAxisValue.setAttribute("x", svgData[i][0] - 10);
    xAxisValue.setAttribute("y", 15);
    xAxisValue.setAttribute("style", "font:italic 15px sans-serif;fill:#E65100;");
    xAxisValue.textContent = ("0" + i).slice(-2);
    svgElement.appendChild(value);
    svgElement.appendChild(xAxisValue);
  }
}

/**
 * returns the index of the currently focused interval
 */
function indexInClass(node, myClass) {
  var className = node.className;
  var num = 0;
  for (var i = 0; i < myClass.length; i++) {
    if (myClass[i] === node) {
      return num;
    }
    num++;
  }

  return -1;
}

/**
 * attaches mouseover and mouseout event listeners to the transparent rectangle elements in
 * each interval. Used to show/hide selected/unselected interval
 */
function addHoverEffects() {
  var hoverAreas = document.getElementsByClassName("hoverArea");
  for (var i = 0; i < hoverAreas.length; i++) {
    hoverAreas[i].addEventListener('mouseover', function (event) {
      setSelection(indexInClass(event.target, hoverAreas));
    });
    hoverAreas[i].addEventListener('mouseout', function (event) {
      removeSelection(indexInClass(event.target, hoverAreas));
    });
  }
}

/**
 * hides the selection components of the interval at index i
 */
function removeSelection(i) {
  var selectionBackgrounds = document.getElementsByClassName("selectionBackground");
  var selectionForegrounds = document.getElementsByClassName("selectionForeground");
  var selectedValues = document.getElementsByClassName("pointValue");
  selectionBackgrounds[i].style.display = 'none';
  selectionForegrounds[i].style.display = 'none';
  selectedValues[i].style.display = 'none';
}

/**
 * shows the selection components of the interval at index i
 */
function setSelection(i) {
  var selectionBackgrounds = document.getElementsByClassName("selectionBackground");
  var selectionForegrounds = document.getElementsByClassName("selectionForeground");
  var selectedValues = document.getElementsByClassName("pointValue");
  selectionBackgrounds[i].style.display = 'block';
  selectionForegrounds[i].style.display = 'block';
  selectedValues[i].style.display = 'block';
}

/**
 * sets the graph headers showing the flights count, airline name
 */
function setGraphHeaders() {
  var flightsCountElement = document.getElementById("flights-count");
  var flightsCount = 0;
  for (var i = 0; i < dataPoints.length; i++) {
    flightsCount += dataPoints[i][airlineSelected];
  }
  flightsCountElement.innerText = flightsCount + " flights";

  var airlineNameElement = document.getElementById("airline-name");
  airlineNameElement.innerText = airlines[airlineSelected] || TOTAL_AIRLINES_VALUE;
}

/**
 * re-creates graph when airline selection changes
 */
function updateGraphOnUserInputChange(e) {
  if (e.type === 'keypress' && e.key === 'Enter' || e.type === 'blur') {
    if (!!e.target) {
      var inputString = e.target.value.toLowerCase();
      var match;
      for (var i = 0; i < Object.keys(airlines).length; i++) {
        if (!!inputString && Object.values(airlines)[i].toLowerCase().indexOf(inputString) > -1) {
          match = Object.keys(airlines)[i];
          break;
        }
      }
      if (!!match && match !== airlineSelected) {
        airlinePreviousSelected = airlineSelected;
        airlineSelected = match;
        createGraph();
        setGraphHeaders();
      }
      e.target.value = "";
    }
  }
}

/**
 * resets and shows the graph for all airlines
 */
function renderAllAirlinesGraph() {
  airlinePreviousSelected = airlineSelected;
  airlineSelected = TOTAL_AIRLINES;
  createGraph();
  setGraphHeaders();
}
