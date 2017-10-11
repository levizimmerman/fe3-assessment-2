/*
 * Globals: d3, Events
 * Examples used:
 *    For grouped bar charts: https://bl.ocks.org/mbostock/3887051
 *    For enter, update, exit: http://bl.ocks.org/fryford/e1c8199c70ee85c0cf50
 */
var file = './index.csv';
var svg = d3.select('svg');
var margin = {
  top: 30,
  right: 30,
  bottom: 90,
  left: 30
};
var width = window.innerWidth - margin.left - margin.right;
var height = window.innerHeight - margin.top - margin.bottom;
var selectYear = 2013;
var keys = ['v_wp', 'wp'];
var selectYearElement = document.getElementById('selectYear');
var selectSortElement = document.getElementById('selectSort');
var buttonEditElement = document.getElementById('editChart');
var currentData;
var group = svg.append('g')
  .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')')
  .attr('class', 'group-chart');

svg.attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom);

/*
 * Creates scale function for grouped bars
 * width = width of window minus margins
 */
var x0 = d3.scaleBand()
  .rangeRound([0, width])
  .paddingInner(0.1);

/*
 * Creates scale function for single bars within a group of bars
 */
var x1 = d3.scaleBand()
  .padding(0.05);

/*
 * Creates y scale based on the height of the window
 * height = window height minus margins
 */
var y = d3.scaleLinear()
  .rangeRound([height, 0]);

/*
 * Creates color scale
 * d3.schemeCategory10 = array of 10 colors
 */
var color = d3.scaleOrdinal(d3.schemeCategory10);

/*
 * Event subscriptions throughout the application
 */
Events.on('data/clean/done', handleDataCleanDone);
Events.on('data/parse/done', handleDataParseDone);
Events.on('year/change', handleYearChange);
Events.on('sort/change', handleSortChange);
Events.on('edit/click', handleEditChartClick);

/*
 * Event listeners for DOM elements
 */
selectYearElement.addEventListener('change', handleSelectYearChange);
selectSortElement.addEventListener('change', handleSelectSortChange);
buttonEditElement.addEventListener('click', handleButtonEditChartClick);

/*
 * When window is loaded start cleaning the data
 * This is the startpoint of the application
 */
(function() {
  cleanDataFromFile(file);
}).call(this);

/*
 * Handles 'data/parse/done' event
 * Calls functions:
 * - Set domains (x0, x1, y) and axis;
 * - Set legend based on value keys 'wp' and 'v_wp';
 * - Draw chart after legend and domain are set;
 */
function handleDataParseDone(data) {
  // Set currentData in global scope
  currentData = data.csvRows;
  setDomains();
  setLegend();
  drawChart(currentData);
}

/*
 * Draws chart:
 * - Creates grouped bars (enter, update, exit);
 * - Creates single bars within group (enter, update, exit);
 * - Draw xAxis;
 * - Draw yAxis;
 * - Adds transitions to bars and axis;
 * - Adds event listeners to bars, grouped bars;
 */
