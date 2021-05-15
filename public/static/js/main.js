Handlebars.registerHelper('formatNumber', function (number, digits) {
  if (typeof number === 'undefined') {
    return 0;
  }

  if (Number.isInteger(digits)) {
    return number.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  return number.toLocaleString('en-US');
});

Handlebars.registerHelper('formatNano', function (number) {
  if (typeof number === 'undefined') {
    return 0;
  }

  return number.toLocaleString('en-US', { minimumFractionDigits: GLOBAL_DIGITS, maximumFractionDigits: GLOBAL_DIGITS });
});

// navbar search
$(".form-search").submit(function (e) {
  e.preventDefault();

  var query = $(this).serializeArray()[0].value;

  if (/^(xrb|nano)_[a-z0-9]{60}$/.test(query)) {
    window.location = '/account/' + query;
  } else if (/^[A-Z0-9]{64}$/.test(query)) {
    window.location = '/block/' + query;
  }

});

$('button').tooltip({
  trigger: 'click',
  placement: 'bottom'
});

function setTooltip(btn, message) {
  $(btn).tooltip('hide')
    .attr('data-original-title', message)
    .tooltip('show');
}

function hideTooltip(btn) {
  setTimeout(function () {
    $(btn).tooltip('hide');
  }, 1000);
}

function round(value, precision) {
  if (Number.isInteger(precision)) {
    var shift = Math.pow(10, precision);
    return Math.round(value * shift) / shift;
  } else {
    return Math.round(value);
  }
}

function median(values) {

  values.sort(function (a, b) { return a - b; });

  var half = Math.floor(values.length / 2);

  if (values.length % 2)
    return values[half];
  else
    return (values[half - 1] + values[half]) / 2.0;
}

function avg(array) {
  var sum = array.reduce(function (a, b) { return a + b; });
  var avg = sum / array.length;
  return avg;
}

function max(array) {
  return Math.max.apply(Math, array);
};

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  if (typeof p !== 'number') throw new TypeError('p must be a number');
  if (p <= 0) return arr[0];
  if (p >= 1) return arr[arr.length - 1];

  var index = arr.length * p,
    lower = Math.floor(index),
    upper = lower + 1,
    weight = index % 1;

  if (upper >= arr.length) return arr[lower];
  return arr[lower] * (1 - weight) + arr[upper] * weight;
}

function formatDate(date) {
  return moment(date).format('YYYY-MM-DD HH:mm');
}

function toMnano(value) {
  if (!value) return ''
  value = value.toString()

  multNANO = Big('1000000000000000000000000000000');

  return Big(value).div(multNANO).toFixed(6).toString()
}



function dynamicSort(property) {
  var sortOrder = 1;
  if(property[0] === "-") {
      sortOrder = -1;
      property = property.substr(1);
  }
  return function (a,b) {
      /* next line works with strings and numbers, 
       * and you may want to customize it to your needs
       */
      var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
      return result * sortOrder;
  }
}

function dynamicSortMultiple() {
  /*
   * save the arguments object as it will be overwritten
   * note that arguments object is an array-like object
   * consisting of the names of the properties to sort by
   */
  var props = arguments;
  return function (obj1, obj2) {
      var i = 0, result = 0, numberOfProperties = props.length;
      /* try getting a different result from 0 (equal)
       * as long as we have extra properties to compare
       */
      while(result === 0 && i < numberOfProperties) {
          result = dynamicSort(props[i])(obj1, obj2);
          i++;
      }
      return result;
  }
}

function updateGoal(){
  axios.get('/api/github/goal').then(res => {
    var activeGoal = res.data.data.user.sponsorsListing.activeGoal;
    $(".progress-bar").css('width', activeGoal.percentComplete+'%');
    $("#sponsor-progress-text").text(activeGoal.percentComplete + '% towards ' + activeGoal.title + ' goal')
  })
}
updateGoal();

// init functions
for (i = 0, length = init.length; i < length; i++) {
  try {
    init[i]();
  } catch (e) {
    console.error('Error in init %d', i);
    console.error(e);
  }
}