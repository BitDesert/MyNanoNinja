/* NODE VERSIONS */
var chartColors = ['#f44336', '#9C27B0', '#3F51B5', '#03A9F4', '#009688', '#8BC34A',
  '#FFEB3B', '#FF9800', '#795548', '#E91E63', '#673AB7', '#2196F3', '#00BCD4', '#4CAF50',
  '#CDDC39', '#FFC107', '#FF5722'
];

var chartcanvascount, chartcanvasweight;

init.push(getData);

function getData() {
  $('#includeonlyonlineweight').change(function (event) {
    var checkbox = event.target;
    getDataStatistics(checkbox.checked);
  });

  getDataTelemetry();
  getDataStatistics($('#includeonlyonlineweight').is(":checked"));
}


function getDataTelemetry() {
  $.get("/api/telemetry/raw", function (data) {
    var sortedmetrics = data.metrics.sort(dynamicSortMultiple('-major_version', '-minor_version', '-patch_version'));

    var counts = sortedmetrics.reduce((p, c) => {
      var name = c.major_version + '.' + c.minor_version + '.' + c.patch_version;
      if (!p.hasOwnProperty(name)) {
        p[name] = 0;
      }
      p[name]++;
      return p;
    }, {});

    prepareGraphData(counts);
  });
}

function getDataStatistics(includeOnline) {
  var url = "/api/statistics/versions/weight";
  if (includeOnline) {
    url = url + "?onlyonline=true"
  }

  $.get(url, function (data) {
    prepareGraphDataWeight(data);
  });
}

function prepareGraphData(data) {
  var chartdata = {
    labels: [],
    datasets: [
      {
        label: 'Versions',
        data: [],
        backgroundColor: []
      }
    ]
  };

  var colorcount = 0;
  for (const [key, value] of Object.entries(data)) {
    console.log(key, value);

    chartdata.labels.push(key);
    chartdata.datasets[0].data.push(value);
    chartdata.datasets[0].backgroundColor.push(chartColors[colorcount]);
    colorcount++;
  }

  setupGraph(chartdata);
}

function setupGraph(data) {
  var ctx = document.getElementById('chartcanvascount').getContext('2d');

  chartcanvascount = new Chart(ctx, {
    type: 'doughnut',
    data: data,
    options: {
      responsive: true,
      cutoutPercentage: 0,
      legend: {
        display: true
      },
      tooltips: {
        callbacks: {
          label: function (tooltipItem, data) {
            var dataset = data.datasets[tooltipItem.datasetIndex];
            var meta = dataset._meta[Object.keys(dataset._meta)[0]];
            var total = meta.total;
            var currentValue = dataset.data[tooltipItem.index];
            var percentage = parseFloat((currentValue / total * 100).toFixed(1));
            return currentValue + ' (' + percentage + '%)';
          },
          title: function (tooltipItem, data) {
            return data.labels[tooltipItem[0].index];
          }
        }
      }
    }
  });
}

function prepareGraphDataWeight(data) {
  var chartdata = {
    labels: [],
    datasets: [
      {
        label: 'Versions',
        data: [],
        backgroundColor: []
      }
    ]
  };

  var colorcount = 0;
  for (const [key, value] of Object.entries(data)) {
    if (value._id.major) {
      chartdata.labels.push(value._id.major + '.' + value._id.minor + '.' + value._id.patch);
    } else {
      chartdata.labels.push('Unknown Version');
    }
    chartdata.datasets[0].data.push(toMnano(value.totalWeight, 0));
    chartdata.datasets[0].backgroundColor.push(chartColors[colorcount]);
    colorcount++;
  }

  setupGraphWeight(chartdata);
}

function setupGraphWeight(data) {
  var ctx = document.getElementById('chartcanvasweight').getContext('2d');
  if(chartcanvasweight){
    console.log('chartcanvasweight already inited');
    chartcanvasweight.destroy();
  }

  chartcanvasweight = new Chart(ctx, {
    type: 'doughnut',
    data: data,
    options: {
      responsive: true,
      cutoutPercentage: 0,
      legend: {
        display: true
      },
      tooltips: {
        callbacks: {
          label: function (tooltipItem, data) {
            var dataset = data.datasets[tooltipItem.datasetIndex];
            var meta = dataset._meta[Object.keys(dataset._meta)[0]];
            var total = meta.total;
            var currentValue = dataset.data[tooltipItem.index];
            var currentValueNano = data.labels[tooltipItem.index] + ': ' + parseInt(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index]).toLocaleString('en-US') + ' NANO';
            var percentage = parseFloat((currentValue / total * 100).toFixed(1));
            return currentValueNano + ' (' + percentage + '%)';
          },
          title: function (tooltipItem, data) {
            return data.labels[tooltipItem[0].index];
          }
        }
      }
    }
  });
}
