# Health Data from my iPhone
[Health app][u_app_health] from Apple is an iOS application that can measure different kinds activities of its OS user.

## Background
For this project I wanted to use personal data because I was curious if I could get some new insights about myself. Following the steps mentioned in the [workflow][u_workflow] I managed to display the data in four different bar charts:
1. Step counts per day.
2. Flights climbed per day.
3. Distance walked or ran per day.
4. Sleep cycle per day.

All the chart are displayed on the same x scale, namely time. Time was the only property that all data entries had in common. So when hovering over the chart with your cursor, more detailed information will be displayed. Detailed information includes the exact value of the bar and the difference (%) it has with the mean.

### Workflow
These were the steps taken in general to create the data visualization:
1. Export data - From the [Health app][u_app_health] I have exported a XML file.
2. Import data - Using [`d3.xml()`][u_d3_xml] to load the data and add a mapping function to its callback.
3. Clean data - Filters all `<Record>` from XML. For each `<Record>` attributes are selected and parsed.
4. Transform data - Maps filtered data to a workable object.
5. Create axis - Create y scale based on min and max values, and x scale based on date range (week or month).
6. Create charts - Draws charts (bars) based on filtered and transformed data.
7. Add transitions - Animate scale and bars when data is filtered or loaded.
8. Add events - Events listeners are added to chart elements to add interaction to the visualization.

## Data
Within the [XML][u_xml] file I only select the `<Record>` elements. Then for each `<Record>` I filter out the attribute values I need.

### Cleaning data
I have used the following code to clean the XML and transform it to a JSON object:
```javascript
data = [].map.call(data.querySelectorAll('Record'), function (record) {
  return {
    type: parseType(record.getAttribute('type')),
    value: parseValue(record.getAttribute('value')),
    startDate: parseTime(record.getAttribute('startDate')),
    endDate: parseTime(record.getAttribute('endDate')),
    creationDate: parseTime(record.getAttribute('creationDate'))
  }
});
```
Example of the JSON object can look like this:
```json
{
  "type": "stepCount",
  "value": 21,
  "startDate": "Sun Oct 29 2017 20:57:57 GMT+0100 (CET)",
  "endDate": "Sun Oct 29 2017 21:02:57 GMT+0100 (CET)",
  "creationDate": "Sun Oct 29 2017 21:05:01 GMT+0100 (CET)",
}
```

I have mentioned before that there are four types of `<Record>`, I have listed there XML object below:
1. [Step count data][u_step_count_data].
2. [Flights climbed][u_flights_climbed_data].
3. [Distance walked or ran data][u_distance_walked_or_ran_data].
4. [Sleep analysis data][u_sleep_analyis_data].

#### Step count data
```xml
<Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone van Levi" sourceVersion="9.2" device="&lt;&lt;HKDevice: 0x174484920&gt;, name:iPhone, manufacturer:Apple, model:iPhone, hardware:iPhone8,1, software:9.2&gt;" unit="count" creationDate="2016-01-13 19:57:52 +0200" startDate="2016-01-13 19:08:24 +0200" endDate="2016-01-13 19:09:26 +0200" value="31"/>
```

#### Flights climbed data
```xml
<Record type="HKQuantityTypeIdentifierFlightsClimbed" sourceName="iPhone van Levi" sourceVersion="9.2" device="&lt;&lt;HKDevice: 0x174893150&gt;, name:iPhone, manufacturer:Apple, model:iPhone, hardware:iPhone8,1, software:9.2&gt;" unit="count" creationDate="2016-01-13 19:57:52 +0200" startDate="2016-01-13 19:29:43 +0200" endDate="2016-01-13 19:29:43 +0200" value="2"/>
```

#### Distance walked or ran data
```xml
<Record type="HKQuantityTypeIdentifierDistanceWalkingRunning" sourceName="iPhone van Levi" sourceVersion="9.2" device="&lt;&lt;HKDevice: 0x17089eaf0&gt;, name:iPhone, manufacturer:Apple, model:iPhone, hardware:iPhone8,1, software:9.2&gt;" unit="km" creationDate="2016-01-13 19:57:52 +0200" startDate="2016-01-13 19:08:24 +0200" endDate="2016-01-13 19:09:26 +0200" value="0.02432"/>
```

