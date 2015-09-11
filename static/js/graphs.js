queue()
    // .defer(d3.csv, "static/csv/outstanding_notionals.csv")
    .defer(d3.csv, "static/csv/data_lc_viz2.csv")
    .await(makeGraphs);
// $.getScript('script.js');

function makeGraphs(error, data) {
	var dateFormat = d3.time.format('%m/%d/%Y');
    var numberFormat = d3.format('.2f');
    var last_quarter = new Date(2015, 5, 1);

    data.forEach(function (d) {
        d.dd = dateFormat.parse(d.quarter);
        d.month = d3.time.month(d.dd); // pre-calculate month for better performance
        d.notionals = isNaN(parseFloat(d.loans_outstanding_notionals)) ? 0.0 : parseFloat(d.loans_outstanding_notionals);
        d.returns = isNaN(parseFloat(d.average_returns)) ? 0.0 : parseFloat(d.average_returns)*12.0;
        d.newly_issued = (isNaN(parseFloat(d.newly_issued))||d.quarter!="6/30/2015") ? 0.0 : parseFloat(d.newly_issued);
        v = d.mask_id.split("#");
        d.score_delinq_2yrs	= v[0];
        d.score_int_rate	= v[1];
        d.score_term= v[2];
        d.score_inq_last_6mths	= v[3];
        d.score_emp_length	= v[4];
        d.score_purpose	= v[5];
        d.score_pub_rec	= v[6];
        d.score_home_ownership	= v[7];
        d.score_annual_inc = v[8];
    });

    var ndx = crossfilter(data);
	var score_delinq_2yrs_dim = ndx.dimension(function(d) { return d["score_delinq_2yrs"]; });
	var score_emp_length_dim = ndx.dimension(function(d) { return d["score_emp_length"]; });
	var score_home_ownership_dim = ndx.dimension(function(d) { return d["score_home_ownership"]; });
	var score_inq_last_6mths_dim = ndx.dimension(function(d) { return d["score_inq_last_6mths"]; });
	var score_annual_inc_dim = ndx.dimension(function(d) { return d["score_annual_inc"]; });
	var score_pub_rec_dim = ndx.dimension(function(d) { return d["score_pub_rec"]; });
	var score_purpose_dim = ndx.dimension(function(d) { return d["score_purpose"]; });
	var score_term_dim = ndx.dimension(function(d) { return d["score_term"]; });
	var score_int_rate_dim = ndx.dimension(function(d) { return d["score_int_rate"]; });
	var month_dim = ndx.dimension(function(d) {return d.month;})//.filter( last_quarter );

	//Calculate metrics
	var get_notional = function(d){ return d.notionals };
	var get_average_return = function(d){ return d.returns};
	var score_delinq_2yrs_group = score_delinq_2yrs_dim.group().reduceSum(get_notional);
	var score_emp_length_group = score_emp_length_dim.group().reduceSum(get_notional);
	var score_home_ownership_group = score_home_ownership_dim.group().reduceSum(get_notional);
	var score_inq_last_6mths_group = score_inq_last_6mths_dim.group().reduceSum(get_notional);
	var score_annual_inc_group = score_annual_inc_dim.group().reduceSum(get_notional);
	var score_pub_rec_group = score_pub_rec_dim.group().reduceSum(get_notional);
	var score_purpose_group = score_purpose_dim.group().reduceSum(get_notional);
	var score_term_group = score_term_dim.group().reduceSum(get_notional);
	var score_int_rate_group = score_int_rate_dim.group().reduceSum(get_notional);
	var notionals_group = month_dim.group().reduceSum(get_notional);

	var returns_group = month_dim.group().reduceSum(get_average_return);
    var returns_group = month_dim.group().reduce(
        /* callback for when data is added to the current filter results */
        function (p, v) {
            ++p.count;
            p.notionals += v.notionals;
            p.dollar_returned += v.notionals * v.returns;
            p.returns = p.dollar_returned / p.notionals;
            return p;
        },
        /* callback for when data is removed from the current filter results */
        function (p, v) {
            --p.count;
            p.notionals -= v.notionals;
            p.dollar_returned -= v.notionals * v.returns;
            p.returns = p.dollar_returned / p.notionals;
            return p;
        },
        /* initialize p */
        function () {
            return {
                count: 0,
                notionals: 0.000001,
                dollar_returned: 0,
                returns: 0
            };
        }
    );

	var all = ndx.groupAll();
    var average_returns_group = all.reduce(
        /* callback for when data is added to the current filter results */
        function (p, v) {
            ++p.count;
            p.notionals += v.notionals;
            p.dollar_returned += v.notionals * v.returns;
            p.returns = p.dollar_returned / p.notionals;
            p.newly_issued += v.newly_issued;
            return p;
        },
        /* callback for when data is removed from the current filter results */
        function (p, v) {
            --p.count;
            p.notionals -= v.notionals;
            p.dollar_returned -= v.notionals * v.returns;
            p.returns = p.dollar_returned / p.notionals;
            p.newly_issued -= v.newly_issued;
            return p;
        },
        /* initialize p */
        function () {
            return {
                count: 0,
                notionals: 0,
                dollar_returned: 0,
                returns: 0,
                newly_issued:0
            };
        }
    );


    //Charts
	 score_delinq_2yrs_chart = dc.pieChart("#delinq-2yrs-chart");
	 score_emp_length_chart = dc.pieChart("#emp-length-chart");
	 score_home_ownership_chart = dc.pieChart("#home-ownership-chart");
	 score_inq_last_6mths_chart = dc.pieChart("#inq-last-6mths-chart");
	 score_annual_inc_chart = dc.pieChart("#annual-inc-chart");
	 score_pub_rec_chart = dc.pieChart("#pub-rec-chart");
	 score_purpose_chart	= dc.pieChart("#purpose-chart");
	 score_term_chart = dc.pieChart("#term-chart");
	 score_int_rate_chart = dc.pieChart("#int-rate-chart");

	var returns_chart = dc.lineChart("#returns-chart");
	// var notionals_chart = dc.lineChart("#notionals-chart");
	var average_returns_number = dc.numberDisplay("#average-returns");
	var newly_issued_number = dc.numberDisplay("#newly-issued");

pie_label = {"RENT":"rent","OWN": "own","1.0DEQ":"some","0.0DEQ": "none",">2 years":">2 yr","<2 years": "<2 yr",
"0ENQ":"none","1OR2ENQ": "1, 2", "2+ENQ":"3+","0.0PUB":"none","1.0PUB":"some", "D":"debt", "C":"credit", "H":"home", "O":"other"};

	score_delinq_2yrs_chart
		.width(130)
        .height(130)
		.dimension(score_delinq_2yrs_dim)
		.group(score_delinq_2yrs_group)
		.radius(60)
		.innerRadius(30)
		.label(function(p){return pie_label[p.data.key];})
		.transitionDuration(500);

	score_emp_length_chart
		.width(130)
        .height(130)
		.dimension(score_emp_length_dim)
		.group(score_emp_length_group)
		.radius(60)
		.innerRadius(30)
		.label(function(p){return pie_label[p.data.key];})
		.transitionDuration(500);

	score_home_ownership_chart
		.width(130)
        .height(130)
		.dimension(score_home_ownership_dim)
		.group(score_home_ownership_group)
		.radius(60)
		.innerRadius(30)
		.label(function(p){return pie_label[p.data.key];})
		.transitionDuration(500)		

	score_inq_last_6mths_chart
		.width(130)
        .height(130)
		.dimension(score_inq_last_6mths_dim)
		.group(score_inq_last_6mths_group)
		.radius(60)
		.innerRadius(30)
		.label(function(p){return pie_label[p.data.key];})
		.transitionDuration(500)

	score_annual_inc_chart
		.width(130)
        .height(130)
		.dimension(score_annual_inc_dim)
		.group(score_annual_inc_group)
		.radius(60)
		.innerRadius(30)
		.transitionDuration(500);

	score_pub_rec_chart
		.width(130)
        .height(130)
		.dimension(score_pub_rec_dim)
		.group(score_pub_rec_group)
		.radius(60)
		.innerRadius(30)
		.label(function(p){return pie_label[p.data.key];})
		.transitionDuration(500);

	score_purpose_chart
		.width(130)
        .height(130)
		.dimension(score_purpose_dim)
		.group(score_purpose_group)
		.radius(60)
		.innerRadius(30)
		.label(function(p){return pie_label[p.data.key];})
		.transitionDuration(500);

	score_term_chart
		.width(130)
        .height(130)
		.dimension(score_term_dim)
		.group(score_term_group)
		.radius(60)
		.innerRadius(30)
		.transitionDuration(500);

	score_int_rate_chart
		// .turnOnControls(true)
		// .controlsUseVisibility(false)
		.dimension(score_int_rate_dim)
		.group(score_int_rate_group)
		.width(130)
        .height(130)
		.radius(60)
		.innerRadius(30)
		.transitionDuration(500);

	returns_chart
		.renderArea(true)
        .width(800)
        .height(200)
        .brushOn(true)
		.dimension(month_dim)
		.group(returns_group)
		.valueAccessor(function (p) {return p.value.returns;})
		.x(d3.time.scale().domain([new Date(2008, 0, 1), new Date(2015, 5, 30)]))
		.y(d3.scale.linear().domain([-0.02, 0.15]))
		.yAxis().tickFormat(d3.format(".0%"));

  //   notionals_chart
		// .renderArea(true)
  //       .width(800)
  //       .height(200)
  //       .brushOn(false)
		// .dimension(month_dim)
		// .group(notionals_group)
		// .x(d3.time.scale().domain([new Date(2007, 6, 1), new Date(2015, 5, 30)]));

	average_returns_number
		.group(average_returns_group)
		.valueAccessor(function (p) {return p.returns;})
		.formatNumber(d3.format(".2%"));


	// need a filter to get only the last quarter issue
	newly_issued_number
		.group(average_returns_group)
		.valueAccessor(function (p) {return p.newly_issued;})

    dc.renderAll();
};

function reset_filters(){
	score_delinq_2yrs_chart.filterAll();
	score_emp_length_chart.filterAll();
	score_home_ownership_chart.filterAll();
	score_inq_last_6mths_chart.filterAll();
	score_annual_inc_chart.filterAll();
	score_pub_rec_chart.filterAll();
	score_purpose_chart.filterAll();
	score_term_chart.filterAll();
	score_int_rate_chart.filterAll();
	dc.redrawAll();
};