function drawChart(drawData) {
  // Join data where ID is identifier for the datapoint
  var barGroup = group.selectAll('.bar-group')
    .data(drawData, function(data) {
      return data.id;
    });

  // Remove bargroup if too much elements are found
  barGroup.exit().remove();

  // Updates x position of bar groups and adds transition to x position
  barGroup.attr('transform', function(data) {
      return d3.select(this).attr('transform');
    })
    .transition()
    .duration(500)
    .delay(function(data, index) {
      return index * 20;
    })
    .attr('transform', function(data) {
      return 'translate(' + x0(data.id) + ', 0)';
    });

  // Enters new bar groups and adds class and transform attributes, mouseenter and mouseleave listener
  var barGroupEnter = barGroup.enter().append('g')
    .attr('class', 'bar-group')
    .attr('transform', function(data) {
      return 'translate(' + x0(data.id) + ', 0)';
    })
    .on('mouseenter', handleMouseEnterBarGroup)
    .on('mouseleave', handleMouseLeaveBarGroup);;

  // Join data per grouped bars and map the values to 'key' amd 'value' using createXGroupKeyValue function
  var bar = barGroupEnter.selectAll('.bar')
    .data(createXGroupKeyValue, function(data) {
      return data.key;
    });

  // Removes data if too much bar elements are present
  bar.exit().remove();

  // Updates x, y, width, height, and fill of bar and adds transitions to x and y positions
  barGroup.selectAll('.bar')
    .data(createXGroupKeyValue, function(data) {
      return data.key;
    })
    .attr('x', function(data) {
      return x1(data.key);
    })
    .attr('y', function(data) {
      return d3.select(this).attr('y');
    })
    .transition()
    .duration(500)
    .attr('y', function(data) {
      return y(data.value);
    })
    .attr('width', x1.bandwidth())
    .attr('height', function(data) {
      return height - y(data.value);
    })
    .attr('fill', function(data) {
      return color(data.key);
    });

  // Enters new bars and adds class, x (scale fuction using key to get x scale position),
  // y (scale fuction using value to get y scale position), width (using bandwidth of x1 scale),
  // height (window height minus the y position)
  var barEnter = bar.enter().append('rect')
    .attr('class', 'bar')
    .attr('x', function(data) {
      return x1(data.key);
    })
    .attr('y', function(data) {
      return y(data.value);
    })
    .attr('width', x1.bandwidth())
    .attr('height', function(data) {
      return height - y(data.value);
    })
    .attr('fill', function(data) {
      return color(data.key);
    })
    .on('mouseenter', handleMouseEnterBar)
    .on('mouseleave', handleMouseLeaveBar);

  // Join data, adds [] around drawData because yAxis need only one instance
  var yAxis = group.selectAll('.y-axis').data([drawData]);

  // Updates ticks on y axis and positions text after rescaling using second last array element with .pop()
  yAxis.transition()
    .duration(500)
    .call(d3.axisLeft(y).ticks(null, 's'))
    .select('text')
    .attr('y', y(y.ticks().pop()) + 0.5);

  // Enters yAxis setting the ticks and text label of y axis
  yAxis.enter().append('g')
    .attr('class', 'y-axis')
    .call(d3.axisLeft(y).ticks(null, 's'))
    .append('text')
    .attr('x', 2)
    .attr('y', y(y.ticks().pop()) + 0.5)
    .attr('dy', '0.32em')
    .attr('fill', '#000')
    .attr('font-weight', 'bold')
    .attr('text-anchor', 'start')
    .text('Werkzame personen');

  // Join data, adds [] around drawData because yAxis need only one instance
  var xAxis = group.selectAll('.x-axis').data([drawData]);

  // Updates the y position of the xAxis
  xAxis.attr('transform', 'translate(0,' + height + ')')
    .call(d3.axisBottom(x0));

  // Enters xAxis setting the y position and setting the bottom axis
  xAxis.enter().append('g')
    .attr('class', 'x-axis')
    .attr('transform', 'translate(0,' + height + ')')
    .call(d3.axisBottom(x0));
}

/*
 * Sets domains
 * - x0 domain: Is set using the IDs of each data entry as key;
 * - x1 domain: Is set using 'wp' and 'v_wp' keys;
 * - y domain: Is set using the max value found in currentData variable;
 */
function setDomains() {
  x0.domain(currentData.map(getId));
  x1.domain(keys).rangeRound([0, x0.bandwidth()]);
  y.domain([0, getMaxValueOfYear(currentData)]);
}

/*
 * Sets legend (only called once)
 * - Adds <rect> with colors based on the keys array;
 * - Adds <text> with name of the key;
 */
function setLegend() {
  var legend = group.append('g')
    .attr('font-family', 'sans-serif')
    .attr('font-size', 10)
    .attr('text-anchor', 'end')
    .selectAll('g')
    .data(keys.slice().reverse())
    .enter().append('g')
    .attr('transform', function(d, i) {
      return 'translate(0,' + i * 20 + ')';
    });

  legend.append('rect')
    .attr('x', width - 19)
    .attr('width', 19)
    .attr('height', 19)
    .attr('fill', function(data) {
      return color(data);
    });

  legend.append('text')
    .attr('x', width - 24)
    .attr('y', 9.5)
    .attr('dy', '0.32em')
    .text(function(data) {
      return getKeyName(data);
    });
}

/*
 * Gets name by ID
 *
 * Uses Array.prototype.find to find row with the given ID
 * Returns string of which the first letter is capitalized using capitalizeFirstLetter function
 */
function getNameById(id) {
  var foundRow = currentData.find(function(row) {
    return row.id === id;
  });
  return capitalizeFirstLetter(foundRow.name);
}

/*
 * Capitalizes first letter of string
 *
 * Source: https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript
 */
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/*
 * Gets name of key
 *
 * Returns string
 */
function getKeyName(data) {
  switch (data) {
    case 'wp':
      return 'werkzame pers.';
    case 'v_wp':
      return 'vestigingen met wp';
  }
  return data;
}