#### Sleep analysis data
```xml
<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Clock" sourceVersion="50" device="&lt;&lt;HKDevice: 0x174c8cf30&gt;, name:iPhone, manufacturer:Apple, model:iPhone, hardware:iPhone8,1, software:10.0.2&gt;" creationDate="2016-10-17 07:30:22 +0200" startDate="2016-10-17 00:30:00 +0200" endDate="2016-10-17 07:30:22 +0200" value="HKCategoryValueSleepAnalysisInBed">
 <MetadataEntry key="_HKPrivateSleepAlarmUserWakeTime" value="2016-10-18 05:30:00 +0000"/>
 <MetadataEntry key="_HKPrivateSleepAlarmUserSetBedtime" value="2016-10-15 22:30:00 +0000"/>
 <MetadataEntry key="HKTimeZone" value="Europe/Amsterdam"/>
</Record>
```

### Transforming data
When a clean JSON object is created I transformed it to another JSON object where all entries are merged per day. All data types except for the SleepCycle can be merged easily.

### Activities (StepCount, DistanceWalkingRunning, FlightsClimbed)
Transforming all activity data I have used the [`d3.nest()`][u_d3_nest] function. Within this project I have applied this function as follows:
```javascript
/*
 * Returns data merged, where all entries are merged to a day and stored as array element
 */
self.mergeDataPerDay = function (data, type) {
  var dataPerDay = d3.nest()
    .key(function (data) {
      return data.startDate.toLocaleDateString();
    })
    .rollup(function (data) {
      return d3.sum(data, function (group) {
        return group.value;
      });
    })
    .entries(data);
  save(dataPerDay, type);
  return dataPerDay;
};
```
First level [key][u_d3_key] is unique, using the date string as ID. Then within the [rollup][u_d3_rollup] function the total sum of all values combined per day is returned. The [entries][u_d3_entries] function passes the data to the [nest][u_d3_nest] function.

### Sleep Analysis (SleepCycle)
It is a bit more complex to transform the SleepCycle data type. People tend to sleep before the new day begin, meaning sleeping before 00.00h and waking up the next day. So merging data per day requires a certain detection hours I could fall asleep and hours I could wake up. The code to do that looks as follows (comments explain the code):
```javascript
/*
 * Returns sleep cycle data merged per day
 * - Gets spread of hours accepted as minimal hours
 * - Gets spread of hours accepted as maximal hours
 * - Creates locale date string as key for each entry
 * - Merges all entries to object {start: Date, end: Date, slept: number}
 * - Checks if starting hours and waking hours of sleep are found within accepted spread of hours
 * - Filters all undefined data out of data
 * - Returns all entries with found values
 * - Save sleepCyclePerDay to originalData
 */
self.createSleepCyclePerDay = function (data, minThreshold, maxThreshold) {
  var minSpread = getMinHourSpread(minThreshold);
  var maxSpread = getMaxHourSpread(maxThreshold);
  var sleepCyclePerDay = d3.nest()
    .key(function (data) {
      return data.startDate.toLocaleDateString();
    })
    .rollup(function (data) {
      return data.map(function (entry) {
          var startTime = entry.startDate.getTime();
          var endTime = entry.endDate.getTime();
          var diffTime = endTime - startTime;
          var startHours = entry.startDate.getHours();
          var endHours = entry.endDate.getHours();
          if (minSpread.indexOf(startHours) !== -1 && maxSpread.indexOf(endHours) !== -1) {
            return {
              start: entry.startDate,
              end: entry.endDate,
              slept: Math.round(diffTime / 36000) / 100 // 2 Decimal rounding: https://stackoverflow.com/questions/11832914/round-to-at-most-2-decimal-places-only-if-necessary
            };
          }
        })
        .filter(function (entry) {
          return entry !== undefined;
        });
    })
    .entries(data)
    .filter(function (entry) {
      return entry.value.length > 0;
    });
  save(sleepCyclePerDay, 'sleepCycle');
  return sleepCyclePerDay;
};
```

