$(document).ready(init_page);

function init_page(){
  init_selector();
  // see https://github.com/bassjobsen/Bootstrap-3-Typeahead
  $('.typeahead').typeahead(TYPEAHEAD);
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


const TYPEAHEAD =
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
	.done(function(data) {TYPEAHEAD.receive_matches(data, callback);})
	.fail(function(xhr, status, error){console.log('fail', 'status=', status, 'error=', error);
					   return true;});
      return false;
    },

    sorter: function (items){
      var q = this.query.toUpperCase();
      return items.sort(function(a, b){return TYPEAHEAD.compare_matches(a, b, q);});
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
      //var url = 'https://80ctb0ux5c.execute-api.us-east-1.amazonaws.com/prod/company/' + symbol;
      var url = 'https://us-central1-indicators-176115.cloudfunctions.net/company/' + symbol;
      $('.indicators-home .loading').show();
      $.getJSON(url, function (data) {
		  if ('result' in data && data.result != null && 'indicators' in data.result){
		    var indicators = data.result.indicators;
		    update_about(data.result);
		    create_chart(symbol, name, indicators);
		  } else {
		    update_about(null);
		    create_chart(symbol, name, {});
		  }
		});
    },

    displayText: function (item) {
      return '<div class="pickname">'+
	'<div class="symbol">' + item.s + "</div>" +
	'<div class="name">' + item.n + "</div>" +
	'<div class="exchange">' + item.e + "</div></div>";
    },

    highlighter : function(item){
      var query = this.query;
      if (query === ''){
	return item;
      }
      var matches = item.match(/(>)([^<]*)(<)/g);
      var src_text = [];
      if(matches && matches.length){ // detect item is html
	for (var i in matches) {
	  var match = matches[i];
	  if (match.length > 2) {  //ignore '><'
            src_text.push(match);
	  }
	}
	if (src_text.length == 3){
	  src_text.pop(); // filter out exchange (3rd elt of src_text)
	}
      } else {
	src_text.push(item); // detect item is plain text
      }
      // escape regex chars
      query = query.replace((/[\(\)\/\.\*\+\?\[\]]/g), function(mat) { return '\\' + mat; });
      var qregex = new RegExp(query, 'gi');
      var match_txt = [];
      for (var i in src_text){
	var src = src_text[i];
	var m = src.match(qregex);
	if (m && m.length>0) {
	  match_txt.push(src);
	}
      }
      for (var j in match_txt){
	var txt = match_txt[j];
	item = item.replace(txt, txt.replace(qregex, '<strong>$&</strong>'));
      }
      return item;
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


function update_about(data){
  if (data == null){
    $('.about').text('');
    $('.tooltip').hide();
    return null;
  }
  var fields = ['sector', 'industry', 'subindustry', 'exchange'];
  var block = $('<div/>').append($('<div/>').addClass('name').text(data['company']));
  $(fields).each(function(i, field){
		   var row = $('<div/>').addClass('value').text(data[field])
		     .tooltip({title: field, placement: 'left'});
		   block.append(row);
		 });
  $('.tooltip').hide();
  $('.about').html(block);
}

function add_menu(){
  var item = $('<div/>').addClass('highcharts-menu-item').text('download CSV')
    .css({cursor: 'pointer',
	  padding: '0.5em 1em',
	  'font-size': '11px',
	  transition: 'background 250ms, color 250ms'})
    .hover(function(){ $(this).css({background: 'rgb(51, 92, 173)', color: 'rgb(255,255,255)'});},
           function(){ $(this).css({background: 'rgb(255,255,255)', color: 'rgb(51, 51, 51)'}); })
    .click(download_csv);
  $('.highcharts-menu').append(item);
}

function download_csv(){
  var data = [["name1", "city1", "some other info"], ["name2", "city2", "more info"]];
  var csvContent = "data:text/csv;charset=utf-8,";
  data.forEach(function(infoArray, index){
		 dataString = infoArray.join(",");
		 csvContent += index < data.length ? dataString+ "\n" : dataString;
	       });
  var encodedUri = encodeURI(csvContent);
  var link = $('<a/>').attr({href: encodedUri, download: 'my_data.csv'});
  $('body').append(link); // Required for FF
  link.click();
}
