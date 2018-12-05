/* BLOCK COUNTS BOX PLOT */

function getBlockcountPlotData() {
  $.get('/api/statistics/blockcountsovertime')
    .done(function (data) {
      setupPlotterOverTime(data);
    });
}

function setupPlotterOverTime(apidata) {

  var data = [];
  for(entry in apidata){

    var plotterdata = [];
    var plotterlabel = [];

    for(account in apidata[entry].blockcounts){
      plotterlabel.push(apidata[entry].blockcounts[account].account);
      plotterdata.push(apidata[entry].blockcounts[account].count);
    }

    data.push({
      y: plotterdata,
      text: plotterlabel,
      name: formatDate(apidata[entry].date),
      type: 'box',
      marker: {
        jitter: 0.3,
        pointpos: -1.8,
      },
      boxpoints: 'all',
    });
  }

  var layout = {
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)'
  };

  Plotly.newPlot('blockcountsovertime', data, layout);
}

/* BLOCK COUNTS */
var template;

init.push(getBlockcountData);

function getBlockcountData() {
  $.get('/api/statistics/blockcounts')
    .done(function (data) {

      data = enrichData(data);
      setupTemplate(data);
    });
}

function enrichData(apidata){

  var data = {};

  data.accounts = apidata;
  data.blockcounts = [];
  data.nodessync = 0;
  data.nodesoutofsync = 0;
  data.nodesnotsync = 0;

  for (var account in apidata) {
    data.blockcounts.push(apidata[account].monitor.blocks);
  }

  console.log(data.blockcounts.toString());

  data.blockcount = {};
  data.blockcount.median = round(median(data.blockcounts), 0);
  data.blockcount.avg = round(avg(data.blockcounts), 0);
  data.blockcount.max = max(data.blockcounts);

  for (var account in apidata) {
    if (apidata[account].monitor.blocks >= data.blockcount.median - 1000) {
      data.nodessync++;
    } else if (apidata[account].monitor.blocks >= data.blockcount.median - 10000) {
      data.nodesoutofsync++;
    } else {
      data.nodesnotsync++;
    }
  }

  // filter accounts with less than 10000 blocks from median
  data.accounts = apidata.filter(function( obj ) {
    return obj.monitor.blocks >= data.blockcount.median - 10000;
  });

  return data;
}

function setupTemplate(apidata) {
  $.get('/static/templates/statistics/nodes.hbs', function (templatedata) {
    template = Handlebars.compile(templatedata);

    $('#content').html(template(apidata));

    // only if template already done
    setupPlotterCurrent(apidata);
    getBlockcountPlotData()
  }, 'html');
}

function setupPlotterCurrent(apidata) {

  var plotterdata = [];
  var plotterlabel = [];
  for(account in apidata.accounts){
    if(apidata.accounts[account].monitor.blocks > apidata.blockcount.median - 10000){
      plotterdata.push(apidata.accounts[account].monitor.blocks);
      if(apidata.accounts[account].alias){
        plotterlabel.push(apidata.accounts[account].alias);
      } else {
        plotterlabel.push(apidata.accounts[account].account);
      }
    }
  }

  var trace1 = {
    x: plotterdata,
    name: 'Blockcounts',
    type: 'box',
    text: plotterlabel,
    marker: {
      color: '#f44336',
      jitter: 0.3,
      pointpos: -1.8,
    },
    boxpoints: 'all',
  };

  var data = [trace1];

  var layout = {
    xaxis: {
      type: 'log',
      autorange: true
    },
    plot_bgcolor: 'rgba(0,0,0,0)',
    paper_bgcolor: 'rgba(0,0,0,0)'
  };

  Plotly.newPlot('blockcountscurrent', data, layout);
}