### Interaction with data
After all the transforming and cleaning is done, the data is drawn as a bar chart. Drawing bar chart with a standard [Enter, Update, Exit][u_general_enter_update_exit_pattern] pattern is not that exciting the highlight in this documentation. What is exciting is the filtering and bar interaction that is added to this project. The following interactions are possible:
1. [Switch filter type][u_switch_filter] - View data per week or per month.
2. [Navigate filter type][u_nav_filter] - Navigate to next or previous type of timeframe (week or month).
3. [Hover the bar][u_hover_bar] - View detailed information about each day by hovering a bar with your cursor.

#### Switch filter type
[`timeFilter.js`][u_timefilter] Adds two filter type button to the HTML. This includes filtering on 'week' and 'month'. When clicking on one of these buttons an event will be emited using [Events.js][u_events].
```javascript
Events.emit('timefilter/select', {
  type: 'month'
});
```
Using the pub sub pattern the created instances ([BarChart][u_barchart] and [SleepCycle][u_sleepcycle]) trigger their subscription to this event and will filter the data accordingly. After filtering the data, the visualization will be redrawn within the every instance.

##### BarChart.js filter type selection event subscription
```javascript
/*
 * Handles time filter select event
 * Gets start date
 * Gets end date
 * Gets originalData based on type of chart
 * Filters data based on new startdate, enddate and given originalData
 * Sets new data which is filtered
 * Sets new start date
 * Sets new end date
 * Sets max value of filtered data
 * Emits filter done event when everything is set
 */
function handleTimeFilterSelect(data) {
  var endDate = t.getEndDate();
  var newStartDate = t.getStartDate();
  var originalData = u.originalData[self.params.type];
  var filteredData = u.filterDataOnDate(newStartDate, endDate, originalData);
  self.params.data = filteredData;
  self.params.startDate = newStartDate;
  self.params.endDate = endDate;
  self.params.maxValue = u.getMaxValue(filteredData);
  Events.emit('barchart/filter/time/done');
}
```

##### SleepCycle.js filter type selection event subscription
```javascript
/*
 * Handles time filter select event
 * Gets start date
 * Gets end date
 * Gets originalData based on type of chart
 * Filters data based on new startdate, enddate and given originalData
 * Sets new data which is filtered
 * Sets new start date
 * Sets new end date
 * Emits filter done event when everything is set
 */
function handleTimeFilterSelect(data) {
  var endDate = t.getEndDate();
  var newStartDate = t.getStartDate();
  var originalData = u.originalData[self.params.type];
  self.params.data = u.filterDataOnDate(newStartDate, endDate, originalData);
  self.params.startDate = newStartDate;
  self.params.endDate = endDate;
  Events.emit('sleepcycle/filter/time/done');
}
```

#### Navigate filter type
[`timeFilter.js`][u_timefilter] Adds two filter navigation buttons to the HTML. This includes next and previous type of time frame ('week' or 'month'). When clicking on one of these buttons an event will be emited using [Events.js][u_events].
```javascript
Events.emit('timefilter/nav');
```
Using the pub sub pattern the created instances ([BarChart][u_barchart] and [SleepCycle][u_sleepcycle]) trigger their subscription to this event and will filter the data accordingly. After filtering the data, the visualization will be redrawn within the every instance.

##### BarChart.js filter navigate event subscription
```javascript
/*
 * Handles time filter select event
 * Gets start date
 * Gets end date
 * Gets originalData based on type of chart
 * Filters data based on new startdate, enddate and given originalData
 * Sets new data which is filtered
 * Sets new start date
 * Sets new end date
 * Sets max value of filtered data
 * Emits filter done event when everything is set
 */
function handleTimeFilterSelect(data) {
  var endDate = t.getEndDate();
  var newStartDate = t.getStartDate();
  var originalData = u.originalData[self.params.type];
  var filteredData = u.filterDataOnDate(newStartDate, endDate, originalData);
  self.params.data = filteredData;
  self.params.startDate = newStartDate;
  self.params.endDate = endDate;
  self.params.maxValue = u.getMaxValue(filteredData);
  Events.emit('barchart/filter/time/done');
}
```