/*
 * Handles year change event
 *
 * Overwrites global variable 'selectYear' with selected year
 * Sets domains, because max value of year can be changed
 * Draws chart with new currentData
 */
function handleYearChange(data) {
  selectYear = data.year;
  setDomains();
  drawChart(currentData);
}

/*
 * Handles sort change event
 *
 * Stores sort in currentData variable
 * Can toggle between ASC and DESC sorting
 * Sets domains, because xAxis is going to be reordered
 * Draws chart with new currentData
 */
function handleSortChange(data) {
  currentData = currentData.sort(function(current, next) {
    var currentMax = d3.max(current.values, total);
    var nextMax = d3.max(next.values, total);
    return data.sort === 'ASC' ? currentMax - nextMax : nextMax - currentMax;
  });
  setDomains();
  drawChart(currentData);
}

/*
 * Gets total value
 *
 * Only returns total value of selected year
 */
function total(value) {
  if (value.year === selectYear) {
    return value.v_wp + value.wp;
  }
}

/*
 * Gets highest value
 *
 * Only returns highest value of selected year
 */
function highest(value) {
  if (value.year === selectYear) {
    return value.wp > value.v_wp ? value.wp : value.v_wp;
  }
}

/*
 * Gets 'wp' value
 *
 * Only returns 'wp' value of selected year
 */
function wp(value) {
  if (value.year === selectYear) {
    return value.wp;
  }
}

/*
 * Gets 'vwp' value
 *
 * Only returns 'vwp' value of selected year
 */
function vwp(value) {
  if (value.year === selectYear) {
    return value.v_wp;
  }
}

/*
 * Creates object with key value of current year for a single bar
 *
 * Gets value of selected year using getValueOfYear function
 * Returns a mapping of key and value of the selected year
 */
function createXGroupKeyValue(data) {
  // Work with current value of selected year
  var currentValue = getValueOfYear(data.values);
  return keys.map(function(key) {
    // Return object with value for each key
    return {
      key: key,
      value: currentValue[0][key]
    };
  });
}

/*
 * Gets value of selected year
 *
 * Returns object {year: number, wp: number, v_wp: number}
 */
function getValueOfYear(values) {
  return values.filter(function(value) {
    return value.year === selectYear;
  });
}

/*
 * Gets max value of a year
 *
 * Get max value using d3.max function and highest function
 * Return max value to d3.max function called upon data variable
 * Return the max value found in nested data variable
 */
function getMaxValueOfYear(data) {
  // Return max value from row
  return d3.max(data, function(rows) {
    // Return max of values in each row
    return d3.max(rows.values, highest);
  });
}

/*
 * Gets ID
 *
 * Returns id of data point
 */
function getId(data) {
  return data.id;
}

/*
 * Handles data when cleaning is done
 *
 * Uses d3.csvParseRows to parse string into CSV
 * Emits tranformed data
 */
function handleDataCleanDone(cleanText) {
  Events.emit('data/parse/done', {
    csvRows: d3.csvParseRows(cleanText.data, transformRow)
  });
}

/*
 * Transforms row, maps value per row
 *
 * Returns object {id: string, name: string, values: array<object>}
 */
function transformRow(row) {
  return {
    id: row[0],
    name: row[1],
    values: createValuesByYear(row, 2, 2013)
  }
}

/*
 * Creates values object per year
 *
 * Uses row data to map the values in return object
 * Uses startIndex to start counting in row array
 * Uses startYear to count from
 */
function createValuesByYear(row, startIndex, startYear) {
  var values = [];
  for (var i = startIndex; row.length > i; i++) {
    var valueObject = {
      // Set year to current index minus 1 and step (always in steps of two) divided by 2
      year: Number(startYear - 1 + i / 2),
      v_wp: validNum(row[i]),
      wp: validNum(row[i + 1])
    }
    // Add valueObject to values array
    values.push(valueObject);
    // Add extra increment to loop through pairs
    i++;
  }
  return values;
}

/*
 * Validates value as a number
 *
 * Returns null if is not number
 */
function validNum(value) {
  return isNaN(Number(value)) ? null : Number(value);
}

/*
 * Cleans data from file
 *
 * Uses file and parses it through d3.text to get a string value
 * Returns string split by newlines
 */
