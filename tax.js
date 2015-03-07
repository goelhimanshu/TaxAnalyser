google.load("visualization", "1", {packages:["corechart"]});
$(document).ready(function(){
	
	//bind events
	$("form#taxSavingAnalysisForm").on("submit", function(e){
	
		e.preventDefault();
		
		//get values from form
		var form = $(this);
		var age = Number.parseInt(form.find("#age").val());
		var earnedIncome = Number.parseInt(form.find("#earnedIncome").val());
		var investedIncome = Number.parseInt(form.find("#investedIncome").val());
		
		$(".statsContainer .container-heading").addClass("hidden");

		//get report for user input values
		var analysisReport = tax.analyseTaxSavings(age, earnedIncome, investedIncome);
		
		//visualize report
		tax.getTaxReportVisulation(age, earnedIncome, investedIncome, analysisReport);
		
		$(".statsContainer .container-heading").removeClass("hidden");
	});
	
});

var tax = {
	configurations : {									// this object manage all tax calculation dependent values
		taxableIncomeExcemptionAmount : {
			"YOUNG" : 250000,
			"SENIOR" : 300000,
			"VERY_SENIOR" : 500000
		},
		ageLimits : [60,80],
		slabs : [
			{
				incomeTaxPercentage : 10,
				incomeRangeUpperLimit : 500000
			},
			{
				incomeTaxPercentage : 20,
				incomeRangeLowerLimit : 500000,
				incomeRangeUpperLimit : 1000000
			},
			{
				incomeTaxPercentage : 30,
				incomeRangeLowerLimit : 1000000
			}
		],
		excemptionCappingOn80C: 150000,		// max savings under 80C which is exempted in income tax
		educationCessPercentage : 3			// additional education cess on income-tax
	},
	getAgeGroup : function(age){
		if(age<tax.configurations.ageLimits[0]){
			return "YOUNG";
		}else if(age>=tax.configurations.ageLimits[0] && age<tax.configurations.ageLimits[1]){
			return "SENIOR";
		}else if(age>=tax.configurations.ageLimits[1]){
			return "VERY_SENIOR";
		}
	},
	analyseTaxSavings : function(age, earnedIncome, investedIncome){
		
		var noInvestementTax = tax.calculateIncomeTax(age, earnedIncome, 0);
		var currentInvestmentTax = tax.calculateIncomeTax(age, earnedIncome, investedIncome);
		var optimumInvestmentTax = tax.calculateIncomeTax(age, earnedIncome, tax.configurations.excemptionCappingOn80C);	
		
		return {
			"currentInvestmentTax" : currentInvestmentTax,
			"optimumInvestmentTax" : optimumInvestmentTax,
			"noInvestmentTax": noInvestementTax
		};		
	},
	calculateIncomeTax : function(age, income, investment){
		var calculatedTax = 0;
		var ageGroup = tax.getAgeGroup(age);
		
		//check for valid age group
		if(ageGroup){
			if(income>0){  //check for valid income and investment
				var capping80C = tax.configurations.excemptionCappingOn80C;
				
				// check if investment is not exceeding allowed exemption under 80C 
				if(investment<capping80C){
					capping80C = investment
				}
				
				var grossTaxableIncome = income - capping80C; 
				
				if(grossTaxableIncome>0){
					var exemptionAllowed = tax.configurations.taxableIncomeExcemptionAmount[ageGroup];
					
					if(grossTaxableIncome>exemptionAllowed){
						
						var incomeTaxed = 0;
						
						//calc tax for each slab
						for(var slabNumber in tax.configurations.slabs){
							var slab = tax.configurations.slabs[slabNumber];
							var slabTaxableAmount = grossTaxableIncome;  			// amount on which tax to be calculated
							
							if(slab.hasOwnProperty("incomeRangeUpperLimit") && slabTaxableAmount>slab.incomeRangeUpperLimit){
								slabTaxableAmount = slab.incomeRangeUpperLimit;
							}
							
							if(slab.hasOwnProperty("incomeRangeLowerLimit") ){
								if(slabTaxableAmount>slab.incomeRangeLowerLimit){
									slabTaxableAmount -= slab.incomeRangeLowerLimit;
								}else{
									slabTaxableAmount = 0;
								}
							}
							
							if(exemptionAllowed>incomeTaxed){
								var exemptionHolding = (exemptionAllowed-incomeTaxed);
								incomeTaxed += slabTaxableAmount;
								if(exemptionHolding>slabTaxableAmount){
									slabTaxableAmount = 0;
								}else{
									slabTaxableAmount -= exemptionHolding; 
								}
							}else{
								incomeTaxed += slabTaxableAmount;
							}
							
							var slabTaxAmount = (slabTaxableAmount*slab.incomeTaxPercentage)/100;			// income tax for current slab
							
							calculatedTax += slabTaxAmount;		
							
						}
					}
				}
			}
			
		}
		
		// add education-cess on calculated Tax
		calculatedTax  = (calculatedTax*103)/100;
		
		// rounding tax upto Rs 10
		calculatedTax = Math.round(calculatedTax/10)*10;
		
		return calculatedTax;
	},
	drawTaxVariationChart: function(graphData){
	
		var data = google.visualization.arrayToDataTable(graphData);
        var options = {
          title: 'Income Tax variation by 80c savings',
          animation : {
          	startup :true,
          	duration : 1000,
          	easing : 'linear'
          },
          legend:'none',
          hAxis : {
          	direction : -1 
          }
        };
        var chart = new google.visualization.ColumnChart(document.getElementById('taxVariationChart'));

        chart.draw(data, options);
	},
	drawSavingsDiffernceChart: function(graphData){
	
		var data = google.visualization.arrayToDataTable(graphData);
        var options = {
          title: '80C Savings',
          is3D: true,
          legend:'none',
          animation : {
          	startup :true,
          	duration : 1000,
          	easing : 'linear'
          },
          slices: {
            0: { color: '#3366CC' },
            1: { color: '#109618' },
            2: { color: '#DC3912' }
          },
          chartArea:{left:0,top:20,width:'100%',height:'100%'}
        };
        var chart = new google.visualization.PieChart(document.getElementById('savingsDifferenceChart'));

        chart.draw(data, options);
	},
	getTaxReportVisulation: function(age, earnedIncome, investedIncome, analysisReport){
	
		//parse data to visualiza in charts
		var taxVariationGraphData = [
         ['Element', 'Income Tax', { role: 'style' }],
         ['Zero investment',analysisReport["noInvestmentTax"], '#4285F4' ],
         ['Current investment',analysisReport["currentInvestmentTax"], '#4285F4' ],
         ['Maximum investment',analysisReport["optimumInvestmentTax"], '#4285F4' ],
	    ]
	    
	    var canSaveMore = 0
	    var maxSavingAllowed = 0;
	    //check if user is eligible to Save or not
	    if( earnedIncome > tax.configurations.taxableIncomeExcemptionAmount[tax.getAgeGroup(age)]){
	    	canSaveMore = tax.configurations.excemptionCappingOn80C-investedIncome;
	    	maxSavingAllowed = tax.configurations.excemptionCappingOn80C;
	    }else{
	    	canSaveMore = 0 -investedIncome;
	    }
	    var savingsGraphData = [
		  ['Investment', 'Rupees'],
          ['Currently investing',investedIncome],
          ['Can invest more',canSaveMore]
		]
		if(canSaveMore<=0){
			savingsGraphData = [
			  ['Investment', 'Rupees'],
	          ['Should invest',maxSavingAllowed],
          	  ['nothing',0],
	          ['Investment not needed',0-canSaveMore]
			];
	    }
	
	    //visualize data
 		tax.drawTaxVariationChart(taxVariationGraphData);
 		tax.drawSavingsDiffernceChart(savingsGraphData)
	}
}