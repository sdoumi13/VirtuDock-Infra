/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 50.0, "KoPercent": 50.0};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.4875, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.0, 500, 1500, "Accéder à /metrics-1"], "isController": false}, {"data": [1.0, 500, 1500, "Accéder à /metrics-0"], "isController": false}, {"data": [0.0, 500, 1500, "Accéder à /metrics"], "isController": false}, {"data": [0.0, 500, 1500, "Accéder à Budget-App HTTP"], "isController": false}, {"data": [0.97, 500, 1500, "Accéder à Budget-App HTTPS"], "isController": false}, {"data": [0.93, 500, 1500, "Accéder à WordPress"], "isController": false}, {"data": [0.0, 500, 1500, "Accéder à Budget-App HTTP-1"], "isController": false}, {"data": [1.0, 500, 1500, "Accéder à Budget-App HTTP-0"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 400, 200, 50.0, 35.80750000000001, 0, 1502, 2.0, 73.0, 90.89999999999998, 821.4400000000005, 40.86219225661457, 372.1500217080397, 3.7510215548064156], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["Accéder à /metrics-1", 50, 50, 100.0, 0.8600000000000002, 0, 5, 1.0, 1.0, 2.4499999999999957, 5.0, 5.720169317011784, 18.260970212218282, 0.0], "isController": false}, {"data": ["Accéder à /metrics-0", 50, 0, 0.0, 1.9000000000000004, 0, 16, 1.0, 4.899999999999999, 9.699999999999974, 16.0, 5.716245569909684, 2.0821871070081173, 0.7256952383674403], "isController": false}, {"data": ["Accéder à /metrics", 50, 50, 100.0, 2.9799999999999995, 1, 17, 2.0, 7.799999999999997, 11.599999999999966, 17.0, 5.715592135345221, 20.328307184499316, 0.7256122828074989], "isController": false}, {"data": ["Accéder à Budget-App HTTP", 50, 50, 100.0, 7.699999999999999, 2, 99, 3.0, 9.899999999999999, 51.79999999999964, 99.0, 5.2105043768236765, 18.496272861087952, 0.6258711312005002], "isController": false}, {"data": ["Accéder à Budget-App HTTPS", 50, 0, 0.0, 76.78000000000002, 12, 766, 16.0, 236.89999999999975, 707.8999999999996, 766.0, 5.259282633848743, 48.279392815819925, 0.6317302382455033], "isController": false}, {"data": ["Accéder à WordPress", 50, 0, 0.0, 189.57999999999993, 53, 1502, 74.5, 612.0999999999999, 1163.7499999999986, 1502.0, 5.109339873288372, 252.7426776772941, 0.6137195355610056], "isController": false}, {"data": ["Accéder à Budget-App HTTP-1", 50, 50, 100.0, 1.6000000000000005, 0, 16, 1.0, 3.6999999999999957, 8.599999999999966, 16.0, 5.2554130754677315, 16.777290374710955, 0.0], "isController": false}, {"data": ["Accéder à Budget-App HTTP-0", 50, 0, 0.0, 5.0600000000000005, 1, 85, 2.0, 2.8999999999999986, 41.69999999999972, 85.0, 5.211047420531527, 1.8625423397602916, 0.6259363600833767], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to 192.168.48.34:443 [/192.168.48.34] failed: Connection refused (Connection refused)", 200, 100.0, 50.0], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 400, 200, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to 192.168.48.34:443 [/192.168.48.34] failed: Connection refused (Connection refused)", 200, "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["Accéder à /metrics-1", 50, 50, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to 192.168.48.34:443 [/192.168.48.34] failed: Connection refused (Connection refused)", 50, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["Accéder à /metrics", 50, 50, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to 192.168.48.34:443 [/192.168.48.34] failed: Connection refused (Connection refused)", 50, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["Accéder à Budget-App HTTP", 50, 50, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to 192.168.48.34:443 [/192.168.48.34] failed: Connection refused (Connection refused)", 50, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["Accéder à Budget-App HTTP-1", 50, 50, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to 192.168.48.34:443 [/192.168.48.34] failed: Connection refused (Connection refused)", 50, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
