var sql = require('mssql');
var DBUtil = require('./DBUtil');

var moduleName = 'BTUtility';

exports.getSessions = function() {
    console.log(moduleName, `Get Sessions for Today's Update: ${new Date()}`);

    var qry = `select top 10 import_date, sessionKey, studentId, studentName, sessionName, facilitatorName, 
    appointmentBegin, appointmentEnd, tw_eventid, tw_eventurl from tmp_Counsel_Schedule_18S  
    where import_date = (select max(import_date) from tmp_Counsel_Schedule_18S) /*and studentId <> '605257445'*/ and tw_eventid is null
    order by studentId, appointmentBegin`;
    //where studentId = '804961944'`;
    
    return DBUtil.query(qry);      
}

exports.updateSession = function(plmSession, response) {
    var twUrl = response;
    var twKey = response.substr(response.lastIndexOf('/') + 1);
    console.log(moduleName, `Update Session: ${plmSession}, ${twKey}`);

    var qry = `update tmp_Counsel_Schedule_18S set tw_eventid = '${twKey}', tw_eventurl = '${twUrl}' where SessionKey = ${plmSession}`;
    return DBUtil.query(qry);
}
