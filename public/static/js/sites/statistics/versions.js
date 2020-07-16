/* NODE VERSIONS */
var chartColors = ['#f44336', '#9C27B0', '#3F51B5', '#03A9F4', '#009688', '#8BC34A',
'#FFEB3B', '#FF9800', '#795548', '#E91E63', '#673AB7', '#2196F3', '#00BCD4', '#4CAF50',
'#CDDC39', '#FFC107', '#FF5722'
];

init.push(getData);

function getData() {
  $.get("/api/telemetry/raw", function (data) {
  });
}
