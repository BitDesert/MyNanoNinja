/* NODE VERSIONS */
var chartColors = ['#f44336', '#9C27B0', '#3F51B5', '#03A9F4', '#009688', '#8BC34A',
'#FFEB3B', '#FF9800', '#795548', '#E91E63', '#673AB7', '#2196F3', '#00BCD4', '#4CAF50',
'#CDDC39', '#FFC107', '#FF5722'
];

var version_min = 1;
var version_max = 1;

init.push(getVersionsData);

function getVersionsData() {
$.get("/api/statistics/nodeversions", function (data) {
  var chartdata = {
    labels: [],
    datasets: []
  };

  var lastdataset = data[data.length-1].nodeversions;
  var nodeversions = Object.keys(lastdataset);

  for (let i = 0; i < nodeversions.length; i++) {
    const nodecount = lastdataset[nodeversions[i]];    
    if (nodecount > 0){
      version_min = i;
      break;
    }    
  }

  for (let i = nodeversions.length; i > 0; i--) {
    const nodecount = lastdataset[nodeversions[i-1]];
    if (nodecount > 0){
      version_max = i;
      break;
    }    
  }

  console.log('MIN', version_min, 'MAX', version_max);
  

  for (var i = version_min; i <= version_max; i++) {
    chartdata.datasets.push({
      label: 'Version ' + i,
      data: [],
      borderColor: chartColors[i - 1],
      backgroundColor: chartColors[i - 1],
      pointRadius: 0
    });
  }

  data.forEach(function (element) {
    chartdata.labels.push(formatDate(element.date));

    for (var i = 1; i <= chartdata.datasets.length; i++) {
      chartdata.datasets[i - 1].data.push(element.nodeversions[i-1+version_min]);
    }
  });

  setupGraph(chartdata);
});
}

function formatDate(date) {
return moment(date).format('YYYY-MM-DD HH:mm');
}

function hexToRgbA(hex, opacity) {
var c;
if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
  c = hex.substring(1).split('');
  if (c.length == 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  c = '0x' + c.join('');
  return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + opacity + ')';
}
throw new Error('Bad Hex: ' + hex);
}

function setupGraph(data) {
var ctx = document.getElementById('chartcanvas').getContext('2d');
var myLineChart = new Chart(ctx, {
  type: 'line',
  data: data,
  options: {
    responsive: true,
    scales: {
      yAxes: [{
        stacked: true,
      }]
    },
    tooltips: {
      position: 'average',
      mode: 'index',
      intersect: false,
    }
  }
});
}