##### SleepCycle.js filter navigate event subscription
```javascript
/*
 * Handles time filter nav event
 * Gets start date
 * Gets end date
 * Gets originalData based on type of chart
 * Filters data based on new startdate, enddate and given originalData
 * Sets new data which is filtered
 * Sets new start date
 * Sets new end date
 * Emits filter done event when everything is set
 */
function handleTimeFilterNav() {
  var newEndDate = t.getEndDate();
  var newStartDate = t.getStartDate();
  var originalData = u.originalData[self.params.type];
  self.params.data = u.filterDataOnDate(newStartDate, newEndDate, originalData);
  self.params.startDate = newStartDate;
  self.params.endDate = newEndDate;
  Events.emit('sleepcycle/filter/time/nav');
}
```

#### Hover the bar


## Dependencies
This project has a couple of dependencies listed below. These dependencies are mandatory to get the code running without bugs. There are other includes in this project, but are not required to get the code working.

### External
* [MomentJS][u_momentjs](v2.19.1) - Parse, validate, manipulate, and display dates and times in JavaScript.
* [D3][u_d3](v4) - D3.js is a JavaScript library for manipulating documents based on data.

### Internal (custom libraries)
* [Events.js][u_events] - Adds pub-sub pattern possibilities to your code.
* [Utils.js][u_utils] - Adds a bundle of functions to do general data mutations and get information.
* [BarChart.js][u_barchart] - Creates a bar chart with given parameters.
* [SleepCycle.js][u_sleepcycle] - Creates a sleep cycle bar chart with given parameters.


## Features

## License

[u_momentjs]: https://momentjs.com/
[u_d3]: https://d3js.org/
[u_events]: https://github.com/levizimmerman/fe3-assessment-3/blob/master/shared/events.js
[u_utils]: https://github.com/levizimmerman/fe3-assessment-3/blob/master/shared/utils.js
[u_barchart]: https://github.com/levizimmerman/fe3-assessment-3/blob/master/graphs/BarChart.js
[u_sleepcycle]: https://github.com/levizimmerman/fe3-assessment-3/blob/master/graphs/SleepCycle.js
[u_app_health]: https://www.apple.com/ios/health/
[u_workflow]: https://github.com/levizimmerman/fe3-assessment-3#workflow
[u_d3_xml]: https://github.com/d3/d3-request/blob/master/README.md#xml
[u_xml]: https://github.com/levizimmerman/fe3-assessment-3/blob/master/index.xml
[u_step_count_data]: https://github.com/levizimmerman/fe3-assessment-3#step-count-data
[u_distance_walked_or_ran_data]: https://github.com/levizimmerman/fe3-assessment-3#distance-walked-or-ran-data
[u_flights_climbed_data]: https://github.com/levizimmerman/fe3-assessment-3#flights-climbed-data
[u_sleep_analyis_data]: https://github.com/levizimmerman/fe3-assessment-3#sleep-analysis-data
[u_d3_nest]: https://github.com/d3/d3-collection/blob/master/README.md#nest
[u_d3_key]: https://github.com/d3/d3-collection/blob/master/README.md#nest_key
[u_d3_rollup]: https://github.com/d3/d3-collection/blob/master/README.md#nest_rollup
[u_d3_entries]: https://github.com/d3/d3-collection/blob/master/README.md#nest_entries
[u_general_enter_update_exit_pattern]: https://bl.ocks.org/mbostock/3808234
[u_switch_filter]: https://github.com/levizimmerman/fe3-assessment-3#switch-filter-type
[u_nav_filter]: https://github.com/levizimmerman/fe3-assessment-3#navigate-filter-type
[u_hover_bar]: https://github.com/levizimmerman/fe3-assessment-3#hover-the-bar
[u_timefilter]: https://github.com/levizimmerman/fe3-assessment-3/blob/master/shared/timeFilter.js
