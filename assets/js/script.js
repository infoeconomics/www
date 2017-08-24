$(document).ready(init_page);

var PERIOD_DEFAULT = 'auto';
const API_URL = 'https://us-central1-indicators-176115.cloudfunctions.net';

var SECTORS = ['Basic Materials', 'Communication Services', 'Consumer Cyclical',
	       'Consumer Defensive', 'Energy', 'Financial Services', 'Healthcare',
	       'Industrials', 'Real Estate', 'Technology', 'Utilities'];

var METRICS = {
  kc: 'Knowledge Capital',
  ip: 'Information Productivity',
  rom: 'Return-on-Management'
};

// IncomingMessage
// req.url

function init_page(){
  // see https://github.com/bassjobsen/Bootstrap-3-Typeahead
  $('.typeahead').typeahead(TYPEAHEAD);
  $('.leaders .metric-buttons label').click(get_leaders);
  $('.leaders select.sector').change(get_leaders);
  $('.leaders .metric-buttons #ip').click();
  //var menu = $('.leaders .sector.dropdown .dropdown-menu');
  var menu = $('select.sector');
  $('#rom').prop('disabled', true);
  $(SECTORS).each(function(i, sector){
		    var item = $('<option/>').attr('value', sector).text(sector);
		    menu.append(item);
		  });
}


function get_period_data(data, pref){
  // pref='auto': returns the period (annuals or quarterly) which has the most non_null data
  // pref='annuals': returns annual data
  // pref='quarterly': returns quarterly data
  var ann_years = data['annuals_years'];
  var ann_kc = data['annuals_knowledge_capital'];
  var ann_ip = data['annuals_info_productivity'];
  var ann_data ={ years: ann_years, kc: ann_kc, ip: ann_ip};

  var qrt_years = data['quarterly_years'];
  var qrt_kc = data['quarterly_knowledge_capital'];
  var qrt_ip = data['quarterly_info_productivity'];
  var qrt_data = { years: qrt_years, kc: qrt_kc, ip: qrt_ip};
  if (pref=='annuals'){
    return ann_data;
  } else if (pref=='quarterly'){
    return qrt_data;
  }
  var ann_score = count_non_null(ann_years)+count_non_null(ann_kc)+count_non_null(ann_ip);
  var qrt_score = count_non_null(qrt_years)+count_non_null(qrt_kc)+count_non_null(qrt_ip);
  if (qrt_score > ann_score){
    return qrt_data;
  } else {
    return ann_data;
  }
}

function count_non_null(array){
  // returns the count of the non_null elements of array
  var result = 0;
  for (var i in array){
    if (array[i] != null){
      result += 1;
    }
  }
  return result;
}


function create_chart(symbol, name, data) {
  var period_data = get_period_data(data, PERIOD_DEFAULT);
  var years = period_data['years'], ip=[], kc=[];
  var missing = true;
  for (var i in years){
    var year = years[i];
    if (year == 'TTM'){
      ip.push(['', null]);
      kc.push(['', null]);
    }
    var ip_val = period_data['ip'][i];
    var kc_val = period_data['kc'][i];
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
	console.error('error: empty key');
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
	.fail(function(xhr, status, error){console.error('fail', 'status=', status, 'error=', error);
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

    afterSelect: after_select,

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


function clear_chart(){
  update_about(null);
  $('#chart').html(null);
}

function visit_stock(stock){
  $('.query').val(stock.s);
  after_select(stock);
}

function after_select(stock){
  with_user_token(
    function(token) {
      var symbol = stock.s;
      var name = stock.n;
      var url = API_URL + '/company/' + symbol;
      $('.indicators-home .loading').show();
      var auth = "Bearer "+token;
      $.ajax({dataType: 'json',
	      url: url,
	      headers: { 'Authorization' : auth },
	      success:
	      function (data) {
		if ('result' in data && data.result != null && 'indicators' in data.result){
		  var indicators = data.result.indicators;
		  update_about(data.result);
		  create_chart(symbol, name, indicators);
		} else {
		  update_about(null);
		  create_chart(symbol, name, {});
		}
	      }});
    },
    function (){
      console.error('Please log in.');
      $('#err_msg').show();
    }
  );
}


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

/*------ leaders ------------*/

function get_leaders(e){
  if ($(this).is('label')){
    var metric = $(this).find('input').val();
    var sector =  $('select.sector').val();
  } else if ($(this).is('select')){
    var metric = $('.leaders input[name=metric]:checked').val();
    var sector =  $(this).val();
  }
  var url = API_URL + '/listings';
  $('.leaders .loading').show();
  $('.leaders table').hide();
  $.ajax({dataType: 'json',
	  data: { m: metric, s: sector },
	  url: url,
	  success: show_leaders
	 });
}

function show_leaders(data){
  var t = $('.leaders table tbody');
  var key = data.key;
  var title = leader_title(data);
  $('.leaders .loading').hide();
  $('.leaders h4').html(title);
  t.html(null);
  $('.leaders table').show();
  var hrow = $('<tr/>');
  var head = $('<thead/>').append(hrow);
  hrow.append($('<th/>').addClass('rank').text('rank'),
	      $('<th/>').text('company'),
	      $('<th/>').text(METRICS[data.metric]));
  t.append(hrow);
  $(data.results).each(function(i, item){
			 t.append(format_metric(i, item, key, data.metric));
		       });
}

function format_metric(i, item, key, metric){
  var symbol = item['symbol'];
  var name = item['name'];
  var value = item[key];
  var row = $('<tr/>');
  if (metric == 'kc'){
    var mm = (value / 1000).toFixed(0);
    val = '$'+number_with_commas(mm)+'M';
  } else if (metric == 'ip'){
    val = value.toFixed(2)+'%';
  } else if (metric == 'rom'){
    val = value.toFixed(2)+'%';
  } else {
    console.error('unknown metric: ' + metric);
    val = '?';
  }
  var rank = $('<td/>').addClass('rank').text(i+1);
  var sym = $('<td/>').addClass('corp').append($('<div/>')
					       .addClass('btn btn-link')
					       .text(symbol)
					       .click(function(){
							var stock = { s: symbol, n: name};
							visit_stock(stock);
						      }));
  var vv = $('<td/>').addClass('value').append($('<div/>').text(val));
  row.append(rank, sym, vv);
  return row;
}

function number_with_commas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function leader_title(data){
  var result = 'Top rankings in ';
  var metric = METRICS[data.metric];
  result += metric;
  /*
  if (data.sector != 'all'){
	result += '<div class="for_sector">sector: ' + data.sector + '</div>';
  }*/
  return result;
}