function cleanDataFromFile(file) {
  d3.text(file, function(error, data) {
    if (error) {
      throw error;
    }
    // Remove the header by finding the first ID in this case 'A'
    var removeHeader = data.slice(data.indexOf('A'));
    // Remove the footer by using the header and find 'totaal' which is at the bottom of the table
    var removeFooter = removeHeader.slice(0, removeHeader.indexOf('totaal')).trim();
    // Create array based on new lines
    var rows = removeFooter.split('\n');
    // Create new return array
    var newRows = [];
    rows.forEach(function(row) {
      // Extract the ID
      rowWithId = row.slice(0, row.indexOf(' '));
      // Extract the data without ID and clean by removing ',' amd replacing ';' with ','
      rowWithoutId = row.slice(row.indexOf(' ') + 1)
        .replace(',', '')
        .replace(/;/g, ',');
      // Glue ID and data together with a comma
      newRows.push([rowWithId, rowWithoutId].join(','));
    });
    Events.emit('data/clean/done', {
      data: newRows.join('\n')
    });
  });
}

/*
 * Handles edit chart button click event
 *
 * Toggles classname 'is-open' on '.header' element
 */
function handleEditChartClick() {
  var header = document.querySelector('.header');
  var classNameOpen = 'is-open';
  if (header.classList.contains(classNameOpen)) {
    header.classList.remove(classNameOpen);
  } else {
    header.classList.add(classNameOpen);
  }
}

/*
 * Handles mouse enter event of a single bar
 *
 * Adds transition to select element, <rect> and <text>
 * Adds <rect> using x and y values of parentGroup variable
 * Adds <text> using x and y values of parentGroup variable
 */
function handleMouseEnterBar(data) {
  d3.select(this)
    .attr('opacity', 1)
    .transition()
    .duration(200)
    .attr('opacity', 0.7);
  // Select parent to append element to bar group
  var parentGroup = d3.select(this.parentNode);
  var transform = parentGroup.attr('transform');
  var parentGroupX = Number(transform.slice(transform.indexOf('(') + 1, transform.indexOf(',')));
  // Calculate width with length of the value, in order to add a fitting box for text
  var width = data.value.toString().length * 9;
  group.append('rect')
    .attr('class', 'bar-info bar-info-box')
    .attr('opacity', 0)
    // Calculate center of bar by adding the half of the width to the start x position
    .attr('x', x1(data.key) + parentGroupX)
    .transition()
    .duration(200)
    .delay(100)
    .attr('opacity', 1)
    .attr('y', y(data.value) - 25)
    .attr('width', width)
    .attr('height', 20)
    .attr('fill', '#ddd');

  group.append('text')
    .attr('class', 'bar-info bar-info-text')
    .attr('text-anchor', 'start')
    .attr('opacity', 0)
    .style('fill', '#555')
    .transition()
    .duration(200)
    .attr('y', y(data.value) - 11)
    .attr('opacity', 1)
    .attr('x', x1(data.key) + 5 + parentGroupX)
    .attr('font-size', 12)
    .text(data.value);
}

/*
 * Handles mouse enter event of a bar group
 *
 * Gets group name of viewed bars using getNameById function
 * Gets width of barGroup using .node() and .getBBox() functions
 */
function handleMouseEnterBarGroup(data, index) {
  var name = getNameById(data.id);
  var barGroup = d3.select(this);
  var barGroupNodeBox = barGroup.node().getBBox();
  barGroup.append('text')
    .attr('class', 'x-text')
    .attr('y', height + 35)
    .attr('x', barGroupNodeBox.width / 2)
    .attr('fill', '#000')
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
    .attr('font-weight', 'bold')
    .text(name);
}

/*
 * Handles mouse leave event of a bar group
 *
 * Removes all <text> elements with classname 'x-text'
 */
function handleMouseLeaveBarGroup(data, index) {
  var barGroup = d3.select(this);
  barGroup.selectAll('.x-text')
    .remove();
}

/*
 * Handles mouse leave event of a single bar
 *
 * Removes all <text> and <rect> elements using class selector on 'bar-info'
 */
function handleMouseLeaveBar(data) {
  d3.select(this).attr('opacity', 1);
  group.selectAll('.bar-info')
    .remove();
}

/*
 * Handles year selection change
 *
 * Emits value of selection
 */
function handleSelectYearChange() {
  Events.emit('year/change', {
    year: Number(this.value)
  });
}

/*
 * Handles sort selection change
 *
 * Emits value of selection
 */
function handleSelectSortChange() {
  Events.emit('sort/change', {
    sort: this.value
  });
}

/*
 * Handles edit chart button click
 *
 * Emits click event
 */
function handleButtonEditChartClick() {
  Events.emit('edit/click');
}
