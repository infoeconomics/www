$(document).ready(init_page);

function init_page(){
  init_selector();
  // see https://github.com/bassjobsen/Bootstrap-3-Typeahead
  $('.typeahead').typeahead(TYPEAHEAD_OPTIONS);
}


STOCKS = [ 'AAPL', 'AFSI', 'ALK', 'AMGN', 'AMZN', 'ANIK', 'ANTM', 'AZO', 'BAP', 'BDL', 'C',
	   'CIB', 'CPRT', 'DORM', 'EGOV', 'ESRX', 'FFIV', 'GIL', 'GNTX', 'GOOGL', 'HIFS', 'IBM', 'JCOM',
	   'MCK', 'MIDD', 'NVO', 'OZRK', 'PRXL', 'RY', 'TSCO', 'ULTA', 'USNA', 'WHG', 'WINA'];

function init_selector(){
  $.each(STOCKS, function(i, val){
	   $('#tickers').append($('<option/>').attr('value', val).text(val));
	 });
  $('#tickers').change(function(e){ show_chart($(e.target).val()); });
}



function create_chart(symbol, name, data) {
  var years = data['years'], ip=[], kc=[];
  var missing = true;
  for (var i in years){
    var year = years[i];
    if (year == 'TTM'){
      ip.push(['', null]);
      kc.push(['', null]);
    }
    var ip_val = data['info_productivity'][i];
    var kc_val = data['knowledge_capital'][i];
    if (ip_val || kc_val){
      missing = false;
    }
    ip.push([year, ip_val]);
    kc.push([year, kc_val]);
  }
  var options = {
    legend: { reversed: true },
    series: [{
	       data: kc,
	       name: "Knowledge Capital",
	       type: 'column'
	     },
	     {
	       data: ip,
	       name: "Information Productivity",
	       type: 'line',
	       yAxis: 1
	     }
	     ],
    title: { text: name + ' ('+symbol+')' },
    xAxis: { type: 'category' },
    yAxis: [ { className: 'axis0',
	       title: { text: 'Knowledge Capital'},
	       opposite: true
	     },
	     { className: 'axis1',
	       title: { text: 'Information Productivity'}
	     }
	   ]
    };
  if (missing){
    options['chart'] = {plotBackgroundColor: '#EEE'};
  }
  $('.indicators-home .loading').hide();
  Highcharts.chart('chart', options);
}

/*------- search box ------------*/


const TYPEAHEAD_OPTIONS =
  {
    source: function (key, callback){
      key = key.toUpperCase();
      var path;
      if (key.length == 0){
	console.log('error: empty key');
	return;
      } else if (key.length == 1){
	path = key;
      } else if (key.length == 2) {
	path = key[0]+'/'+key[1];
      } else {
	path = key[0]+'/'+key[1]+'/'+key[2];
      }
      var url = 'https://s3.amazonaws.com/infoeconomics/symbols/' + path + '.txt';
      $.get(url)
	.done(function(data) {TYPEAHEAD_OPTIONS.receive_matches(data, callback);})
	.fail(function(xhr, status, error){console.log('fail', 'status=', status, 'error=', error);
					   return true;});
      return false;
    },

    sorter: function (items){
      var q = this.query.toUpperCase();
      return items.sort(function(a, b){return TYPEAHEAD_OPTIONS.compare_matches(a, b, q);});
    },

    select: function () {
      var val = this.$menu.find('.active').data('value');
      this.$element.data('active', val);
      if (this.autoSelect || val) {
	var newVal = this.updater(val);
	if (!newVal) {
	  newVal = '';
	}
	this.$element
	  .val(newVal.s || newVal)
	  .text(newVal.s || newVal)
	  .change();
	this.afterSelect(newVal);
      }
      return this.hide();
      },

    afterSelect: function (stock){
      var symbol = stock.s;
      var name = stock.n;
      var url = 'https://80ctb0ux5c.execute-api.us-east-1.amazonaws.com/prod/company/' + symbol;
      $('.indicators-home .loading').show();
      $.getJSON(url, function (data) { create_chart(symbol, name, data);});
    },

    displayText: function (item) {
      return '<div class="pickname">'+
	'<div class="symbol">' + item.s + "</div>" +
	'<div class="name">' + item.n + "</div>" +
	'<div class="exchange">' + item.e + "</div></div>";
    },

    receive_matches: function (data, callback){
      var maxrows = 999999;
      var result = [];
      var rows = data.split('\n');
      for (var i in rows){
	if (i >= maxrows) {
	  break;
	}
	var row = rows[i];
	if (row.length == 0) {
	  continue;
	}
	var elts = row.split(':');
	var item = {s: elts[0], e: elts[1], n: elts[2]};
	result.push(item);
      }
      callback(result);
    },

    compare_matches: function(a, b, q){
      var as = a.s.toUpperCase().indexOf(q);
      var bs = b.s.toUpperCase().indexOf(q);
      var an = a.n.toUpperCase().indexOf(q);
      var bn = b.n.toUpperCase().indexOf(q);
      if (as !== -1 && bs !== -1){
	if (as==bs){
	  return a.s.length-b.s.length;
	} else {
	  return as-bs;
	}
      } else if (as !== -1){
	return -1;
      } else if (bs !== -1){
	return 1;
      } else if (an !== -1 && bn !== -1){
	if (as==bs){
	  return a.n.length-b.n.length;
	} else {
	  return an-bn;
	}
      } else if (an !== -1){
	return -1;
      } else if (bn !== -1){
	return 1;
      } else {
	return 0;
      }
    }
  };

