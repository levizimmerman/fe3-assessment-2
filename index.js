/*
 * Globals: d3, Events
 * Examples used:
 *    For grouped bar charts: https://bl.ocks.org/mbostock/3887051
 */
var file = './index.csv';
var svg = d3.select('svg');
var margin = {
  top: 30,
  right: 30,
  bottom: 30,
  left: 30
};
var width = window.innerWidth - margin.left - margin.right;
var height = window.innerHeight - margin.top - margin.bottom;
var selectYear = 2013;
var keys = ['v_wp', 'wp'];
var selectYearElement = document.getElementById('selectYear');
var selectSortElement = document.getElementById('selectSort');
var currentData;
var group = svg.append('g')
  .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')')
  .attr('class', 'group-chart');

svg.attr('width', width + margin.left + margin.right)
  .attr('height', height + margin.top + margin.bottom);

var x0 = d3.scaleBand()
  .rangeRound([0, width])
  .paddingInner(0.1);

var x1 = d3.scaleBand()
  .padding(0.05);

var y = d3.scaleLinear()
  .rangeRound([height, 0]);

var color = d3.scaleOrdinal(d3.schemeCategory10);

// Subscriptions
Events.on('data/clean/done', handleDataCleanDone);
Events.on('data/parse/done', handleDataParseDone);
Events.on('year/change', handleYearChange);
Events.on('sort/change', handleSortChange);

// Event Listeners
selectYearElement.addEventListener('change', handleSelectYearChange);
selectSortElement.addEventListener('change', handleSelectSortChange);

(function() {
  cleanDataFromFile(file);
}).call(this);

function handleDataParseDone(data) {
  // Set currentData in global scope
  currentData = data.csvRows;
  setDomains();
  setLegend();
  drawChart(currentData);
}

function drawChart(drawData) {
  // Join data
  var barGroup = group.selectAll('.bar-group')
  .data(drawData, function(data) {
    return data.id;
  });

  // Remove data
  barGroup.exit().remove();

  // Update existing
  barGroup.attr('transform', function(data) {
    return 'translate(' + x0(data.id) + ', 0)';
  });

  // Enter new ones
  var barGroupEnter = barGroup.enter().append('g')
  .attr('class', 'bar-group')
  .attr('transform', function(data) {
    return 'translate(' + x0(data.id) + ', 0)';
  });

  // Join data
  var bar = barGroupEnter.selectAll('.bar')
  .data(createXGroupKeyValue, function(data) {
    return data.key;
  });

  // Remove data
  bar.exit().remove();

  // Update existing
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

  // Enter new ones
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
  });

  // Join data
  var yAxis = group.selectAll('.y-axis').data([drawData]);

  // Update
  yAxis.call(d3.axisLeft(y).ticks(null, 's'))
    .select('text')
    .attr('y', y(y.ticks().pop()) + 0.5);

  // Enter
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

  // Join data
  var xAxis = group.selectAll('.x-axis').data([drawData]);

  // Update
  xAxis.attr('transform', 'translate(0,' + height + ')')
  .call(d3.axisBottom(x0));

  // Enter
  xAxis.enter().append('g')
  .attr('class', 'x-axis')
  .attr('transform', 'translate(0,' + height + ')')
  .call(d3.axisBottom(x0));
}

function setDomains() {
  x0.domain(currentData.map(getId));
  // Set group x to the width of the x0
  x1.domain(keys).rangeRound([0, x0.bandwidth()]);
  y.domain([0, getMaxValueOfYear(currentData)]);
}

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

function getKeyName(data) {
  switch(data) {
    case 'wp':
    return 'werkzame pers.';
    case 'v_wp':
    return 'vestigingen met wp';
  }
  return data;
}

function handleYearChange(data) {
  selectYear = data.year;
  drawChart(currentData);
}

function handleSortChange(data) {
  currentData = currentData.sort(function(current, next) {
    var currentMax = d3.max(current.values, total);
    var nextMax = d3.max(next.values, total);
    return data.sort === 'ASC' ? currentMax - nextMax : nextMax - currentMax;
  });
  drawChart(currentData);
}

function total(value) {
  if (value.year === selectYear) {
    return value.v_wp + value.wp;
  }
}

function highest(value) {
  if (value.year === selectYear) {
    return value.wp > value.v_wp ? value.wp : value.v_wp;
  }
}

function wp(value) {
  if (value.year === selectYear) {
    return value.wp;
  }
}

function vwp(value) {
  if (value.year === selectYear) {
    return value.v_wp;
  }
}

function filterYearInData(data) {
  var copyData = data;
  data.map(function(row){
    var newValues = row.values.filter(function(value) {
      return value.year === selectYear;
    });
    return Object.assign(row, {values: newValues});
  });
  return data;
}

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

function getValueOfYear(values) {
  return values.filter(function(value) {
    return value.year === selectYear;
  });
}

function getMaxValueOfYear(data) {
  // Return max value from row
  return d3.max(data, function(rows) {
    // Return max of values in each row
    return d3.max(rows.values, highest);
  });
}

function getId(data) {
  return data.id;
}

function handleDataCleanDone(cleanText) {
  var csvRows = cleanedData = d3.csvParseRows(cleanText.data, transformRow);
  Events.emit('data/parse/done', {
    csvRows: csvRows
  });
}

function transformRow(row) {
  return {
    id: row[0],
    name: row[1],
    values: createValuesByYear(row, 2, 2013)
  }
}

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

function validNum(value) {
  return isNaN(Number(value)) ? null : Number(value);
}

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

function handleSelectYearChange() {
  Events.emit('year/change', {year: Number(this.value)});
}

function handleSelectSortChange() {
  Events.emit('sort/change', {sort: this.value});
}
