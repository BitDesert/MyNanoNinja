var app = new Vue({
  el: '#app',
  data() {
    return {
      diff: null,
      isIncreasing: false,
      growth: 0
    }
  },
  mounted() {
    axios
      .get("/api/network/active_difficulty")
      .then(response => {
        this.diff = response.data;

        var difficulty_trend = data.difficulty_trend.map(function (x) {
          return parseFloat(x, 10);
        });

        this.growth = isIncreasingSequence(difficulty_trend, {
          lastPoints: 3,
          avgPoints: 10,
          avgMinimum: 10,
          reversed: true
        })

        isIncreasing = this.growth > difficulty_trend[difficulty_trend.length - 1];
      })
      .catch(reason => { });
  }
})

function isIncreasingSequence(arr, options) {
  options = options || {};
  options.lastPoints = options.lastPoints || 1;
  options.avgPoints = options.avgPoints || 10;

  if (arr.length < options.lastPoints + options.avgPoints) return null;

  var lastArr = options.reversed ? arr.slice(0, options.lastPoints) : arr.slice(arr.length - options.lastPoints, arr.length);
  var chartArr = options.reversed ? arr.slice(options.lastPoints, options.lastPoints + options.avgPoints) : arr.slice(arr.length - options.lastPoints - options.avgPoints, arr.length - options.lastPoints);

  var chartAvg = chartArr.reduce(function (res, val) { return res += val }) / chartArr.length;
  var lastAvg = Math.max.apply(null, lastArr);

  if (options.avgMinimum !== undefined && chartAvg < options.avgMinimum) return null;
  return lastAvg / chartAvg;
};