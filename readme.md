# Sorting and Filtering Grouped Bart Charts
A grouped bar chart, with sort and filter options.
![preview](https://github.com/levizimmerman/fe3-assessment-2/blob/master/preview.png?raw=true)

## Live Demo
Link to the live demo can be found [here](https://levizimmerman.github.io/fe3-assessment-2/)

## Background
The goal of this exercise is to clean, transform, display, animate and interact with a data set. I have chosen to use data from [data.amsterdam.nl][dataamsterdam].

### Workflow
* Clean: Load data as text and remove all unwanted information;
* Transform: Parse clean data string to CSV and map to useable JSON object;
* Display: Draw SVG elements to display x and y axis, and a grouped bar chart;
* Animate: Add transitions to attributes of SVG elements to animate changes in your data;
* Interact: Add user input fields to manipulate the displayed data;

## Data
The dataset from [data.amsterdam.nl][dataamsterdam] is called: "5.1.1 Vestigingen en de hierin werkzame personen 1) naar secties, 1 januari 2013-2017". And is downloaded as `.xlsx` file and later exported as `.csv` file.

The dataset looks as follows:
```csv
5.1.1   Vestigingen en de hierin werkzame personen 1) naar secties, 1 januari 2013-2017;;;;;;;;;;
;;;;;;;;;;
;2013;;2014;;2015;;2016;;2017;
sectie;vestigingen met wp;werkzame pers.;vestigingen met wp;werkzame pers.;vestigingen met wp;werkzame pers.;vestigingen met wp;werkzame pers.;vestigingen met wp;werkzame pers.
;;;;;;;;;;
A landbouw, bosbouw en visserij;85;134;82;132;82;143;89;178;89;170
B winning van delfstoffen;10;64;11;60;16;96;13;93;15;170
C industrie;2121;12135;2088;10363;2280;10609;2371;11659;2463;11955
...
```
You can see that the data has nested values. This is because each row holds multiple values for each year the data is recorded. The components you can extract from the example above are as follows:
* `A` = ID.
* `landbouw, bosbouw en visserij` = Name.
* `85;134;` = Two values of one year (first: 'Vestiging met wp', second: 'Werkzame personen').


### Cleaning data
I took the following steps to clean the data:
1. Load [`index.csv`][indexcsv] using the [`d3.text()`][d3text] function.
2. Slice the header from the data string using [`.indexOf('A')`][indexof] and [`.slice()`][slice]. `'A'` is the start of the first row.
3. Working with the string slice without the header we can remove the footer. The last row of data is the total of all rows combined. By getting the index of `totaal` gives us the end of the data. Now we can use [`.slice()`][slice] again the isoltate the data rows. The data string will look like this:
  ```
  A landbouw, bosbouw en visserij;85;134;82;132;82;143;89;178;89;170
  B winning van delfstoffen;10;64;11;60;16;96;13;93;15;170
  C industrie;2121;12135;2088;10363;2280;10609;2371;11659;2463;11955
  ...
  ```
4. Now by using [`.split('\n')`][split] we can create an array where each array element is a row of data because we split the string based on a [newline][newline].
5. Using the [`.forEach()`][foreach] on the newly created array, we can clean each row. I divide the row into two slices, one with the ID (e.g. `A`) and the other with the rest of the data (e.g. `landbouw, bosbouw en visserij;85;134;82;132;82;143;89;178;89;170`).
    1. The second slice will use the [`.replace()`][replace] two times. First to remove all commas, and then replace all semicolons with a comma. The string will look as follows:
    `landbouw bosbouw en visserij,85,134,82,132,82,143,89,178,89,170`.
    2. Now use [.join()][join] function to join the first and second slice of each row. Join the two strings with a comma. And push the string a array element to a temporary array.
    3. After the [`.forEach`][foreach] has completed, you can use [`.join('\n')`] again to create a string where every row starts on a new line.
    ```csv
    A,landbouw bosbouw en visserij,85,134,82,132,82,143,89,178,89,170
    B,winning van delfstoffen,10,64,11,60,16,96,13,93,15,170
    C,industrie,2121,12135,2088,10363,2280,10609,2371,11659,2463,11955
    ...
    ```
6. Crack a beer open, we have cleaned the data and you are still reading this :beer:

### Transforming data
Now you have clean data to work with, so transforming it will be :peanuts:. Parse the data using the [`d3.csvParseRows()`][d3csvparserows]. As second argument to the parse function we add a mapping function. This function will transform the data to an object you can use. Because the original data was nested we have to append a array of values to each ID. This array will consist out of objects:
```javascript
var value = {
    year: 2013,
    wp: 134,
    v_wp: 85
};
```

1. First set the ID and name of the row:
```javascript
return {
    id: row[0],
    name: row[1],
    ...
  }
```
2. Then add values by using a function to connect the right values to each year (for now I used a hardcoded year (2013), in the future this can be added dynamically):
```javascript
return {
    ...
    values: createValuesByYear(row, 2, 2013)
  }
```
3. The function needs three arguments: `row` (holds all values), `startIndex` (where to start counting in row array) and `startYear` (year to start with appending values.
    1. Create empty array `var values = []`.
    2. Start loop on `startIndex`.
    3. Add `year` by dividing `i` by two and add this to `year - 1`, first loop will give 2013 as result.
    4. `v_wp` is the current index of row.
    5. `wp` is the next index of row.
    6. Add object to `var values = []` using [.push()][push].
    7. Add extra `i++` to take steps of two.
    8. Return array of objects.
    
```javascript
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
```
4. Good job! You are still reading this `readme.md`, have a :banana: to keep your focus up. Also the data is now cleaned, transformed and ready for loading into d3.

### Displaying data
I will not go in depth for this part, most of the code patterns used are common within D3 environment. Also [`index.js`][indexjs] is well commented so it "should" explain itself. What I will do is shortlist the most important components:
#### 1. BarGroup
Contains two bars, `werkzame personen` and `vestigingen met wp`, for each ID and the selected year. The `transform` attribute is the position on the xAxis.
```html
<g class="bar-group" transform="translate(8, 0)">
  <rect class="bar" x="2" y="272" width="23" height="0" fill="#ff7f0e"></rect>
  <rect class="bar" x="26" y="272" width="23" height="0" fill="#1f77b4"></rect>
</g>
```

#### 2. Bar
Contains value of `werkzame personen` or `vestigingen met wp`. 
```html
<rect class="bar" x="26" y="272" width="23" height="0" fill="#1f77b4"></rect>
```

#### 3. xAxis
xAxis is dynamically created from the IDs found in the data. The IDs are then mapped out over the xAxis using `ticks`.
```html
<g class="x-axis" transform="translate(0,272)" fill="none" font-size="10" font-family="sans-serif" text-anchor="middle">  <path class="domain" stroke="#000" d="M0.5,6V0.5H1220.5V6"></path>
 <g class="tick" opacity="1" transform="translate(33.5,0)">
  <line stroke="#000" y2="6"></line>
  <text fill="#000" y="9" dy="0.71em">A</text>
 </g>
  ...
```

#### 4. yAxis
yAxis is dynamically created from the min and max value of `werkzame personen` or `vestigingen met wp`. The nummeric values are then mapped out over the yAxis using `ticks`. 
```html
<g class="y-axis" fill="none" font-size="10" font-family="sans-serif" text-anchor="end">
  <path class="domain" stroke="#000" d="M-6,272.5H0.5V0.5H-6"></path>
  <g class="tick" opacity="1" transform="translate(0,272.5)">
    <line stroke="#000" x2="-6"></line>
    <text fill="#000" x="-9" dy="0.32em">0k</text>
  </g>
```

### Interact with the data
Following the instructions of the [assignment](https://github.com/cmda-fe3/course-17-18/tree/master/assessment-2#interactive) I have added a sort and filter to the data visualization. 

#### 1. Sort
For this I have added two basic sort options: `ASC` and `DESC`. These options sort on the value of `werkzame personen` and `vestigingen met wp`. The tricky part is to sort the data using nested values. After selecting a sorting option the following function will trigger:
```javascript
function handleSortChange(data) {
  currentData = currentData.sort(function(current, next) {
    var currentMax = d3.max(current.values, total);
    var nextMax = d3.max(next.values, total);
    return data.sort === 'ASC' ? currentMax - nextMax : nextMax - currentMax;
  });
  setDomains();
  drawChart(currentData);
}
```
1. The `currentData` variable in the global scope is overwritten with result of the [`.sort()`][sort].
2. Sort function gives two variables `current` and `next`. Get the max total value of both.
3. Return `currentMax - nextMax` if sorting is `ASC` and `nextMax - currentMax`.
4. `setDomains()` fires to set the new scale and domain for the xAxis.
5. Draw data on chart using `drawChart()` passing the new data to the function.

#### 2. Filter
Filtering is actually pretty simple. When selecting a year with the year select option, a global scope variable `selectYear` will be overwritten:
```javascript
function handleYearChange(data) {
  selectYear = data.year;
  setDomains();
  drawChart(currentData);
}
```
Within the `drawChart()` function there is a check which year is selected. Based on year the matching values will be loaded and drawn onto the chart. 
```javascript
barGroup.selectAll('.bar')
    .data(createXGroupKeyValue, function(data) {
      return data.key;
    })
```
When the data is joined to the single bars a mapping function selects the right year, namely `createXGroupKeyValue`:
```javascript
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
```
`getValueOfYear()` makes sure the right value is loaded using a [`.filter()`][filter] function. It returns the values where `value.year` is the same as the selected year.

## License
* [Sorting and Filtering Grouped Bart Charts](https://github.com/levizimmerman/fe3-assessment-2) - Released under the [GNU General Public License, version 3.](https://opensource.org/licenses/GPL-3.0)
* [Grouped Bar Chart code snippets](https://bl.ocks.org/mbostock/3887051) - Released under the [GNU General Public License, version 3.](https://opensource.org/licenses/GPL-3.0)
* [Enter, update, exit pattern](http://bl.ocks.org/fryford/e1c8199c70ee85c0cf50) - No license


[slice]: https://developer.mozilla.org/nl/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
[indexof]: https://developer.mozilla.org/nl/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
[split]: https://developer.mozilla.org/nl/docs/Web/JavaScript/Reference/Global_Objects/String/split
[d3text]: https://github.com/d3/d3-request/blob/master/README.md#text
[indexcsv]: https://github.com/levizimmerman/fe3-assessment-2/blob/master/index.csv
[dataamsterdam]: https://data.amsterdam.nl/#?dte=catalogus%2Fapi%2F3%2Faction%2Fpackage_show%3Fid%3D38ff8bcd-3049-47fb-b34b-2337fe18bdec&dtfs=T&dsf=groups::werk-inkomen&mpb=topografie&mpz=11&mpv=52.3731081:4.8932945
[newline]: https://en.wikipedia.org/wiki/Newline
[foreach]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
[replace]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace
[join]: https://developer.mozilla.org/nl/docs/Web/JavaScript/Reference/Global_Objects/Array/join
[d3csvparserows]: https://github.com/d3/d3-dsv/blob/master/README.md#csvParseRows
[push]: https://developer.mozilla.org/nl/docs/Web/JavaScript/Reference/Global_Objects/Array/push
[indexjs]: https://github.com/levizimmerman/fe3-assessment-2/blob/master/index.js
[filter]: https://developer.mozilla.org/nl/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
[sort]: https://developer.mozilla.org/nl/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
