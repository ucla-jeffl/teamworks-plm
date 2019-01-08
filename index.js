var _ = require('underscore');
var moment = require('moment');
const https = require('https');
var request = require("request");
var rp = require('request-promise');
var sql = require('mssql');

//var DBUtil = require('./DBUtil');
var BTUtil = require('./BTUtil');
var TWUtil = require('./TWUtil');

var moduleName = 'INDEX--> ';

// _getTeams().then( (teams) => {
//     _.chain(teams)
//         .sortBy('label')
//         .each( (t) => { console.log(`${t.label} (${t.id})`)});
// } );
// var athletes = _getAthletes();
var athletes;

var apptBody = processApptBody('Math 33A Sess 1', 'JEFF', '654321', 
                                '2018-04-05T22:30:00Z', '2018-04-05T22:30:00Z', '62040');
//console.log(apptBody);
//postAppointment(apptBody);
// deleteAppointment(29269795).then( (result) => {
//     if (result) console.log("SUCCESS!!!");
// });
TWUtil.getAthletes().then( (roster) => {
    athletes = roster;
    console.log(`Found (${athletes.length}) athlete records...`);
    return BTUtil.getSessions();
}).then( results => {
    //log the length of the resultset to the log
    console.log(moduleName, `Found (${results.recordset.length}) rows in database...`);
    var sessions = results.recordset;
    return sessions;

}).then( sessions => {

    var index = 1;
    var updates = [];
    // sessions.forEach( (session) => {
    //     updates.push( BTUtil.updateSession(session.sessionKey, (20180405000 + index++).toString()) );
    // });
    // return Promise.all( updates );

    var promises = [];
    sessions.forEach( function(session) {
        //var athlete = _.findWhere(athletes, { orgID: session.studentId });
        var athlete = { id: 563531 };
        if (!athlete) {
            console.log(`(${studentId}) athlete not found in the TW roster provided by API...`);
        } else {
            promises.push(
                postAndRecordAppointment( session, athlete.id )
            );
        }
    });
    return Promise.all( promises );
    // var scheduledAthletes = _.chain(sessions).groupBy('studentId').value();
    // var idList = _.keys(scheduledAthletes);

    // var athletePromises = [];
    // idList.forEach( studentId => {
    //     //console.log(`Athlete (${studentId}) with: ${scheduledAthletes[studentId].length} appointments`);
    //     var athlete = _.findWhere(athletes, { orgID: studentId });
    //     if (!athlete) {
    //         console.log(`(${studentId}) athlete not found in the TW roster provided by API...`);
    //     } else {
    //         athletePromises.push(.then( () => {
    //             return postAthleteAppointments(athlete.id, scheduledAthletes[studentId]);
    //         });
    //     }
    // });

    //console.log(`Athlete (${studentId}) with: ${scheduledAthletes[studentId].length} appointments`);
    // console.log(scheduledAthletes[idList[0]]);
    // var athlete = _.findWhere(athletes, { orgID: idList[0] });
    // return postAthleteAppointments( athlete.id, scheduledAthletes[idList[0]]);
    // //console.log(`Found (${idList.length}) athletes with appointments`);
    // return Promise.all(athletePromises);
}).then ( () => {
    console.log('COMPELETED!');
    process.exit();
}).catch( err => {
    console.error(err);
});

function postAthleteAppointments(uid, appts) {
    console.log(`Post (${appts.length}) appointments for athlete twId: ${uid}`);
    var apptUpdates = Promise.resolve();
    // return postAndRecordAppointment( appts[0], uid );
    appts.forEach( appt => {
        apptUpdates.then( () => { return postAndRecordAppointment( appt, uid); } );
    });
    return apptUpdates;
}

function postAndRecordAppointment( appt, uid ) {
    var start = moment(appt.appointmentBegin).utcOffset("-04:00");
    var end = moment(appt.appointmentEnd).utcOffset("-04:00");
    var body = processApptBody( appt.sessionName, appt.facilitatorName, appt.sessionKey, start.utc().format(), end.utc().format(), uid);
    // console.log('recording this appt', body);
    // return Promise.resolve(body);

    //post the appointment to the TW system using their API
    return postAppointment( body )
    //then, use the response to update the BT databse w/ the eventid and url for the event
    .then( response => {
        return BTUtil.updateSession( appt.sessionKey, 
            response.uri );
    });
}


// getData().then( rowCount => {
//     console.log(`Completed update to (${rowCount}) rows.  Exiting now...`);
//     process.exit(0);
// });

// var appts = _getAppointments();
// console.log("Count of Appts: " + appts.length);
// // var studentCount = _.chain(appts)
// //     .countBy('studentId')
// //     .keys()
// //     .each( (a) => { console.log(a); } )
// //     .value();
// // console.log("Count of Students: " + studentCount.length);

// var now_m = moment("2018-05-02 18:30:00.000").utcOffset("-07:00");
// console.log("Local DateTime: " + now_m.format());
// console.log("UTC DateTime: " + now_m.utc().format());

// var scheduledAthletes = _.chain(appts).groupBy('studentId').value();
// var idList = _.keys(scheduledAthletes);
// idList.forEach( (id) => { 
//     //console.log(`Athlete not found for id: (${id})`);
//     var athlete = _.findWhere(athletes, { orgID: id });
//     if (athlete) {
//         console.log(`${athlete.lastName}, ${athlete.firstName} (${athlete.id} - ${athlete.orgID})`);

//         scheduledAthletes[id].forEach( (appt) => {
//             var start = moment(appt.appointmentBegin).utcOffset("-04:00");
//             console.log(`\t+ ${appt.sessionName} with ${appt.facilitatorName} begins ${start.utc().format()}`);
//         })

//     } else {
//         console.log(`Athlete not found for id: (${id})`);
//     }
// } );

function deleteAppointment(apptid) {
    var options = {
        method: 'DELETE',
        uri: `https://www.teamworksapp.com/api/calendar/v1/calendars/events/${apptid}`,
        headers: 
            { 'cache-control': 'no-cache',
            authorization: 'bearer 5FC4E3CA-AE8A-0962-96ECF90FDA4AAC8E' },
        json: true // Automatically stringifies the body to JSON
    };
    
    return rp(options)
        .then(function (parsedBody) {
            // DELETE succeeded...
            return true;
        })
        .catch(function (err) {
            // POST failed...
            console.error(err);
            return false;
        });    
}

function postAppointment(apptBody) {
    var options = {
        method: 'POST',
        uri: 'https://www.teamworksapp.com/api/calendar/v1/calendars/events',
        headers: 
            { 'cache-control': 'no-cache',
            authorization: 'bearer 5FC4E3CA-AE8A-0962-96ECF90FDA4AAC8E' },
        body: apptBody,
        json: true // Automatically stringifies the body to JSON
    };

    //console.log(apptBody);
    
    return rp(options)
        .then(function (parsedBody) {
            // POST succeeded...
            console.log('POST-RESP: ', parsedBody);
            return parsedBody;
        })
        .catch(function (err) {
            // POST failed...
            console.error('POST-ERR: ', err);
            return;
        });
}

function processApptBody(session, facilitator, syncid, start, end, userid) {
    var body = {
        "label": `Peer Learning: ${session} with ${facilitator}`,
        "description": `syncid: [${syncid}] (do not delete)`,
        "location": "Covel Commons, 2nd Floor",
        "appointmentType": "Academic Support",
        "start": start,
        "end": end,
        "timeZone": "America/Los_Angeles",
        "recurs": false,
        "allDay": false,
        "private": false,
        "attendees": [
            {
                "id": userid,
                "type": "individual"
            }
        ],
        "reminders": [
            {
                "method": "sms",
                "minutes": 60
            }
        ]
    };
    return body;
}

function _getTeams() {
    var options = { method: 'GET',
        url: 'https://www.teamworksapp.com/api/user/v2/teams/',
        headers: 
            { 'cache-control': 'no-cache',
            authorization: 'bearer 5FC4E3CA-AE8A-0962-96ECF90FDA4AAC8E' },
        json: true // Automatically parses the JSON string in the response
    };

    return rp(options);
}

function _getAthletes() {
    return [
        {
            "orgID": "605257445",
            "active": true,
            "lastName": "Sundquist",
            "firstName": "Cody",
            "id": 563531
        },
        {
            "orgID": "504559181",
            "active": true,
            "lastName": "Abbey",
            "firstName": "Meagan",
            "id": 397275
        },
        {
            "orgID": "",
            "active": true,
            "lastName": "Academics",
            "firstName": "Exams",
            "id": 60975
        },
        {
            "orgID": "404633493",
            "active": true,
            "lastName": "Acolatse",
            "firstName": "Suzie",
            "id": 397267
        },
        {
            "orgID": "504905817",
            "active": true,
            "lastName": "Adler",
            "firstName": "Erika",
            "id": 426829
        },
        {
            "orgID": "404463202",
            "active": true,
            "lastName": "Agege",
            "firstName": "Rebecca",
            "id": 397264
        },
        {
            "orgID": "904938123",
            "active": true,
            "lastName": "Agnew",
            "firstName": "Lucy",
            "id": 426866
        },
        {
            "orgID": "804881867",
            "active": true,
            "lastName": "Akingbulu",
            "firstName": "Alex",
            "id": 221858
        },
        {
            "orgID": "104560884",
            "active": true,
            "lastName": "Ali",
            "firstName": "Prince",
            "id": 290276
        },
        {
            "orgID": "404881874",
            "active": true,
            "lastName": "Alloway",
            "firstName": "Damian",
            "id": 221840
        },
        {
            "orgID": "804965372",
            "active": true,
            "lastName": "Altick",
            "firstName": "Helen",
            "id": 426877
        },
        {
            "orgID": "704562154",
            "active": true,
            "lastName": "Alumbres",
            "firstName": "Cesar",
            "id": 397296
        },
        {
            "orgID": "704789586",
            "active": true,
            "lastName": "Alves",
            "firstName": "Michael",
            "id": 221845
        },
        {
            "orgID": "304618983",
            "active": true,
            "lastName": "Amaral",
            "firstName": "Daniel",
            "id": 333761
        },
        {
            "orgID": "604446914",
            "active": true,
            "lastName": "Amberg",
            "firstName": "Natalie",
            "id": 397283
        },
        {
            "orgID": "905065529",
            "active": true,
            "lastName": "Anawalt",
            "firstName": "Donn",
            "id": 379326
        },
        {
            "orgID": "505257200",
            "active": true,
            "lastName": "Anderson",
            "firstName": "Je'Vari",
            "id": 563527
        },
        {
            "orgID": "304910711",
            "active": true,
            "lastName": "Andrew",
            "firstName": "Olivia",
            "id": 426867
        },
        {
            "orgID": "004902171",
            "active": true,
            "lastName": "Andrews",
            "firstName": "Gabrielle",
            "id": 397228
        },
        {
            "orgID": "105065533",
            "active": true,
            "lastName": "Andrus",
            "firstName": "Martin",
            "id": 379327
        },
        {
            "orgID": "004468131",
            "active": true,
            "lastName": "Angermund",
            "firstName": "Alexis",
            "id": 397221
        },
        {
            "orgID": "004448826",
            "active": true,
            "lastName": "Arnitz",
            "firstName": "Jake",
            "id": 197717
        },
        {
            "orgID": "305021821",
            "active": true,
            "lastName": "Asemota",
            "firstName": "Tyler",
            "id": 426830
        },
        {
            "orgID": "005062064",
            "active": true,
            "lastName": "Asiasi",
            "firstName": "Devin",
            "id": 367447
        },
        {
            "orgID": "105070723",
            "active": true,
            "lastName": "Asiedu",
            "firstName": "Anderson",
            "id": 445696
        },
        {
            "orgID": "204900147",
            "active": true,
            "lastName": "Athens",
            "firstName": "Olivia",
            "id": 426857
        },
        {
            "orgID": "104990997",
            "active": true,
            "lastName": "Ault",
            "firstName": "Chase",
            "id": 379328
        },
        {
            "orgID": "804908975",
            "active": true,
            "lastName": "Azevedo",
            "firstName": "Holly ",
            "id": 418603
        },
        {
            "orgID": "205064547",
            "active": true,
            "lastName": "Baekkelund",
            "firstName": "Eirik",
            "id": 426786
        },
        {
            "orgID": "704936243",
            "active": true,
            "lastName": "Bailey",
            "firstName": "Colin",
            "id": 426758
        },
        {
            "orgID": "004399449",
            "active": true,
            "lastName": "Baird",
            "firstName": "Christine",
            "id": 88329
        },
        {
            "orgID": "904903289",
            "active": true,
            "lastName": "Barattolo",
            "firstName": "Isabella",
            "id": 426868
        },
        {
            "orgID": "704401953",
            "active": true,
            "lastName": "Barker",
            "firstName": "Garrett",
            "id": 94132
        },
        {
            "orgID": "704881882",
            "active": true,
            "lastName": "Barnes",
            "firstName": "Krystopher",
            "id": 221846
        },
        {
            "orgID": "004907475",
            "active": true,
            "lastName": "Beadles",
            "firstName": "Connor",
            "id": 379329
        },
        {
            "orgID": "304716238",
            "active": true,
            "lastName": "Belanger",
            "firstName": "Eloise",
            "id": 397257
        },
        {
            "orgID": "604925264",
            "active": true,
            "lastName": "Bellamy",
            "firstName": "Lucas",
            "id": 426825
        },
        {
            "orgID": "204975048",
            "active": true,
            "lastName": "Bellinghausen",
            "firstName": "Isabella",
            "id": 426858
        },
        {
            "orgID": "204712518",
            "active": true,
            "lastName": "Beltrez",
            "firstName": "Dominique",
            "id": 397240
        },
        {
            "orgID": "904549760",
            "active": true,
            "lastName": "Bent",
            "firstName": "Jahmea",
            "id": 426879
        },
        {
            "orgID": "604556238",
            "active": true,
            "lastName": "Bernard",
            "firstName": "Idrees",
            "id": 397285
        },
        {
            "orgID": "504771016",
            "active": true,
            "lastName": "Bernd",
            "firstName": "Kelly",
            "id": 397278
        },
        {
            "orgID": "504910574",
            "active": true,
            "lastName": "Bernstein",
            "firstName": "Leila",
            "id": 426804
        },
        {
            "orgID": "304783355",
            "active": true,
            "lastName": "Beyer",
            "firstName": "Josie",
            "id": 397258
        },
        {
            "orgID": "104447096",
            "active": true,
            "lastName": "Billings",
            "firstName": "Monique",
            "id": 85908
        },
        {
            "orgID": "604413268",
            "active": true,
            "lastName": "Bird",
            "firstName": "Jake",
            "id": 94134
        },
        {
            "orgID": "004705316",
            "active": true,
            "lastName": "Bishov",
            "firstName": "Chase",
            "id": 397224
        },
        {
            "orgID": "504600345",
            "active": true,
            "lastName": "Blacker",
            "firstName": "Kelsey",
            "id": 397276
        },
        {
            "orgID": "904417203",
            "active": true,
            "lastName": "Blake",
            "firstName": "Ashlie",
            "id": 397306
        },
        {
            "orgID": "904900672",
            "active": true,
            "lastName": "Bling",
            "firstName": "Devondeep",
            "id": 426823
        },
        {
            "orgID": "804828399",
            "active": true,
            "lastName": "Blunt",
            "firstName": "John Carter",
            "id": 397304
        },
        {
            "orgID": "904465331",
            "active": true,
            "lastName": "Bornstein",
            "firstName": "Zachary ",
            "id": 83789
        },
        {
            "orgID": "105065104",
            "active": true,
            "lastName": "Brandt",
            "firstName": "Robert",
            "id": 450832
        },
        {
            "orgID": "304456787",
            "active": true,
            "lastName": "Bronkhorst",
            "firstName": "Sierra",
            "id": 397252
        },
        {
            "orgID": "905072695",
            "active": true,
            "lastName": "Broomfield",
            "firstName": "Ayan",
            "id": 445697
        },
        {
            "orgID": "005064548",
            "active": true,
            "lastName": "Brown",
            "firstName": "Antonio",
            "id": 379331
        },
        {
            "orgID": "004906169",
            "active": true,
            "lastName": "Brozyna-Vilim",
            "firstName": "Felix",
            "id": 426777
        },
        {
            "orgID": "504899642",
            "active": true,
            "lastName": "Brzykcy",
            "firstName": "Lauren",
            "id": 426859
        },
        {
            "orgID": "904934144",
            "active": true,
            "lastName": "Buckley",
            "firstName": "Caitlin",
            "id": 498299
        },
        {
            "orgID": "304715837",
            "active": true,
            "lastName": "Budgett",
            "firstName": "Saskia",
            "id": 397256
        },
        {
            "orgID": "504408314",
            "active": true,
            "lastName": "Buechler",
            "firstName": "Reily",
            "id": 397272
        },
        {
            "orgID": "804600589",
            "active": true,
            "lastName": "Burke",
            "firstName": "Colin",
            "id": 397303
        },
        {
            "orgID": "404565309",
            "active": true,
            "lastName": "Burke",
            "firstName": "Kennedy ",
            "id": 172261
        },
        {
            "orgID": "804571445",
            "active": true,
            "lastName": "Burke, II",
            "firstName": "Michael James",
            "id": 397300
        },
        {
            "orgID": "604420792",
            "active": true,
            "lastName": "Burnham",
            "firstName": "Madeline",
            "id": 397282
        },
        {
            "orgID": "105032646",
            "active": true,
            "lastName": "Burton",
            "firstName": "Austin",
            "id": 367446
        },
        {
            "orgID": "004881871",
            "active": true,
            "lastName": "Burton",
            "firstName": "Brandon",
            "id": 221841
        },
        {
            "orgID": "704881877",
            "active": true,
            "lastName": "Burton",
            "firstName": "Jacob",
            "id": 221847
        },
        {
            "orgID": "004405030",
            "active": true,
            "lastName": "Butler",
            "firstName": "Jelvon",
            "id": 397217
        },
        {
            "orgID": "804652615",
            "active": true,
            "lastName": "Byrge",
            "firstName": "Zachary",
            "id": 186371
        },
        {
            "orgID": "304899332",
            "active": true,
            "lastName": "Cain",
            "firstName": "Emma",
            "id": 426869
        },
        {
            "orgID": "004728817",
            "active": true,
            "lastName": "Caire",
            "firstName": "Maria",
            "id": 397226
        },
        {
            "orgID": "904448841",
            "active": true,
            "lastName": "Canada",
            "firstName": "Jordin",
            "id": 85274
        },
        {
            "orgID": "104740767",
            "active": true,
            "lastName": "Canales",
            "firstName": "Marley",
            "id": 397234
        },
        {
            "orgID": "704902813",
            "active": true,
            "lastName": "Cannon",
            "firstName": "Claire",
            "id": 426805
        },
        {
            "orgID": "204602794",
            "active": true,
            "lastName": "Carey",
            "firstName": "Isabelle",
            "id": 397238
        },
        {
            "orgID": "004969944",
            "active": true,
            "lastName": "Carr",
            "firstName": "Allison",
            "id": 426806
        },
        {
            "orgID": "604964528",
            "active": true,
            "lastName": "Carter",
            "firstName": "Paige",
            "id": 426831
        },
        {
            "orgID": "605066950",
            "active": true,
            "lastName": "Casarotto",
            "firstName": "Ilaria",
            "id": 426832
        },
        {
            "orgID": "004893001",
            "active": true,
            "lastName": "Casavant",
            "firstName": "Logen",
            "id": 397227
        },
        {
            "orgID": "104631476",
            "active": true,
            "lastName": "Castaneda",
            "firstName": "Chloe",
            "id": 397232
        },
        {
            "orgID": "504412778",
            "active": true,
            "lastName": "Cerda",
            "firstName": "MacKenzie",
            "id": 397273
        },
        {
            "orgID": "404409347",
            "active": true,
            "lastName": "Chavez",
            "firstName": "Christian",
            "id": 81819
        },
        {
            "orgID": "104993514",
            "active": true,
            "lastName": "Chellis",
            "firstName": "Jillian",
            "id": 426807
        },
        {
            "orgID": "104717494",
            "active": true,
            "lastName": "Chenault",
            "firstName": "Christina",
            "id": 397233
        },
        {
            "orgID": "404965492",
            "active": true,
            "lastName": "Chin",
            "firstName": "Kimberlee",
            "id": 426808
        },
        {
            "orgID": "004407656",
            "active": true,
            "lastName": "Choi",
            "firstName": "Erin",
            "id": 397218
        },
        {
            "orgID": "804447941",
            "active": true,
            "lastName": "Choi",
            "firstName": "Lydia",
            "id": 397299
        },
        {
            "orgID": "204787815",
            "active": true,
            "lastName": "Chung",
            "firstName": "Emily",
            "id": 397245
        },
        {
            "orgID": "005031082",
            "active": true,
            "lastName": "Cochrun",
            "firstName": "Zachary",
            "id": 379333
        },
        {
            "orgID": "604702027",
            "active": true,
            "lastName": "Collier",
            "firstName": "Tyler",
            "id": 397286
        },
        {
            "orgID": "704889958",
            "active": true,
            "lastName": "Corsaro",
            "firstName": "Lindsey",
            "id": 248344
        },
        {
            "orgID": "104559135",
            "active": true,
            "lastName": "Costello",
            "firstName": "Elizabeth",
            "id": 397231
        },
        {
            "orgID": "505257441",
            "active": true,
            "lastName": "Cota",
            "firstName": "Chase",
            "id": 563526
        },
        {
            "orgID": "404750948",
            "active": true,
            "lastName": "Crawford",
            "firstName": "Jenna",
            "id": 268625
        },
        {
            "orgID": "804578994",
            "active": true,
            "lastName": "Cressy, Sr.",
            "firstName": "Maxime Andre Charles",
            "id": 397301
        },
        {
            "orgID": "404900354",
            "active": true,
            "lastName": "Crouch",
            "firstName": "Anne",
            "id": 426770
        },
        {
            "orgID": "904769342",
            "active": true,
            "lastName": "Cuellar",
            "firstName": "Kyle",
            "id": 333762
        },
        {
            "orgID": "104418800",
            "active": true,
            "lastName": "Cushing-Murray",
            "firstName": "Jessica",
            "id": 397230
        },
        {
            "orgID": "904817022",
            "active": true,
            "lastName": "Davila Mejia",
            "firstName": "Irene",
            "id": 397309
        },
        {
            "orgID": "004417274",
            "active": true,
            "lastName": "Davis",
            "firstName": "Kaelin",
            "id": 397219
        },
        {
            "orgID": "404275734",
            "active": true,
            "lastName": "Davis",
            "firstName": "Maxwell",
            "id": 397260
        },
        {
            "orgID": "505038156",
            "active": true,
            "lastName": "Dean",
            "firstName": "Japreece",
            "id": 330787
        },
        {
            "orgID": "604381408",
            "active": true,
            "lastName": "De La Torre",
            "firstName": "Daniel",
            "id": 397281
        },
        {
            "orgID": "204560671",
            "active": true,
            "lastName": "Delisi",
            "firstName": "Philip",
            "id": 397237
        },
        {
            "orgID": "004465415",
            "active": true,
            "lastName": "Delisle",
            "firstName": "Marie-Pierre",
            "id": 397220
        },
        {
            "orgID": "104802307",
            "active": true,
            "lastName": "Demski",
            "firstName": "Clayton",
            "id": 266442
        },
        {
            "orgID": "104881880",
            "active": true,
            "lastName": "Den Bleyker",
            "firstName": "Jonathan",
            "id": 221848
        },
        {
            "orgID": "504452585",
            "active": true,
            "lastName": "Denison-Johnston",
            "firstName": "Sophia",
            "id": 397274
        },
        {
            "orgID": "404937362",
            "active": true,
            "lastName": "Dennis",
            "firstName": "Nia",
            "id": 426850
        },
        {
            "orgID": "104415670",
            "active": true,
            "lastName": "Dennis",
            "firstName": "Rechelle",
            "id": 397229
        },
        {
            "orgID": "904901327",
            "active": true,
            "lastName": "DeRoos",
            "firstName": "Matthew",
            "id": 426833
        },
        {
            "orgID": "205091348",
            "active": true,
            "lastName": "Desiano",
            "firstName": "Madelyn",
            "id": 531327
        },
        {
            "orgID": "904750564",
            "active": true,
            "lastName": "Deverian",
            "firstName": "Connor",
            "id": 397308
        },
        {
            "orgID": "404805494",
            "active": true,
            "lastName": "Dodson",
            "firstName": "Armani",
            "id": 295138
        },
        {
            "orgID": "305069097",
            "active": true,
            "lastName": "Douglas",
            "firstName": "Cameron",
            "id": 426787
        },
        {
            "orgID": "805062705",
            "active": true,
            "lastName": "Doyle",
            "firstName": "Sharon",
            "id": 426809
        },
        {
            "orgID": "404440550",
            "active": true,
            "lastName": "Drummer",
            "firstName": "Lajahna",
            "id": 85276
        },
        {
            "orgID": "804900719",
            "active": true,
            "lastName": "Dunn",
            "firstName": "Faith",
            "id": 426870
        },
        {
            "orgID": "204742539",
            "active": true,
            "lastName": "Dunphy",
            "firstName": "Sunny",
            "id": 397242
        },
        {
            "orgID": "404738150",
            "active": true,
            "lastName": "Durgy",
            "firstName": "Cassandra",
            "id": 397269
        },
        {
            "orgID": "204715847",
            "active": true,
            "lastName": "Edwards",
            "firstName": "Kyra",
            "id": 397241
        },
        {
            "orgID": "804770181",
            "active": true,
            "lastName": "Ehrenberg",
            "firstName": "Andy",
            "id": 455535
        },
        {
            "orgID": "304254336",
            "active": true,
            "lastName": "Elder",
            "firstName": "Hannah",
            "id": 397250
        },
        {
            "orgID": "904409646",
            "active": true,
            "lastName": "English",
            "firstName": "Jasmine",
            "id": 397305
        },
        {
            "orgID": "704560697",
            "active": true,
            "lastName": "Escalas",
            "firstName": "Elena",
            "id": 397295
        },
        {
            "orgID": "604748006",
            "active": true,
            "lastName": "Esparza",
            "firstName": "Nathan",
            "id": 397289
        },
        {
            "orgID": "404762994",
            "active": true,
            "lastName": "Evans",
            "firstName": "Haley",
            "id": 397270
        },
        {
            "orgID": "804941890",
            "active": true,
            "lastName": "Fancey",
            "firstName": "Michael",
            "id": 426834
        },
        {
            "orgID": "604989053",
            "active": true,
            "lastName": "Farrell",
            "firstName": "Chase",
            "id": 426795
        },
        {
            "orgID": "204963502",
            "active": true,
            "lastName": "Faulknor",
            "firstName": "Kennedy",
            "id": 426860
        },
        {
            "orgID": "104280299",
            "active": true,
            "lastName": "Felix",
            "firstName": "Angelica",
            "id": 52287
        },
        {
            "orgID": "204754495",
            "active": true,
            "lastName": "Feller",
            "firstName": "Evan",
            "id": 397244
        },
        {
            "orgID": "204879476",
            "active": true,
            "lastName": "Felton",
            "firstName": "Demetric",
            "id": 221860
        },
        {
            "orgID": "204883124",
            "active": true,
            "lastName": "Fernea",
            "firstName": "Ethan",
            "id": 266440
        },
        {
            "orgID": "604452189",
            "active": true,
            "lastName": "Fieberling",
            "firstName": "Emily",
            "id": 397284
        },
        {
            "orgID": "004602766",
            "active": true,
            "lastName": "Fina",
            "firstName": "Clare",
            "id": 397222
        },
        {
            "orgID": "304539740",
            "active": true,
            "lastName": "Fisher",
            "firstName": "Denzel",
            "id": 72911
        },
        {
            "orgID": "404804003",
            "active": true,
            "lastName": "Fleming",
            "firstName": "Jessie",
            "id": 397351
        },
        {
            "orgID": "504548338",
            "active": true,
            "lastName": "Fleming",
            "firstName": "Terri",
            "id": 397355
        },
        {
            "orgID": "904454281",
            "active": true,
            "lastName": "Flintoft",
            "firstName": "Stefan",
            "id": 83790
        },
        {
            "orgID": "905257444",
            "active": true,
            "lastName": "Flynn",
            "firstName": "Shana",
            "id": 563534
        },
        {
            "orgID": "304899723",
            "active": true,
            "lastName": "Foster",
            "firstName": "Lia",
            "id": 426871
        },
        {
            "orgID": "904926021",
            "active": true,
            "lastName": "Frank",
            "firstName": "Juliette",
            "id": 426810
        },
        {
            "orgID": "604611126",
            "active": true,
            "lastName": "Frazier",
            "firstName": "Lana",
            "id": 397369
        },
        {
            "orgID": "204610888",
            "active": true,
            "lastName": "Fullerton",
            "firstName": "Shalyn",
            "id": 397331
        },
        {
            "orgID": "704650508",
            "active": true,
            "lastName": "Gadsby",
            "firstName": "Brian",
            "id": 191838
        },
        {
            "orgID": "404813314",
            "active": true,
            "lastName": "Galdiano",
            "firstName": "Mariel",
            "id": 397352
        },
        {
            "orgID": "004597251",
            "active": true,
            "lastName": "Garcia",
            "firstName": "Rachel",
            "id": 96056
        },
        {
            "orgID": "704795672",
            "active": true,
            "lastName": "Garcia",
            "firstName": "Ryan",
            "id": 333763
        },
        {
            "orgID": "404601920",
            "active": true,
            "lastName": "Garner",
            "firstName": "Jacqueline",
            "id": 397348
        },
        {
            "orgID": "004485729",
            "active": true,
            "lastName": "Garrett",
            "firstName": "Elleyse",
            "id": 397314
        },
        {
            "orgID": "705062560",
            "active": true,
            "lastName": "Gates",
            "firstName": "Elijah",
            "id": 379334
        },
        {
            "orgID": "904729879",
            "active": true,
            "lastName": "Gates",
            "firstName": "Madeleine",
            "id": 397399
        },
        {
            "orgID": "404539730",
            "active": true,
            "lastName": "Gentosi",
            "firstName": "Giovanni",
            "id": 86673
        },
        {
            "orgID": "805064549",
            "active": true,
            "lastName": "Gibbs",
            "firstName": "Joe",
            "id": 379335
        },
        {
            "orgID": "004642183",
            "active": true,
            "lastName": "Gleason",
            "firstName": "Patrick",
            "id": 397317
        },
        {
            "orgID": "804780255",
            "active": true,
            "lastName": "Glenn",
            "firstName": "Anna",
            "id": 397395
        },
        {
            "orgID": "504780252",
            "active": true,
            "lastName": "Glenn",
            "firstName": "Grace",
            "id": 397360
        },
        {
            "orgID": "104934685",
            "active": true,
            "lastName": "Glick",
            "firstName": "Samuel",
            "id": 426796
        },
        {
            "orgID": "504830619",
            "active": true,
            "lastName": "Goldberg",
            "firstName": "Benjamin",
            "id": 397363
        },
        {
            "orgID": "404906153",
            "active": true,
            "lastName": "Goldblatt",
            "firstName": "Allison",
            "id": 426872
        },
        {
            "orgID": "604605781",
            "active": true,
            "lastName": "Goldenberg",
            "firstName": "Eric",
            "id": 397368
        },
        {
            "orgID": "504538914",
            "active": true,
            "lastName": "Goloman",
            "firstName": "Gyorgy",
            "id": 290279
        },
        {
            "orgID": "305063222",
            "active": true,
            "lastName": "Gonzalez",
            "firstName": "Sofia",
            "id": 426851
        },
        {
            "orgID": "704983423",
            "active": true,
            "lastName": "Goodman",
            "firstName": "Audrey",
            "id": 498294
        },
        {
            "orgID": "904417024",
            "active": true,
            "lastName": "Grab",
            "firstName": "Devin",
            "id": 397396
        },
        {
            "orgID": "804401518",
            "active": true,
            "lastName": "Grauer",
            "firstName": "Johanna",
            "id": 69272
        },
        {
            "orgID": "604927357",
            "active": true,
            "lastName": "Gregory",
            "firstName": "Valia",
            "id": 498330
        },
        {
            "orgID": "904257450",
            "active": true,
            "lastName": "Grover",
            "firstName": "Jack",
            "id": 76062
        },
        {
            "orgID": "904422469",
            "active": true,
            "lastName": "Grover",
            "firstName": "Kaitlin",
            "id": 397397
        },
        {
            "orgID": "804723514",
            "active": true,
            "lastName": "Gustafson",
            "firstName": "Kendall",
            "id": 397390
        },
        {
            "orgID": "804729808",
            "active": true,
            "lastName": "Gyimah",
            "firstName": "Daenan",
            "id": 397391
        },
        {
            "orgID": "004402767",
            "active": true,
            "lastName": "Hadley",
            "firstName": "Nathan ",
            "id": 94144
        },
        {
            "orgID": "604407719",
            "active": true,
            "lastName": "Hall",
            "firstName": "Napualani",
            "id": 397366
        },
        {
            "orgID": "004901708",
            "active": true,
            "lastName": "Halligan",
            "firstName": "Bronte",
            "id": 397322
        },
        {
            "orgID": "604564375",
            "active": true,
            "lastName": "Halstead",
            "firstName": "Kathryn ",
            "id": 96208
        },
        {
            "orgID": "304911937",
            "active": true,
            "lastName": "Hance",
            "firstName": "Kenneth",
            "id": 426826
        },
        {
            "orgID": "804961944",
            "active": true,
            "lastName": "Hands",
            "firstName": "Jaylen",
            "id": 426818
        },
        {
            "orgID": "604731218",
            "active": true,
            "lastName": "Hano",
            "firstName": "Felicia",
            "id": 397373
        },
        {
            "orgID": "704733165",
            "active": true,
            "lastName": "Harlan Buzzard",
            "firstName": "Fiona",
            "id": 397379
        },
        {
            "orgID": "204881182",
            "active": true,
            "lastName": "Hart",
            "firstName": "Jada",
            "id": 397334
        },
        {
            "orgID": "804465850",
            "active": true,
            "lastName": "Hart",
            "firstName": "Mikayla",
            "id": 397387
        },
        {
            "orgID": "104731206",
            "active": true,
            "lastName": "Haselman",
            "firstName": "Tyler",
            "id": 333764
        },
        {
            "orgID": "404404892",
            "active": true,
            "lastName": "Hatch",
            "firstName": "John",
            "id": 197713
        },
        {
            "orgID": "204457037",
            "active": true,
            "lastName": "Hayes",
            "firstName": "Kelli",
            "id": 85277
        },
        {
            "orgID": "604630182",
            "active": true,
            "lastName": "Hazell",
            "firstName": "Louise",
            "id": 397371
        },
        {
            "orgID": "304638858",
            "active": true,
            "lastName": "Hearn",
            "firstName": "Ashley",
            "id": 165565
        },
        {
            "orgID": "504559299",
            "active": true,
            "lastName": "Hebert",
            "firstName": "Lillianna",
            "id": 397356
        },
        {
            "orgID": "004411738",
            "active": true,
            "lastName": "Hemingway",
            "firstName": "Chloe",
            "id": 397313
        },
        {
            "orgID": "604597494",
            "active": true,
            "lastName": "Henderson",
            "firstName": "Suzannah",
            "id": 397367
        },
        {
            "orgID": "004715848",
            "active": true,
            "lastName": "Henneke",
            "firstName": "Tobias",
            "id": 397318
        },
        {
            "orgID": "904910218",
            "active": true,
            "lastName": "Henriksson",
            "firstName": "Luke",
            "id": 426778
        },
        {
            "orgID": "504878913",
            "active": true,
            "lastName": "Hernandez",
            "firstName": "Julia",
            "id": 397365
        },
        {
            "orgID": "504489843",
            "active": true,
            "lastName": "Herrera",
            "firstName": "Joe",
            "id": 397354
        },
        {
            "orgID": "705071277",
            "active": true,
            "lastName": "Herrera",
            "firstName": "Santiago",
            "id": 445698
        },
        {
            "orgID": "904402503",
            "active": true,
            "lastName": "Hessenauer",
            "firstName": "Christian",
            "id": 197718
        },
        {
            "orgID": "305010691",
            "active": true,
            "lastName": "Hile",
            "firstName": "Abby",
            "id": 498291
        },
        {
            "orgID": "004938288",
            "active": true,
            "lastName": "Hill",
            "firstName": "Jacquelyn",
            "id": 426835
        },
        {
            "orgID": "104974780",
            "active": true,
            "lastName": "Hill",
            "firstName": "Jalen",
            "id": 426819
        },
        {
            "orgID": "004918643",
            "active": true,
            "lastName": "Hinmon",
            "firstName": "Alexandria",
            "id": 426811
        },
        {
            "orgID": "004584244",
            "active": true,
            "lastName": "Hirabayashi",
            "firstName": "Jake",
            "id": 191839
        },
        {
            "orgID": "604608435",
            "active": true,
            "lastName": "Holiday",
            "firstName": "Aaron",
            "id": 290281
        },
        {
            "orgID": "004748405",
            "active": true,
            "lastName": "Holloway",
            "firstName": "Sarah",
            "id": 397319
        },
        {
            "orgID": "405050648",
            "active": true,
            "lastName": "Holmes",
            "firstName": "Darnay",
            "id": 335204
        },
        {
            "orgID": "504796210",
            "active": true,
            "lastName": "Holmes",
            "firstName": "Isaiah",
            "id": 397362
        },
        {
            "orgID": "704763930",
            "active": true,
            "lastName": "Holroyd",
            "firstName": "Chanti",
            "id": 397380
        },
        {
            "orgID": "604631761",
            "active": true,
            "lastName": "Holt",
            "firstName": "Erik",
            "id": 397372
        },
        {
            "orgID": "004401904",
            "active": true,
            "lastName": "Honest",
            "firstName": "JaNay",
            "id": 397312
        },
        {
            "orgID": "405003384",
            "active": true,
            "lastName": "Honng",
            "firstName": "Emily",
            "id": 426873
        },
        {
            "orgID": "904575589",
            "active": true,
            "lastName": "Hooper",
            "firstName": "Justin",
            "id": 191840
        },
        {
            "orgID": "804992667",
            "active": true,
            "lastName": "Horvat",
            "firstName": "Chantel-Anais",
            "id": 426766
        },
        {
            "orgID": "104901091",
            "active": true,
            "lastName": "House",
            "firstName": "Emily",
            "id": 426874
        },
        {
            "orgID": "605013971",
            "active": true,
            "lastName": "House",
            "firstName": "Samantha",
            "id": 498327
        },
        {
            "orgID": "104733818",
            "active": true,
            "lastName": "Howard",
            "firstName": "Theo",
            "id": 206864
        },
        {
            "orgID": "404996686",
            "active": true,
            "lastName": "Hummel",
            "firstName": "Margarethe",
            "id": 426875
        },
        {
            "orgID": "704811375",
            "active": true,
            "lastName": "Hurst",
            "firstName": "Jenna",
            "id": 397381
        },
        {
            "orgID": "505063768",
            "active": true,
            "lastName": "Iloski",
            "firstName": "Eric",
            "id": 426788
        },
        {
            "orgID": "905063771",
            "active": true,
            "lastName": "Iloski",
            "firstName": "Milan",
            "id": 426789
        },
        {
            "orgID": "004428994",
            "active": true,
            "lastName": "Inoue",
            "firstName": "Kent",
            "id": 81025
        },
        {
            "orgID": "405071518",
            "active": true,
            "lastName": "Ireland",
            "firstName": "Jackson",
            "id": 445699
        },
        {
            "orgID": "704892135",
            "active": true,
            "lastName": "Isackson",
            "firstName": "Lauren",
            "id": 397383
        },
        {
            "orgID": "505062561",
            "active": true,
            "lastName": "Isibor",
            "firstName": "Igbinoghodua",
            "id": 379391
        },
        {
            "orgID": "004907852",
            "active": true,
            "lastName": "Jaggers",
            "firstName": "James",
            "id": 331938
        },
        {
            "orgID": "204707357",
            "active": true,
            "lastName": "Jamabo",
            "firstName": "Soso",
            "id": 152809
        },
        {
            "orgID": "004707358",
            "active": true,
            "lastName": "James",
            "firstName": "Andre",
            "id": 152810
        },
        {
            "orgID": "004890328",
            "active": true,
            "lastName": "Jameson",
            "firstName": "Maisie",
            "id": 397321
        },
        {
            "orgID": "804750197",
            "active": true,
            "lastName": "Janes",
            "firstName": "Tyler",
            "id": 397394
        },
        {
            "orgID": "004900539",
            "active": true,
            "lastName": "Jarvis",
            "firstName": "Bailey",
            "id": 426779
        },
        {
            "orgID": "104464420",
            "active": true,
            "lastName": "Jasper-Baylin",
            "firstName": "Alexis",
            "id": 397325
        },
        {
            "orgID": "304413024",
            "active": true,
            "lastName": "Jelenicki",
            "firstName": "Madeline",
            "id": 69273
        },
        {
            "orgID": "104604958",
            "active": true,
            "lastName": "Jenkins",
            "firstName": "Chloe",
            "id": 397327
        },
        {
            "orgID": "904578248",
            "active": true,
            "lastName": "Jepson",
            "firstName": "Lucy",
            "id": 397398
        },
        {
            "orgID": "104890163",
            "active": true,
            "lastName": "Johns",
            "firstName": "Gavin",
            "id": 333765
        },
        {
            "orgID": "304573871",
            "active": true,
            "lastName": "Johnson",
            "firstName": "Imani",
            "id": 99246
        },
        {
            "orgID": "404401346",
            "active": true,
            "lastName": "Johnson",
            "firstName": "Mossi",
            "id": 70941
        },
        {
            "orgID": "105062657",
            "active": true,
            "lastName": "Johnson",
            "firstName": "Rahyme",
            "id": 379398
        },
        {
            "orgID": "604707360",
            "active": true,
            "lastName": "Johnson III",
            "firstName": "Stephen",
            "id": 152811
        },
        {
            "orgID": "004569795",
            "active": true,
            "lastName": "Jones",
            "firstName": "Malcolm",
            "id": 397316
        },
        {
            "orgID": "204902957",
            "active": true,
            "lastName": "Jones",
            "firstName": "Maya",
            "id": 498322
        },
        {
            "orgID": "204754339",
            "active": true,
            "lastName": "Jones",
            "firstName": "Samuel",
            "id": 397333
        },
        {
            "orgID": "104807772",
            "active": true,
            "lastName": "Jordan",
            "firstName": "Aaliyah",
            "id": 268619
        },
        {
            "orgID": "204880371",
            "active": true,
            "lastName": "Juarez",
            "firstName": "Michael",
            "id": 221849
        },
        {
            "orgID": "305065056",
            "active": true,
            "lastName": "Juels",
            "firstName": "Nicholas",
            "id": 379399
        },
        {
            "orgID": "504787201",
            "active": true,
            "lastName": "Justine",
            "firstName": "Lily",
            "id": 397361
        },
        {
            "orgID": "304634983",
            "active": true,
            "lastName": "Kapana",
            "firstName": "Carlee",
            "id": 397338
        },
        {
            "orgID": "404914921",
            "active": true,
            "lastName": "Karlous",
            "firstName": "Rebecca",
            "id": 426852
        },
        {
            "orgID": "404731988",
            "active": true,
            "lastName": "Kaunitz",
            "firstName": "Lisa",
            "id": 397349
        },
        {
            "orgID": "104471623",
            "active": true,
            "lastName": "Kaunitz",
            "firstName": "Sarah",
            "id": 397326
        },
        {
            "orgID": "404633054",
            "active": true,
            "lastName": "Kay",
            "firstName": "Jonah",
            "id": 197711
        },
        {
            "orgID": "905073044",
            "active": true,
            "lastName": "Kelley ",
            "firstName": "Joshua ",
            "id": 442744
        },
        {
            "orgID": "504746220",
            "active": true,
            "lastName": "Kelly",
            "firstName": "Riley",
            "id": 397358
        },
        {
            "orgID": "104926992",
            "active": true,
            "lastName": "Kendall",
            "firstName": "Kevin",
            "id": 426797
        },
        {
            "orgID": "304746650",
            "active": true,
            "lastName": "Kent",
            "firstName": "Austin",
            "id": 221850
        },
        {
            "orgID": "905063342",
            "active": true,
            "lastName": "Kinder",
            "firstName": "Cole",
            "id": 379401
        },
        {
            "orgID": "404576440",
            "active": true,
            "lastName": "Knights",
            "firstName": "Robert",
            "id": 397346
        },
        {
            "orgID": "705058695",
            "active": true,
            "lastName": "Knox",
            "firstName": "Alexander",
            "id": 397384
        },
        {
            "orgID": "104751925",
            "active": true,
            "lastName": "Kobrine",
            "firstName": "Samuel",
            "id": 397328
        },
        {
            "orgID": "204707362",
            "active": true,
            "lastName": "Kocian",
            "firstName": "Madison",
            "id": 397332
        },
        {
            "orgID": "204974572",
            "active": true,
            "lastName": "Kooyman",
            "firstName": "Savannah",
            "id": 426853
        },
        {
            "orgID": "404888390",
            "active": true,
            "lastName": "Kramer",
            "firstName": "Grace",
            "id": 397353
        },
        {
            "orgID": "704809344",
            "active": true,
            "lastName": "Kreidler",
            "firstName": "Ryan",
            "id": 333766
        },
        {
            "orgID": "804738431",
            "active": true,
            "lastName": "Kuehnel",
            "firstName": "Chance",
            "id": 397393
        },
        {
            "orgID": "004562143",
            "active": true,
            "lastName": "Kwok",
            "firstName": "Sabrina",
            "id": 397315
        },
        {
            "orgID": "404906742",
            "active": true,
            "lastName": "Lai",
            "firstName": "Eddy",
            "id": 426824
        },
        {
            "orgID": "104974271",
            "active": true,
            "lastName": "Lake",
            "firstName": "Quentin",
            "id": 379406
        },
        {
            "orgID": "704539719",
            "active": true,
            "lastName": "Lasley",
            "firstName": "Jordan",
            "id": 72913
        },
        {
            "orgID": "004904108",
            "active": true,
            "lastName": "Lathrop",
            "firstName": "Jennifer",
            "id": 426876
        },
        {
            "orgID": "404049784",
            "active": true,
            "lastName": "Lee",
            "firstName": "Christine",
            "id": 397342
        },
        {
            "orgID": "104882605",
            "active": true,
            "lastName": "Lee",
            "firstName": "Dymond",
            "id": 221857
        },
        {
            "orgID": "504764676",
            "active": true,
            "lastName": "Lefebvre-Oatis",
            "firstName": "Mikella",
            "id": 397359
        },
        {
            "orgID": "404781129",
            "active": true,
            "lastName": "Legaspi",
            "firstName": "Clare",
            "id": 397350
        },
        {
            "orgID": "304388901",
            "active": true,
            "lastName": "Lewis",
            "firstName": "Ashley",
            "id": 397337
        },
        {
            "orgID": "704905034",
            "active": true,
            "lastName": "Liebowitz",
            "firstName": "Alexis",
            "id": 426880
        },
        {
            "orgID": "905032647",
            "active": true,
            "lastName": "Light",
            "firstName": "Alexis",
            "id": 397400
        },
        {
            "orgID": "004881908",
            "active": true,
            "lastName": "Litzell",
            "firstName": "Carl Simon",
            "id": 397320
        },
        {
            "orgID": "504726953",
            "active": true,
            "lastName": "Liu",
            "firstName": "Kenisha",
            "id": 397357
        },
        {
            "orgID": "904981649",
            "active": true,
            "lastName": "LoCastro",
            "firstName": "Alexa",
            "id": 426812
        },
        {
            "orgID": "104907856",
            "active": true,
            "lastName": "LoCastro",
            "firstName": "Daniela",
            "id": 397329
        },
        {
            "orgID": "804707364",
            "active": true,
            "lastName": "Lockett",
            "firstName": "Will",
            "id": 152812
        },
        {
            "orgID": "204965285",
            "active": true,
            "lastName": "Loren",
            "firstName": "Kira",
            "id": 426837
        },
        {
            "orgID": "305066310",
            "active": true,
            "lastName": "Lovas",
            "firstName": "Peter",
            "id": 426780
        },
        {
            "orgID": "504707365",
            "active": true,
            "lastName": "Lucier-South",
            "firstName": "Keisean",
            "id": 152813
        },
        {
            "orgID": "004879024",
            "active": true,
            "lastName": "Lynch",
            "firstName": "Matthew",
            "id": 221862
        },
        {
            "orgID": "904609848",
            "active": true,
            "lastName": "Ma'a",
            "firstName": "Micah",
            "id": 197716
        },
        {
            "orgID": "504600779",
            "active": true,
            "lastName": "Mace",
            "firstName": "Hailie",
            "id": 397450
        },
        {
            "orgID": "004565919",
            "active": true,
            "lastName": "Madey",
            "firstName": "Austin",
            "id": 397405
        },
        {
            "orgID": "804540406",
            "active": true,
            "lastName": "Maduka",
            "firstName": "Jessie",
            "id": 397474
        },
        {
            "orgID": "004884803",
            "active": true,
            "lastName": "Mahon",
            "firstName": "Harrison",
            "id": 397410
        },
        {
            "orgID": "704409529",
            "active": true,
            "lastName": "Mai",
            "firstName": "Brandon",
            "id": 397465
        },
        {
            "orgID": "604904006",
            "active": true,
            "lastName": "Maleski",
            "firstName": "Grant",
            "id": 426759
        },
        {
            "orgID": "404571503",
            "active": true,
            "lastName": "Maneatis",
            "firstName": "Melissa",
            "id": 397441
        },
        {
            "orgID": "804903831",
            "active": true,
            "lastName": "Markevich",
            "firstName": "Vera",
            "id": 426848
        },
        {
            "orgID": "104789928",
            "active": true,
            "lastName": "Markey",
            "firstName": "Claire",
            "id": 397421
        },
        {
            "orgID": "405064551",
            "active": true,
            "lastName": "Marrazzo",
            "firstName": "Samuel",
            "id": 379409
        },
        {
            "orgID": "304584407",
            "active": true,
            "lastName": "Marshall",
            "firstName": "Damion",
            "id": 397435
        },
        {
            "orgID": "104265406",
            "active": true,
            "lastName": "Martin",
            "firstName": "Oliver",
            "id": 62171
        },
        {
            "orgID": "105069927",
            "active": true,
            "lastName": "Martin",
            "firstName": "Roman",
            "id": 426790
        },
        {
            "orgID": "004565759",
            "active": true,
            "lastName": "Martinez",
            "firstName": "Blayne",
            "id": 397404
        },
        {
            "orgID": "904565707",
            "active": true,
            "lastName": "Martinez",
            "firstName": "Cole",
            "id": 397484
        },
        {
            "orgID": "604411269",
            "active": true,
            "lastName": "Marumoto",
            "firstName": "Samantha",
            "id": 397455
        },
        {
            "orgID": "004427918",
            "active": true,
            "lastName": "Matheis",
            "firstName": "Eric",
            "id": 197712
        },
        {
            "orgID": "704405526",
            "active": true,
            "lastName": "Matulich",
            "firstName": "Gabrielle",
            "id": 397464
        },
        {
            "orgID": "804794083",
            "active": true,
            "lastName": "Maxson",
            "firstName": "Brooke",
            "id": 397478
        },
        {
            "orgID": "404910621",
            "active": true,
            "lastName": "May",
            "firstName": "Mackenzie",
            "id": 426772
        },
        {
            "orgID": "004735912",
            "active": true,
            "lastName": "McAuley",
            "firstName": "Grace",
            "id": 397408
        },
        {
            "orgID": "804887906",
            "active": true,
            "lastName": "McClure",
            "firstName": "Will",
            "id": 285940
        },
        {
            "orgID": "104934195",
            "active": true,
            "lastName": "McCord",
            "firstName": "Kaylee",
            "id": 498319
        },
        {
            "orgID": "904755868",
            "active": true,
            "lastName": "McCullough",
            "firstName": "Kaiya",
            "id": 397488
        },
        {
            "orgID": "904751422",
            "active": true,
            "lastName": "McInerny",
            "firstName": "William",
            "id": 333768
        },
        {
            "orgID": "904652479",
            "active": true,
            "lastName": "Mcnamara",
            "firstName": "Megan",
            "id": 397485
        },
        {
            "orgID": "804652899",
            "active": true,
            "lastName": "Mcnamara",
            "firstName": "Nicole",
            "id": 397476
        },
        {
            "orgID": "004933276",
            "active": true,
            "lastName": "McQuarrie",
            "firstName": "Jamie",
            "id": 426843
        },
        {
            "orgID": "604564455",
            "active": true,
            "lastName": "McTaggart",
            "firstName": "Caroline",
            "id": 397457
        },
        {
            "orgID": "904705307",
            "active": true,
            "lastName": "Meadors",
            "firstName": "Nathan",
            "id": 152814
        },
        {
            "orgID": "604925947",
            "active": true,
            "lastName": "Meksto",
            "firstName": "Shelby",
            "id": 426813
        },
        {
            "orgID": "904415275",
            "active": true,
            "lastName": "Meraz",
            "firstName": "Sonya",
            "id": 397483
        },
        {
            "orgID": "405009687",
            "active": true,
            "lastName": "Meyer",
            "firstName": "Kennedy",
            "id": 551383
        },
        {
            "orgID": "204881907",
            "active": true,
            "lastName": "Micah",
            "firstName": "Teagan",
            "id": 397430
        },
        {
            "orgID": "505070405",
            "active": true,
            "lastName": "Michaelsen",
            "firstName": "Alex",
            "id": 379411
        },
        {
            "orgID": "504723520",
            "active": true,
            "lastName": "Miller",
            "firstName": "Alaina",
            "id": 397451
        },
        {
            "orgID": "204754382",
            "active": true,
            "lastName": "Miller",
            "firstName": "Kylie",
            "id": 397429
        },
        {
            "orgID": "905000910",
            "active": true,
            "lastName": "Miller",
            "firstName": "Lauryn",
            "id": 426767
        },
        {
            "orgID": "904707387",
            "active": true,
            "lastName": "Missry",
            "firstName": "Dylan",
            "id": 197715
        },
        {
            "orgID": "105000706",
            "active": true,
            "lastName": "Mitchell",
            "firstName": "Garrett",
            "id": 426798
        },
        {
            "orgID": "204891459",
            "active": true,
            "lastName": "Mitchell",
            "firstName": "Scott",
            "id": 397431
        },
        {
            "orgID": "204380929",
            "active": true,
            "lastName": "Moala",
            "firstName": "Poasi",
            "id": 49975
        },
        {
            "orgID": "104881875",
            "active": true,
            "lastName": "Modster",
            "firstName": "Devon",
            "id": 221863
        },
        {
            "orgID": "104611303",
            "active": true,
            "lastName": "Molnar",
            "firstName": "Kyle",
            "id": 191841
        },
        {
            "orgID": "404740271",
            "active": true,
            "lastName": "Molson",
            "firstName": "JJ",
            "id": 206865
        },
        {
            "orgID": "504416719",
            "active": true,
            "lastName": "Monahan",
            "firstName": "Ciara",
            "id": 397447
        },
        {
            "orgID": "904800205",
            "active": true,
            "lastName": "Mooney",
            "firstName": "Grant",
            "id": 397492
        },
        {
            "orgID": "404608785",
            "active": true,
            "lastName": "Moore",
            "firstName": "Madison",
            "id": 397443
        },
        {
            "orgID": "504881883",
            "active": true,
            "lastName": "Moore",
            "firstName": "Marcus",
            "id": 221842
        },
        {
            "orgID": "604713554",
            "active": true,
            "lastName": "Moore",
            "firstName": "Schuyler",
            "id": 397461
        },
        {
            "orgID": "104739797",
            "active": true,
            "lastName": "Mora",
            "firstName": "Kyle",
            "id": 333769
        },
        {
            "orgID": "804974387",
            "active": true,
            "lastName": "Morden",
            "firstName": "Kevin",
            "id": 496103
        },
        {
            "orgID": "504770583",
            "active": true,
            "lastName": "Morzenti",
            "firstName": "Christopher",
            "id": 397452
        },
        {
            "orgID": "205257433",
            "active": true,
            "lastName": "Moss",
            "firstName": "Jazmin",
            "id": 567013
        },
        {
            "orgID": "904930278",
            "active": true,
            "lastName": "Mosser",
            "firstName": "Jennifer",
            "id": 426773
        },
        {
            "orgID": "904336787",
            "active": true,
            "lastName": "Mossett",
            "firstName": "Hallie",
            "id": 397480
        },
        {
            "orgID": "204748433",
            "active": true,
            "lastName": "Mulligan",
            "firstName": "Quincey",
            "id": 397428
        },
        {
            "orgID": "804573388",
            "active": true,
            "lastName": "Muno",
            "firstName": "Susannah",
            "id": 397475
        },
        {
            "orgID": "904929406",
            "active": true,
            "lastName": "Muret",
            "firstName": "Megan",
            "id": 426844
        },
        {
            "orgID": "604579843",
            "active": true,
            "lastName": "Murphy",
            "firstName": "Patrick",
            "id": 397460
        },
        {
            "orgID": "304731026",
            "active": true,
            "lastName": "Musselman",
            "firstName": "Madeline",
            "id": 397437
        },
        {
            "orgID": "104416603",
            "active": true,
            "lastName": "Myers",
            "firstName": "Craig",
            "id": 86675
        },
        {
            "orgID": "604745319",
            "active": true,
            "lastName": "Nasielski",
            "firstName": "Mark",
            "id": 397462
        },
        {
            "orgID": "305071019",
            "active": true,
            "lastName": "Neave",
            "firstName": "Ruby",
            "id": 426884
        },
        {
            "orgID": "705039862",
            "active": true,
            "lastName": "Nguyen",
            "firstName": "Brielle",
            "id": 531328
        },
        {
            "orgID": "804792079",
            "active": true,
            "lastName": "Nickles",
            "firstName": "Madilyn",
            "id": 268611
        },
        {
            "orgID": "904882630",
            "active": true,
            "lastName": "Nnoruka",
            "firstName": "Chigozie",
            "id": 221859
        },
        {
            "orgID": "604974688",
            "active": true,
            "lastName": "Norris",
            "firstName": "James Ryan",
            "id": 426760
        },
        {
            "orgID": "004899970",
            "active": true,
            "lastName": "Norris",
            "firstName": "Zia",
            "id": 418605
        },
        {
            "orgID": "505063344",
            "active": true,
            "lastName": "Ochi",
            "firstName": "Chiemeka",
            "id": 379413
        },
        {
            "orgID": "304881884",
            "active": true,
            "lastName": "Odighizuwa",
            "firstName": "Osawaru",
            "id": 221851
        },
        {
            "orgID": "704569382",
            "active": true,
            "lastName": "O'Donohue",
            "firstName": "Erin",
            "id": 397466
        },
        {
            "orgID": "204579798",
            "active": true,
            "lastName": "O'Donohue",
            "firstName": "Lauren",
            "id": 397425
        },
        {
            "orgID": "004452106",
            "active": true,
            "lastName": "Ogundeji",
            "firstName": "Dotun",
            "id": 397402
        },
        {
            "orgID": "104709998",
            "active": true,
            "lastName": "Ohashi",
            "firstName": "Katelyn",
            "id": 397416
        },
        {
            "orgID": "104727412",
            "active": true,
            "lastName": "Okada",
            "firstName": "Amy",
            "id": 397418
        },
        {
            "orgID": "504712055",
            "active": true,
            "lastName": "Okwarabizie",
            "firstName": "Ikenna",
            "id": 290283
        },
        {
            "orgID": "404712051",
            "active": true,
            "lastName": "Olesinski",
            "firstName": "Alex",
            "id": 290284
        },
        {
            "orgID": "704707388",
            "active": true,
            "lastName": "Olorunfunmi",
            "firstName": "Bolu",
            "id": 152815
        },
        {
            "orgID": "104573891",
            "active": true,
            "lastName": "Olsen",
            "firstName": "Jonathan",
            "id": 191844
        },
        {
            "orgID": "304882242",
            "active": true,
            "lastName": "Omotosho",
            "firstName": "Adewale",
            "id": 221843
        },
        {
            "orgID": "504979747",
            "active": true,
            "lastName": "Onyenwere",
            "firstName": "Michaela",
            "id": 426768
        },
        {
            "orgID": "505067361",
            "active": true,
            "lastName": "Orem",
            "firstName": "Chris",
            "id": 426761
        },
        {
            "orgID": "104980719",
            "active": true,
            "lastName": "Osborn",
            "firstName": "Bronson",
            "id": 426838
        },
        {
            "orgID": "404926311",
            "active": true,
            "lastName": "Osborne",
            "firstName": "Quinten",
            "id": 426781
        },
        {
            "orgID": "905063219",
            "active": true,
            "lastName": "Osling",
            "firstName": "Morrell",
            "id": 379414
        },
        {
            "orgID": "804763703",
            "active": true,
            "lastName": "Ott",
            "firstName": "Nicole",
            "id": 397477
        },
        {
            "orgID": "204982044",
            "active": true,
            "lastName": "Owens",
            "firstName": "Kayla",
            "id": 426769
        },
        {
            "orgID": "904546064",
            "active": true,
            "lastName": "Pabico",
            "firstName": "Christian",
            "id": 86676
        },
        {
            "orgID": "404585519",
            "active": true,
            "lastName": "Pack",
            "firstName": "Taylor",
            "id": 96183
        },
        {
            "orgID": "104908120",
            "active": true,
            "lastName": "Paoli",
            "firstName": "Andrew",
            "id": 426791
        },
        {
            "orgID": "704962147",
            "active": true,
            "lastName": "Parish",
            "firstName": "Ian",
            "id": 426762
        },
        {
            "orgID": "904903883",
            "active": true,
            "lastName": "Parks",
            "firstName": "Adam",
            "id": 426763
        },
        {
            "orgID": "304903881",
            "active": true,
            "lastName": "Parks",
            "firstName": "Alex",
            "id": 426764
        },
        {
            "orgID": "204906248",
            "active": true,
            "lastName": "Parks",
            "firstName": "Ryan",
            "id": 379415
        },
        {
            "orgID": "704726891",
            "active": true,
            "lastName": "Pederson",
            "firstName": "Jacey",
            "id": 397469
        },
        {
            "orgID": "005007384",
            "active": true,
            "lastName": "Peed",
            "firstName": "Garland",
            "id": 426765
        },
        {
            "orgID": "004930659",
            "active": true,
            "lastName": "Pereira",
            "firstName": "Bryce",
            "id": 426827
        },
        {
            "orgID": "104899984",
            "active": true,
            "lastName": "Perez",
            "firstName": "Briana",
            "id": 418607
        },
        {
            "orgID": "204407387",
            "active": true,
            "lastName": "Perez",
            "firstName": "Kylee",
            "id": 69274
        },
        {
            "orgID": "504415159",
            "active": true,
            "lastName": "Perry",
            "firstName": "Pattriana",
            "id": 397446
        },
        {
            "orgID": "804903063",
            "active": true,
            "lastName": "Pettway",
            "firstName": "Zachary",
            "id": 426800
        },
        {
            "orgID": "304981930",
            "active": true,
            "lastName": "Phair",
            "firstName": "Hannah",
            "id": 426845
        },
        {
            "orgID": "305217111",
            "active": true,
            "lastName": "Philips",
            "firstName": "Kyle",
            "id": 539138
        },
        {
            "orgID": "304907855",
            "active": true,
            "lastName": "Phillips",
            "firstName": "Jaelan",
            "id": 331939
        },
        {
            "orgID": "004536842",
            "active": true,
            "lastName": "Pickett",
            "firstName": "Adarius",
            "id": 72925
        },
        {
            "orgID": "104782984",
            "active": true,
            "lastName": "Pierson",
            "firstName": "Crawford",
            "id": 285941
        },
        {
            "orgID": "704798374",
            "active": true,
            "lastName": "Pino",
            "firstName": "Giulianna",
            "id": 397471
        },
        {
            "orgID": "005012286",
            "active": true,
            "lastName": "Pitts",
            "firstName": "Shea",
            "id": 379665
        },
        {
            "orgID": "305065061",
            "active": true,
            "lastName": "Platt",
            "firstName": "Andrew",
            "id": 379666
        },
        {
            "orgID": "404575011",
            "active": true,
            "lastName": "Poleo",
            "firstName": "Alberto",
            "id": 397442
        },
        {
            "orgID": "604462013",
            "active": true,
            "lastName": "Polyakova",
            "firstName": "Maria",
            "id": 397456
        },
        {
            "orgID": "404987696",
            "active": true,
            "lastName": "Poston",
            "firstName": "Kendal",
            "id": 426854
        },
        {
            "orgID": "804905892",
            "active": true,
            "lastName": "Powell",
            "firstName": "Holden",
            "id": 426801
        },
        {
            "orgID": "504597550",
            "active": true,
            "lastName": "Powell",
            "firstName": "Matthew",
            "id": 397449
        },
        {
            "orgID": "304492040",
            "active": true,
            "lastName": "Powell, Jr.",
            "firstName": "Leon",
            "id": 397434
        },
        {
            "orgID": "004731358",
            "active": true,
            "lastName": "Prendiz",
            "firstName": "Jordan",
            "id": 397407
        },
        {
            "orgID": "004572868",
            "active": true,
            "lastName": "Pries",
            "firstName": "Jake",
            "id": 191845
        },
        {
            "orgID": "204754607",
            "active": true,
            "lastName": "Prober",
            "firstName": "Jacquelyn",
            "id": 268614
        },
        {
            "orgID": "704889449",
            "active": true,
            "lastName": "Protenic",
            "firstName": "Michaela",
            "id": 397472
        },
        {
            "orgID": "104583395",
            "active": true,
            "lastName": "Puente",
            "firstName": "Natalie",
            "id": 397414
        },
        {
            "orgID": "404934189",
            "active": true,
            "lastName": "Quarles",
            "firstName": "Malia",
            "id": 418604
        },
        {
            "orgID": "104637058",
            "active": true,
            "lastName": "Raede",
            "firstName": "Raphael",
            "id": 397415
        },
        {
            "orgID": "504709944",
            "active": true,
            "lastName": "Ralston",
            "firstName": "Jack",
            "id": 191849
        },
        {
            "orgID": "204989187",
            "active": true,
            "lastName": "Ralston",
            "firstName": "Micah",
            "id": 498324
        },
        {
            "orgID": "904402701",
            "active": true,
            "lastName": "Rapp",
            "firstName": "Austin",
            "id": 397482
        },
        {
            "orgID": "004757051",
            "active": true,
            "lastName": "Rapp",
            "firstName": "Connor",
            "id": 397409
        },
        {
            "orgID": "404546066",
            "active": true,
            "lastName": "Rassool",
            "firstName": "Alex",
            "id": 86678
        },
        {
            "orgID": "305062562",
            "active": true,
            "lastName": "Ray",
            "firstName": "Kanan",
            "id": 379667
        },
        {
            "orgID": "204551445",
            "active": true,
            "lastName": "Redlicki",
            "firstName": "Martin",
            "id": 397424
        },
        {
            "orgID": "604400336",
            "active": true,
            "lastName": "Reego",
            "firstName": "Grace",
            "id": 397454
        },
        {
            "orgID": "104463920",
            "active": true,
            "lastName": "Reid",
            "firstName": "Carly",
            "id": 397413
        },
        {
            "orgID": "904764472",
            "active": true,
            "lastName": "Reynolds",
            "firstName": "Garrett",
            "id": 397489
        },
        {
            "orgID": "404416606",
            "active": true,
            "lastName": "Reynolds",
            "firstName": "Nicole",
            "id": 397440
        },
        {
            "orgID": "104402804",
            "active": true,
            "lastName": "Rezvani",
            "firstName": "Parsa",
            "id": 461560
        },
        {
            "orgID": "804938034",
            "active": true,
            "lastName": "Rice",
            "firstName": "Christina",
            "id": 426839
        },
        {
            "orgID": "604980463",
            "active": true,
            "lastName": "Riley",
            "firstName": "Cody",
            "id": 426820
        },
        {
            "orgID": "704881900",
            "active": true,
            "lastName": "Riley",
            "firstName": "Keyon",
            "id": 221853
        },
        {
            "orgID": "204481103",
            "active": true,
            "lastName": "Rittman",
            "firstName": "Justin",
            "id": 86679
        },
        {
            "orgID": "904388620",
            "active": true,
            "lastName": "Roberson",
            "firstName": "Darnell",
            "id": 397481
        },
        {
            "orgID": "604406588",
            "active": true,
            "lastName": "Roberts",
            "firstName": "Austin",
            "id": 72915
        },
        {
            "orgID": "904286301",
            "active": true,
            "lastName": "Robinson",
            "firstName": "James",
            "id": 76065
        },
        {
            "orgID": "505063221",
            "active": true,
            "lastName": "Robinson-Carr",
            "firstName": "Moses",
            "id": 379668
        },
        {
            "orgID": "105217112",
            "active": true,
            "lastName": "Rodney",
            "firstName": "Meleni",
            "id": 539567
        },
        {
            "orgID": "704624915",
            "active": true,
            "lastName": "Rodriguez",
            "firstName": "Anika",
            "id": 397467
        },
        {
            "orgID": "404979941",
            "active": true,
            "lastName": "Rodriguez",
            "firstName": "Juliana ",
            "id": 418606
        },
        {
            "orgID": "505036510",
            "active": true,
            "lastName": "Rodriguez",
            "firstName": "Karina",
            "id": 397453
        },
        {
            "orgID": "904425298",
            "active": true,
            "lastName": "Roelse",
            "firstName": "Alex",
            "id": 81024
        },
        {
            "orgID": "905062696",
            "active": true,
            "lastName": "Rogers",
            "firstName": "Greg",
            "id": 379670
        },
        {
            "orgID": "604574968",
            "active": true,
            "lastName": "Rogers",
            "firstName": "Kyra",
            "id": 397459
        },
        {
            "orgID": "204444634",
            "active": true,
            "lastName": "Rone",
            "firstName": "Austin",
            "id": 81027
        },
        {
            "orgID": "204731833",
            "active": true,
            "lastName": "Rosenblum",
            "firstName": "Allyson",
            "id": 248345
        },
        {
            "orgID": "604929361",
            "active": true,
            "lastName": "Rosenfeld",
            "firstName": "Evan",
            "id": 426782
        },
        {
            "orgID": "304457715",
            "active": true,
            "lastName": "Rosica",
            "firstName": "Dan",
            "id": 94158
        },
        {
            "orgID": "904709999",
            "active": true,
            "lastName": "Ross",
            "firstName": "Kyla",
            "id": 397487
        },
        {
            "orgID": "704723538",
            "active": true,
            "lastName": "Rozeboom",
            "firstName": "Lizette",
            "id": 397468
        },
        {
            "orgID": "204423293",
            "active": true,
            "lastName": "Rusbarsky",
            "firstName": "Alexandra",
            "id": 397423
        },
        {
            "orgID": "304594618",
            "active": true,
            "lastName": "Russell",
            "firstName": "Madeline",
            "id": 397436
        },
        {
            "orgID": "004299261",
            "active": true,
            "lastName": "Ruzic",
            "firstName": "Alek",
            "id": 76078
        },
        {
            "orgID": "004909870",
            "active": true,
            "lastName": "Ryan",
            "firstName": "Emily",
            "id": 426774
        },
        {
            "orgID": "404573700",
            "active": true,
            "lastName": "Sachs",
            "firstName": "Spencer",
            "id": 197719
        },
        {
            "orgID": "905257439",
            "active": true,
            "lastName": "Saito",
            "firstName": "Morris",
            "id": 563533
        },
        {
            "orgID": "304707390",
            "active": true,
            "lastName": "Samuel",
            "firstName": "Colin",
            "id": 152816
        },
        {
            "orgID": "605062706",
            "active": true,
            "lastName": "Sanchez",
            "firstName": "Ashley",
            "id": 426861
        },
        {
            "orgID": "804974159",
            "active": true,
            "lastName": "Sanchez",
            "firstName": "Camryn",
            "id": 426846
        },
        {
            "orgID": "604824811",
            "active": true,
            "lastName": "Sanchez",
            "firstName": "Mercedez",
            "id": 397560
        },
        {
            "orgID": "704457351",
            "active": true,
            "lastName": "Santoyo",
            "firstName": "Joab",
            "id": 81830
        },
        {
            "orgID": "004914490",
            "active": true,
            "lastName": "Satterwhite",
            "firstName": "Danielle",
            "id": 426862
        },
        {
            "orgID": "604903813",
            "active": true,
            "lastName": "Saunders",
            "firstName": "Patrick",
            "id": 426783
        },
        {
            "orgID": "505071283",
            "active": true,
            "lastName": "Saveljic",
            "firstName": "Nicolas",
            "id": 445700
        },
        {
            "orgID": "804740274",
            "active": true,
            "lastName": "Savvidou",
            "firstName": "Stelutsa",
            "id": 397576
        },
        {
            "orgID": "804936803",
            "active": true,
            "lastName": "Sawyer",
            "firstName": "Ryan",
            "id": 426784
        },
        {
            "orgID": "704714845",
            "active": true,
            "lastName": "Scale",
            "firstName": "Reed",
            "id": 397565
        },
        {
            "orgID": "804569975",
            "active": true,
            "lastName": "Schanz",
            "firstName": "Emma",
            "id": 397573
        },
        {
            "orgID": "404251356",
            "active": true,
            "lastName": "Scharmann",
            "firstName": "Emily",
            "id": 397537
        },
        {
            "orgID": "104745411",
            "active": true,
            "lastName": "Scheidler",
            "firstName": "Nicholas",
            "id": 333771
        },
        {
            "orgID": "404416437",
            "active": true,
            "lastName": "Schlener",
            "firstName": "Taylor",
            "id": 397538
        },
        {
            "orgID": "104815475",
            "active": true,
            "lastName": "Schmidgall",
            "firstName": "Carlyn",
            "id": 397511
        },
        {
            "orgID": "504825401",
            "active": true,
            "lastName": "Schmidt",
            "firstName": "Lilly",
            "id": 397550
        },
        {
            "orgID": "105062563",
            "active": true,
            "lastName": "Seawards",
            "firstName": "Sean",
            "id": 379671
        },
        {
            "orgID": "404780016",
            "active": true,
            "lastName": "Segedin",
            "firstName": "Kristina",
            "id": 397543
        },
        {
            "orgID": "304764899",
            "active": true,
            "lastName": "Semone",
            "firstName": "Lucie",
            "id": 397536
        },
        {
            "orgID": "004887905",
            "active": true,
            "lastName": "Seo",
            "firstName": "Joo",
            "id": 397501
        },
        {
            "orgID": "104398369",
            "active": true,
            "lastName": "Shaffer",
            "firstName": "Kelly",
            "id": 397505
        },
        {
            "orgID": "904921288",
            "active": true,
            "lastName": "Sharts",
            "firstName": "Hannah",
            "id": 426863
        },
        {
            "orgID": "804458128",
            "active": true,
            "lastName": "Shaun",
            "firstName": "Corey",
            "id": 397570
        },
        {
            "orgID": "305062703",
            "active": true,
            "lastName": "Shaw",
            "firstName": "Jaylan",
            "id": 379672
        },
        {
            "orgID": "504577081",
            "active": true,
            "lastName": "Shaw",
            "firstName": "Zoe",
            "id": 96053
        },
        {
            "orgID": "404970323",
            "active": true,
            "lastName": "Sheehan",
            "firstName": "Delanie",
            "id": 426864
        },
        {
            "orgID": "604564568",
            "active": true,
            "lastName": "Sheldon",
            "firstName": "Sarah",
            "id": 397556
        },
        {
            "orgID": "304902339",
            "active": true,
            "lastName": "Shepherd",
            "firstName": "Hannah",
            "id": 426814
        },
        {
            "orgID": "404756525",
            "active": true,
            "lastName": "Shibahara",
            "firstName": "Ena",
            "id": 397542
        },
        {
            "orgID": "204625620",
            "active": true,
            "lastName": "Shiver",
            "firstName": "Traci",
            "id": 397520
        },
        {
            "orgID": "604614752",
            "active": true,
            "lastName": "Shojima",
            "firstName": "Gyo",
            "id": 157972
        },
        {
            "orgID": "704405102",
            "active": true,
            "lastName": "Shoults",
            "firstName": "Jacquelyn",
            "id": 397561
        },
        {
            "orgID": "804568283",
            "active": true,
            "lastName": "Shumway",
            "firstName": "Reid",
            "id": 397572
        },
        {
            "orgID": "504737145",
            "active": true,
            "lastName": "Silva",
            "firstName": "Jarron",
            "id": 333772
        },
        {
            "orgID": "704917334",
            "active": true,
            "lastName": "Simmons",
            "firstName": "Myna",
            "id": 426881
        },
        {
            "orgID": "204764593",
            "active": true,
            "lastName": "Simo",
            "firstName": "Savannah",
            "id": 397526
        },
        {
            "orgID": "004747509",
            "active": true,
            "lastName": "Skelly",
            "firstName": "Emily",
            "id": 397500
        },
        {
            "orgID": "904733046",
            "active": true,
            "lastName": "Skibitzki",
            "firstName": "Madeline",
            "id": 268616
        },
        {
            "orgID": "304583511",
            "active": true,
            "lastName": "Slabbert",
            "firstName": "Megan",
            "id": 397533
        },
        {
            "orgID": "705017054",
            "active": true,
            "lastName": "Slagerman",
            "firstName": "Alyssa",
            "id": 426847
        },
        {
            "orgID": "005064553",
            "active": true,
            "lastName": "Smalley",
            "firstName": "Jayce",
            "id": 379673
        },
        {
            "orgID": "205066952",
            "active": true,
            "lastName": "Smith",
            "firstName": "Sean",
            "id": 426821
        },
        {
            "orgID": "304457664",
            "active": true,
            "lastName": "Smith",
            "firstName": "Cole",
            "id": 397532
        },
        {
            "orgID": "405217115",
            "active": true,
            "lastName": "Smith",
            "firstName": "Darius",
            "id": 539566
        },
        {
            "orgID": "004916917",
            "active": true,
            "lastName": "Smith",
            "firstName": "Keegan",
            "id": 426828
        },
        {
            "orgID": "604288622",
            "active": true,
            "lastName": "Smith",
            "firstName": "Myles",
            "id": 397551
        },
        {
            "orgID": "604927098",
            "active": true,
            "lastName": "Smith",
            "firstName": "Sabrina",
            "id": 426775
        },
        {
            "orgID": "704995299",
            "active": true,
            "lastName": "Snow",
            "firstName": "Alana",
            "id": 418609
        },
        {
            "orgID": "604302307",
            "active": true,
            "lastName": "Snow",
            "firstName": "Scott",
            "id": 397552
        },
        {
            "orgID": "004467513",
            "active": true,
            "lastName": "Snyder",
            "firstName": "Warren",
            "id": 81029
        },
        {
            "orgID": "004428531",
            "active": true,
            "lastName": "Sochowski",
            "firstName": "Brad",
            "id": 86680
        },
        {
            "orgID": "604564097",
            "active": true,
            "lastName": "Soe",
            "firstName": "Sandra",
            "id": 397555
        },
        {
            "orgID": "204570260",
            "active": true,
            "lastName": "Solberg",
            "firstName": "Jillian",
            "id": 397519
        },
        {
            "orgID": "004570987",
            "active": true,
            "lastName": "Sotomayor",
            "firstName": "Arturo",
            "id": 397496
        },
        {
            "orgID": "404707974",
            "active": true,
            "lastName": "Southall",
            "firstName": "Madeleine",
            "id": 397541
        },
        {
            "orgID": "904750446",
            "active": true,
            "lastName": "Spannowsky",
            "firstName": "Marian",
            "id": 397583
        },
        {
            "orgID": "805063880",
            "active": true,
            "lastName": "Sponcil",
            "firstName": "Sarah",
            "id": 426776
        },
        {
            "orgID": "705032648",
            "active": true,
            "lastName": "Stafford",
            "firstName": "Justin",
            "id": 397568
        },
        {
            "orgID": "304717493",
            "active": true,
            "lastName": "Staggs",
            "firstName": "Logan",
            "id": 397535
        },
        {
            "orgID": "204541946",
            "active": true,
            "lastName": "Starks",
            "firstName": "Nathan",
            "id": 72917
        },
        {
            "orgID": "904620153",
            "active": true,
            "lastName": "Stauffacher-Gray",
            "firstName": "Jasmine",
            "id": 397582
        },
        {
            "orgID": "104881903",
            "active": true,
            "lastName": "Stephens",
            "firstName": "Brandon",
            "id": 221844
        },
        {
            "orgID": "304654853",
            "active": true,
            "lastName": "Stewart",
            "firstName": "Cavan",
            "id": 461556
        },
        {
            "orgID": "904462342",
            "active": true,
            "lastName": "Stiling",
            "firstName": "David",
            "id": 81026
        },
        {
            "orgID": "204901496",
            "active": true,
            "lastName": "Stinson",
            "firstName": "Sienna",
            "id": 561995
        },
        {
            "orgID": "204732093",
            "active": true,
            "lastName": "Storum",
            "firstName": "Hannah",
            "id": 397523
        },
        {
            "orgID": "604640303",
            "active": true,
            "lastName": "Strandberg",
            "firstName": "Marjorie",
            "id": 397558
        },
        {
            "orgID": "804709928",
            "active": true,
            "lastName": "Strauch",
            "firstName": "Andrew",
            "id": 157974
        },
        {
            "orgID": "904755420",
            "active": true,
            "lastName": "Stronach",
            "firstName": "Jack",
            "id": 333773
        },
        {
            "orgID": "704731840",
            "active": true,
            "lastName": "Strumpf",
            "firstName": "Chase",
            "id": 333774
        },
        {
            "orgID": "404972082",
            "active": true,
            "lastName": "Sutton",
            "firstName": "Sophie",
            "id": 483310
        },
        {
            "orgID": "905062564",
            "active": true,
            "lastName": "Sweeney",
            "firstName": "Zach",
            "id": 379675
        },
        {
            "orgID": "204399636",
            "active": true,
            "lastName": "Szarnicki",
            "firstName": "Cassidy",
            "id": 397516
        },
        {
            "orgID": "204420930",
            "active": true,
            "lastName": "Ta'amilo",
            "firstName": "Selina",
            "id": 69276
        },
        {
            "orgID": "604881905",
            "active": true,
            "lastName": "Tagaloa",
            "firstName": "Boss",
            "id": 221854
        },
        {
            "orgID": "804662501",
            "active": true,
            "lastName": "Taite",
            "firstName": "Taylor",
            "id": 397574
        },
        {
            "orgID": "605010411",
            "active": true,
            "lastName": "Tarver",
            "firstName": "Raleigh",
            "id": 498326
        },
        {
            "orgID": "304538929",
            "active": true,
            "lastName": "Taua",
            "firstName": "Ainuu",
            "id": 72918
        },
        {
            "orgID": "404583332",
            "active": true,
            "lastName": "Tautalafua",
            "firstName": "Brianna",
            "id": 96206
        },
        {
            "orgID": "204919024",
            "active": true,
            "lastName": "Tavatanakit",
            "firstName": "Paphangkorn (Patty)",
            "id": 426849
        },
        {
            "orgID": "004911203",
            "active": true,
            "lastName": "Teijeiro",
            "firstName": "Richard",
            "id": 426802
        },
        {
            "orgID": "704879469",
            "active": true,
            "lastName": "Terry",
            "firstName": "Nicolas",
            "id": 221861
        },
        {
            "orgID": "205062708",
            "active": true,
            "lastName": "Terwege",
            "firstName": "Brandon",
            "id": 426792
        },
        {
            "orgID": "005257207",
            "active": true,
            "lastName": "Thompson",
            "firstName": "Tyree",
            "id": 563528
        },
        {
            "orgID": "004863834",
            "active": true,
            "lastName": "Toailoa",
            "firstName": "Leni",
            "id": 206867
        },
        {
            "orgID": "404863832",
            "active": true,
            "lastName": "Toailoa",
            "firstName": "Lokeni",
            "id": 206866
        },
        {
            "orgID": "204748013",
            "active": true,
            "lastName": "Toglia",
            "firstName": "Michael",
            "id": 333775
        },
        {
            "orgID": "204764574",
            "active": true,
            "lastName": "Tong",
            "firstName": "Haley",
            "id": 397525
        },
        {
            "orgID": "104631297",
            "active": true,
            "lastName": "Toronjo",
            "firstName": "Macy",
            "id": 397507
        },
        {
            "orgID": "104907248",
            "active": true,
            "lastName": "Townsend",
            "firstName": "Michael",
            "id": 426803
        },
        {
            "orgID": "504921209",
            "active": true,
            "lastName": "Tratz",
            "firstName": "Pauline",
            "id": 426855
        },
        {
            "orgID": "804915122",
            "active": true,
            "lastName": "Travisano",
            "firstName": "Chasen",
            "id": 426785
        },
        {
            "orgID": "004652054",
            "active": true,
            "lastName": "Trujillo",
            "firstName": "Millen",
            "id": 397498
        },
        {
            "orgID": "304427667",
            "active": true,
            "lastName": "Tucker",
            "firstName": "Meghan",
            "id": 397531
        },
        {
            "orgID": "804663483",
            "active": true,
            "lastName": "Tuiasosopo",
            "firstName": "Lanea",
            "id": 397575
        },
        {
            "orgID": "004540405",
            "active": true,
            "lastName": "Tuioti-Mariner",
            "firstName": "Jacob",
            "id": 72919
        },
        {
            "orgID": "304630635",
            "active": true,
            "lastName": "Turner",
            "firstName": "Akinyele",
            "id": 397534
        },
        {
            "orgID": "004732961",
            "active": true,
            "lastName": "Umehara",
            "firstName": "Maki",
            "id": 397499
        },
        {
            "orgID": "805064554",
            "active": true,
            "lastName": "Valentine",
            "firstName": "Graham",
            "id": 379676
        },
        {
            "orgID": "204560831",
            "active": true,
            "lastName": "Van De Velde",
            "firstName": "Jonathan",
            "id": 397518
        },
        {
            "orgID": "804466779",
            "active": true,
            "lastName": "Van Dyke",
            "firstName": "Alex",
            "id": 72920
        },
        {
            "orgID": "704919390",
            "active": true,
            "lastName": "Van Natta",
            "firstName": "Ava",
            "id": 498295
        },
        {
            "orgID": "104889447",
            "active": true,
            "lastName": "Varisco",
            "firstName": "Madison",
            "id": 397512
        },
        {
            "orgID": "405091352",
            "active": true,
            "lastName": "Vasquez",
            "firstName": "Arturo",
            "id": 531324
        },
        {
            "orgID": "204840832",
            "active": true,
            "lastName": "Verger Gourson",
            "firstName": "Margaux",
            "id": 397528
        },
        {
            "orgID": "705015328",
            "active": true,
            "lastName": "Villacorta",
            "firstName": "Viviana",
            "id": 426865
        },
        {
            "orgID": "404899483",
            "active": true,
            "lastName": "Villegas",
            "firstName": "Marisa",
            "id": 426840
        },
        {
            "orgID": "104737251",
            "active": true,
            "lastName": "Vlachonassios",
            "firstName": "James",
            "id": 397509
        },
        {
            "orgID": "704559321",
            "active": true,
            "lastName": "Vu",
            "firstName": "Lilia",
            "id": 397564
        },
        {
            "orgID": "105062704",
            "active": true,
            "lastName": "Wacaser",
            "firstName": "Jax",
            "id": 379677
        },
        {
            "orgID": "904707392",
            "active": true,
            "lastName": "Wade",
            "firstName": "Rick",
            "id": 152819
        },
        {
            "orgID": "404482615",
            "active": true,
            "lastName": "Wagner",
            "firstName": "Greta",
            "id": 397539
        },
        {
            "orgID": "004413252",
            "active": true,
            "lastName": "Walker",
            "firstName": "Matt",
            "id": 94164
        },
        {
            "orgID": "705071258",
            "active": true,
            "lastName": "Wallace",
            "firstName": "Joe",
            "id": 483413
        },
        {
            "orgID": "004910859",
            "active": true,
            "lastName": "Waller",
            "firstName": "Lilia",
            "id": 426856
        },
        {
            "orgID": "804883531",
            "active": true,
            "lastName": "Walsh",
            "firstName": "Koby",
            "id": 285944
        },
        {
            "orgID": "704707393",
            "active": true,
            "lastName": "Wariboko-Alali",
            "firstName": "Josh",
            "id": 152820
        },
        {
            "orgID": "104909695",
            "active": true,
            "lastName": "Washington",
            "firstName": "Kinsley",
            "id": 418608
        },
        {
            "orgID": "104344786",
            "active": true,
            "lastName": "Washington",
            "firstName": "Ratanya",
            "id": 397504
        },
        {
            "orgID": "004792318",
            "active": true,
            "lastName": "Weitzman",
            "firstName": "Bryan",
            "id": 426566
        },
        {
            "orgID": "604473790",
            "active": true,
            "lastName": "Welsh",
            "firstName": "Thomas",
            "id": 290286
        },
        {
            "orgID": "605072220",
            "active": true,
            "lastName": "Whalen",
            "firstName": "Anne",
            "id": 445701
        },
        {
            "orgID": "404922266",
            "active": true,
            "lastName": "Wheaton",
            "firstName": "Roxy",
            "id": 426882
        },
        {
            "orgID": "904584621",
            "active": true,
            "lastName": "Wheeler",
            "firstName": "Carlisle",
            "id": 397581
        },
        {
            "orgID": "104596246",
            "active": true,
            "lastName": "Whitelegge",
            "firstName": "Rachel",
            "id": 397506
        },
        {
            "orgID": "004563920",
            "active": true,
            "lastName": "Wieseler",
            "firstName": "Allison",
            "id": 397495
        },
        {
            "orgID": "304399476",
            "active": true,
            "lastName": "Wiley",
            "firstName": "Kristin",
            "id": 397530
        },
        {
            "orgID": "105000933",
            "active": true,
            "lastName": "Wilkes",
            "firstName": "Kristafer",
            "id": 426822
        },
        {
            "orgID": "204883529",
            "active": true,
            "lastName": "Williams",
            "firstName": "Donovan",
            "id": 295141
        },
        {
            "orgID": "604962888",
            "active": true,
            "lastName": "Wilson",
            "firstName": "Alyssa",
            "id": 426841
        },
        {
            "orgID": "404883533",
            "active": true,
            "lastName": "Wilson",
            "firstName": "Caleb",
            "id": 252584
        },
        {
            "orgID": "604996949",
            "active": true,
            "lastName": "Wilson",
            "firstName": "Jacob",
            "id": 426842
        },
        {
            "orgID": "804881909",
            "active": true,
            "lastName": "Wilson",
            "firstName": "Jordan",
            "id": 221855
        },
        {
            "orgID": "904750639",
            "active": true,
            "lastName": "Wilson",
            "firstName": "Remy",
            "id": 397584
        },
        {
            "orgID": "104560624",
            "active": true,
            "lastName": "Wisz",
            "firstName": "Stevie",
            "id": 226405
        },
        {
            "orgID": "504632469",
            "active": true,
            "lastName": "Wolf",
            "firstName": "Alexander",
            "id": 397547
        },
        {
            "orgID": "704451679",
            "active": true,
            "lastName": "Wong",
            "firstName": "Kai",
            "id": 397563
        },
        {
            "orgID": "904447059",
            "active": true,
            "lastName": "Wood",
            "firstName": "Bailey",
            "id": 397580
        },
        {
            "orgID": "804922189",
            "active": true,
            "lastName": "Wood",
            "firstName": "Whitney",
            "id": 498332
        },
        {
            "orgID": "904705312",
            "active": true,
            "lastName": "Woods",
            "firstName": "Joshua",
            "id": 152821
        },
        {
            "orgID": "504559807",
            "active": true,
            "lastName": "Wu",
            "firstName": "Bethany",
            "id": 397546
        },
        {
            "orgID": "204401639",
            "active": true,
            "lastName": "Wulff",
            "firstName": "Alec",
            "id": 290287
        },
        {
            "orgID": "604894427",
            "active": true,
            "lastName": "Wulff",
            "firstName": "Isaac",
            "id": 295139
        },
        {
            "orgID": "704448936",
            "active": true,
            "lastName": "Yamane",
            "firstName": "Veronica",
            "id": 397562
        },
        {
            "orgID": "304900731",
            "active": true,
            "lastName": "Yanovsky",
            "firstName": "Alice",
            "id": 426885
        },
        {
            "orgID": "804801559",
            "active": true,
            "lastName": "Ydens",
            "firstName": "Jeremy",
            "id": 333776
        },
        {
            "orgID": "004423091",
            "active": true,
            "lastName": "Yeagley",
            "firstName": "Katherine",
            "id": 397494
        },
        {
            "orgID": "204738113",
            "active": true,
            "lastName": "Yeomans",
            "firstName": "Madilyn",
            "id": 397524
        },
        {
            "orgID": "204731319",
            "active": true,
            "lastName": "Yoshihara",
            "firstName": "Hidetoshi",
            "id": 397522
        },
        {
            "orgID": "204407189",
            "active": true,
            "lastName": "Zappia",
            "firstName": "Elise",
            "id": 397517
        },
        {
            "orgID": "205067640",
            "active": true,
            "lastName": "Zari",
            "firstName": "Hannah",
            "id": 426883
        },
        {
            "orgID": "804786912",
            "active": true,
            "lastName": "Zhu",
            "firstName": "Evan",
            "id": 397577
        }
    ];
}

function _getAppointments() {
    return [{"SessionKey":1397409254,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BRANDON","appointmentBegin":"2018-04-11 18:30:00.000","appointmentEnd":"2018-04-11 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1397409183,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BRANDON","appointmentBegin":"2018-04-18 18:30:00.000","appointmentEnd":"2018-04-18 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1397409172,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BRANDON","appointmentBegin":"2018-04-25 18:30:00.000","appointmentEnd":"2018-04-25 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1397409165,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BRANDON","appointmentBegin":"2018-05-02 18:30:00.000","appointmentEnd":"2018-05-02 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1397409154,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BRANDON","appointmentBegin":"2018-05-09 18:30:00.000","appointmentEnd":"2018-05-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1397409211,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BRANDON","appointmentBegin":"2018-05-16 18:30:00.000","appointmentEnd":"2018-05-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1397409200,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BRANDON","appointmentBegin":"2018-05-23 18:30:00.000","appointmentEnd":"2018-05-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1397409193,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BRANDON","appointmentBegin":"2018-05-30 18:30:00.000","appointmentEnd":"2018-05-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1397409198,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BRANDON","appointmentBegin":"2018-06-06 18:30:00.000","appointmentEnd":"2018-06-06 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1748482882,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-04-10 17:30:00.000","appointmentEnd":"2018-04-10 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1748482873,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-04-17 17:30:00.000","appointmentEnd":"2018-04-17 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1748482864,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-04-24 17:30:00.000","appointmentEnd":"2018-04-24 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1748482863,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-01 17:30:00.000","appointmentEnd":"2018-05-01 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1748482854,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-08 17:30:00.000","appointmentEnd":"2018-05-08 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1748482845,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-15 17:30:00.000","appointmentEnd":"2018-05-15 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1748482836,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-22 17:30:00.000","appointmentEnd":"2018-05-22 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1748482835,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-29 17:30:00.000","appointmentEnd":"2018-05-29 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1748482826,"term":"18S","studentId":'004909870',"studentName":"RYAN, EMILY DOWD","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-06-05 17:30:00.000","appointmentEnd":"2018-06-05 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1572739863,"term":"18S","studentId":'004911203',"studentName":"TEIJEIRO, RICHARD JARET","sessionName":"PHILOS  8 LEC 1","facilitatorName":"LOGAN","appointmentBegin":"2018-04-09 19:30:00.000","appointmentEnd":"2018-04-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1572739952,"term":"18S","studentId":'004911203',"studentName":"TEIJEIRO, RICHARD JARET","sessionName":"PHILOS  8 LEC 1","facilitatorName":"LOGAN","appointmentBegin":"2018-04-16 19:30:00.000","appointmentEnd":"2018-04-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1572739937,"term":"18S","studentId":'004911203',"studentName":"TEIJEIRO, RICHARD JARET","sessionName":"PHILOS  8 LEC 1","facilitatorName":"LOGAN","appointmentBegin":"2018-04-23 19:30:00.000","appointmentEnd":"2018-04-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1572739962,"term":"18S","studentId":'004911203',"studentName":"TEIJEIRO, RICHARD JARET","sessionName":"PHILOS  8 LEC 1","facilitatorName":"LOGAN","appointmentBegin":"2018-04-30 19:30:00.000","appointmentEnd":"2018-04-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1572739955,"term":"18S","studentId":'004911203',"studentName":"TEIJEIRO, RICHARD JARET","sessionName":"PHILOS  8 LEC 1","facilitatorName":"LOGAN","appointmentBegin":"2018-05-07 19:30:00.000","appointmentEnd":"2018-05-07 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1572739916,"term":"18S","studentId":'004911203',"studentName":"TEIJEIRO, RICHARD JARET","sessionName":"PHILOS  8 LEC 1","facilitatorName":"LOGAN","appointmentBegin":"2018-05-14 19:30:00.000","appointmentEnd":"2018-05-14 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1572739917,"term":"18S","studentId":'004911203',"studentName":"TEIJEIRO, RICHARD JARET","sessionName":"PHILOS  8 LEC 1","facilitatorName":"LOGAN","appointmentBegin":"2018-05-21 19:30:00.000","appointmentEnd":"2018-05-21 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1572739935,"term":"18S","studentId":'004911203',"studentName":"TEIJEIRO, RICHARD JARET","sessionName":"PHILOS  8 LEC 1","facilitatorName":"LOGAN","appointmentBegin":"2018-06-04 19:30:00.000","appointmentEnd":"2018-06-04 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2040818631,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-04-11 18:30:00.000","appointmentEnd":"2018-04-11 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2040818622,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-04-18 18:30:00.000","appointmentEnd":"2018-04-18 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2040818613,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-04-25 18:30:00.000","appointmentEnd":"2018-04-25 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2040818604,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-02 18:30:00.000","appointmentEnd":"2018-05-02 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2040818595,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-09 18:30:00.000","appointmentEnd":"2018-05-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2040818575,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-06-06 18:30:00.000","appointmentEnd":"2018-06-06 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2040818586,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-16 18:30:00.000","appointmentEnd":"2018-05-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2040818577,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-23 18:30:00.000","appointmentEnd":"2018-05-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2040818568,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-30 18:30:00.000","appointmentEnd":"2018-05-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1611488295,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ANDY Z.","appointmentBegin":"2018-04-10 17:30:00.000","appointmentEnd":"2018-04-10 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1611488348,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ANDY Z.","appointmentBegin":"2018-04-17 17:30:00.000","appointmentEnd":"2018-04-17 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1611488341,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ANDY Z.","appointmentBegin":"2018-04-24 17:30:00.000","appointmentEnd":"2018-04-24 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1611488330,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-01 17:30:00.000","appointmentEnd":"2018-05-01 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1611488323,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-08 17:30:00.000","appointmentEnd":"2018-05-08 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1611488376,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-15 17:30:00.000","appointmentEnd":"2018-05-15 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1611488369,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-22 17:30:00.000","appointmentEnd":"2018-05-22 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1611488374,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-29 17:30:00.000","appointmentEnd":"2018-05-29 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1611488367,"term":"18S","studentId":'004916917',"studentName":"SMITH, KEEGAN JAMES","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ANDY Z.","appointmentBegin":"2018-06-05 17:30:00.000","appointmentEnd":"2018-06-05 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1726596827,"term":"18S","studentId":'005007384',"studentName":"PEED V, GARLAND POWELL","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-04-10 19:30:00.000","appointmentEnd":"2018-04-10 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1726596768,"term":"18S","studentId":'005007384',"studentName":"PEED V, GARLAND POWELL","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-04-17 19:30:00.000","appointmentEnd":"2018-04-17 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1726596777,"term":"18S","studentId":'005007384',"studentName":"PEED V, GARLAND POWELL","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-04-24 19:30:00.000","appointmentEnd":"2018-04-24 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1726596790,"term":"18S","studentId":'005007384',"studentName":"PEED V, GARLAND POWELL","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-01 19:30:00.000","appointmentEnd":"2018-05-01 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1726596799,"term":"18S","studentId":'005007384',"studentName":"PEED V, GARLAND POWELL","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-08 19:30:00.000","appointmentEnd":"2018-05-08 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1726596740,"term":"18S","studentId":'005007384',"studentName":"PEED V, GARLAND POWELL","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-15 19:30:00.000","appointmentEnd":"2018-05-15 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1726596749,"term":"18S","studentId":'005007384',"studentName":"PEED V, GARLAND POWELL","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-22 19:30:00.000","appointmentEnd":"2018-05-22 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1726596746,"term":"18S","studentId":'005007384',"studentName":"PEED V, GARLAND POWELL","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-29 19:30:00.000","appointmentEnd":"2018-05-29 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1726596755,"term":"18S","studentId":'005007384',"studentName":"PEED V, GARLAND POWELL","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-06-05 19:30:00.000","appointmentEnd":"2018-06-05 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":282844571,"term":"18S","studentId":104560884,"studentName":"ALI, PRINCE ADAMS","sessionName":"HIST    20 LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-04-10 18:30:00.000","appointmentEnd":"2018-04-10 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":282844640,"term":"18S","studentId":104560884,"studentName":"ALI, PRINCE ADAMS","sessionName":"HIST    20 LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-04-17 18:30:00.000","appointmentEnd":"2018-04-17 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":282844649,"term":"18S","studentId":104560884,"studentName":"ALI, PRINCE ADAMS","sessionName":"HIST    20 LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-04-24 18:30:00.000","appointmentEnd":"2018-04-24 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":282844662,"term":"18S","studentId":104560884,"studentName":"ALI, PRINCE ADAMS","sessionName":"HIST    20 LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-05-01 18:30:00.000","appointmentEnd":"2018-05-01 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":282844671,"term":"18S","studentId":104560884,"studentName":"ALI, PRINCE ADAMS","sessionName":"HIST    20 LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-05-08 18:30:00.000","appointmentEnd":"2018-05-08 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":282844612,"term":"18S","studentId":104560884,"studentName":"ALI, PRINCE ADAMS","sessionName":"HIST    20 LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-05-15 18:30:00.000","appointmentEnd":"2018-05-15 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":282844621,"term":"18S","studentId":104560884,"studentName":"ALI, PRINCE ADAMS","sessionName":"HIST    20 LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-05-22 18:30:00.000","appointmentEnd":"2018-05-22 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":282844618,"term":"18S","studentId":104560884,"studentName":"ALI, PRINCE ADAMS","sessionName":"HIST    20 LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-05-29 18:30:00.000","appointmentEnd":"2018-05-29 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":282844627,"term":"18S","studentId":104560884,"studentName":"ALI, PRINCE ADAMS","sessionName":"HIST    20 LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-06-05 18:30:00.000","appointmentEnd":"2018-06-05 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-11833431,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"MATH    31A LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-04-10 19:30:00.000","appointmentEnd":"2018-04-10 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-11833390,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"MATH    31A LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-04-17 19:30:00.000","appointmentEnd":"2018-04-17 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-11833381,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"MATH    31A LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-04-24 19:30:00.000","appointmentEnd":"2018-04-24 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-11833404,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"MATH    31A LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-05-01 19:30:00.000","appointmentEnd":"2018-05-01 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-11833395,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"MATH    31A LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-05-08 19:30:00.000","appointmentEnd":"2018-05-08 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-11833354,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"MATH    31A LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-05-15 19:30:00.000","appointmentEnd":"2018-05-15 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-11833345,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"MATH    31A LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-05-22 19:30:00.000","appointmentEnd":"2018-05-22 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-11833352,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"MATH    31A LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-05-29 19:30:00.000","appointmentEnd":"2018-05-29 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-11833375,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"MATH    31A LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-06-05 19:30:00.000","appointmentEnd":"2018-06-05 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1697740907,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"PHYSICS 10 LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-04-10 18:30:00.000","appointmentEnd":"2018-04-10 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1697740818,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"PHYSICS 10 LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-04-17 18:30:00.000","appointmentEnd":"2018-04-17 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1697740825,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"PHYSICS 10 LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-04-24 18:30:00.000","appointmentEnd":"2018-04-24 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1697740808,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"PHYSICS 10 LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-05-01 18:30:00.000","appointmentEnd":"2018-05-01 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1697740815,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"PHYSICS 10 LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-05-08 18:30:00.000","appointmentEnd":"2018-05-08 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1697740854,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"PHYSICS 10 LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-05-15 18:30:00.000","appointmentEnd":"2018-05-15 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1697740861,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"PHYSICS 10 LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-05-22 18:30:00.000","appointmentEnd":"2018-05-22 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1697740860,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"PHYSICS 10 LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-05-29 18:30:00.000","appointmentEnd":"2018-05-29 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1697740835,"term":"18S","studentId":104727412,"studentName":"OKADA, AMY ANGE","sessionName":"PHYSICS 10 LEC 1","facilitatorName":"LIAM","appointmentBegin":"2018-06-05 18:30:00.000","appointmentEnd":"2018-06-05 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-187128140,"term":"18S","studentId":104907248,"studentName":"TOWNSEND, MICHAEL RAY KENICHI","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-04-11 19:30:00.000","appointmentEnd":"2018-04-11 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-187128115,"term":"18S","studentId":104907248,"studentName":"TOWNSEND, MICHAEL RAY KENICHI","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-04-18 19:30:00.000","appointmentEnd":"2018-04-18 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-187128122,"term":"18S","studentId":104907248,"studentName":"TOWNSEND, MICHAEL RAY KENICHI","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-04-25 19:30:00.000","appointmentEnd":"2018-04-25 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-187128097,"term":"18S","studentId":104907248,"studentName":"TOWNSEND, MICHAEL RAY KENICHI","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-05-02 19:30:00.000","appointmentEnd":"2018-05-02 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-187128112,"term":"18S","studentId":104907248,"studentName":"TOWNSEND, MICHAEL RAY KENICHI","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-05-09 19:30:00.000","appointmentEnd":"2018-05-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-187128087,"term":"18S","studentId":104907248,"studentName":"TOWNSEND, MICHAEL RAY KENICHI","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-05-16 19:30:00.000","appointmentEnd":"2018-05-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-187128094,"term":"18S","studentId":104907248,"studentName":"TOWNSEND, MICHAEL RAY KENICHI","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-05-23 19:30:00.000","appointmentEnd":"2018-05-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-187128068,"term":"18S","studentId":104907248,"studentName":"TOWNSEND, MICHAEL RAY KENICHI","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-06-06 19:30:00.000","appointmentEnd":"2018-06-06 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-187128069,"term":"18S","studentId":104907248,"studentName":"TOWNSEND, MICHAEL RAY KENICHI","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-05-30 19:30:00.000","appointmentEnd":"2018-05-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1117082020,"term":"18S","studentId":104934685,"studentName":"GLICK, SAM (SAMUEL)","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ANDY Z.","appointmentBegin":"2018-04-09 19:30:00.000","appointmentEnd":"2018-04-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1117082077,"term":"18S","studentId":104934685,"studentName":"GLICK, SAM (SAMUEL)","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ANDY Z.","appointmentBegin":"2018-04-16 19:30:00.000","appointmentEnd":"2018-04-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1117082066,"term":"18S","studentId":104934685,"studentName":"GLICK, SAM (SAMUEL)","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ANDY Z.","appointmentBegin":"2018-04-23 19:30:00.000","appointmentEnd":"2018-04-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1117082059,"term":"18S","studentId":104934685,"studentName":"GLICK, SAM (SAMUEL)","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ANDY Z.","appointmentBegin":"2018-04-30 19:30:00.000","appointmentEnd":"2018-04-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1117082048,"term":"18S","studentId":104934685,"studentName":"GLICK, SAM (SAMUEL)","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-07 19:30:00.000","appointmentEnd":"2018-05-07 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1117082105,"term":"18S","studentId":104934685,"studentName":"GLICK, SAM (SAMUEL)","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-14 19:30:00.000","appointmentEnd":"2018-05-14 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1117082110,"term":"18S","studentId":104934685,"studentName":"GLICK, SAM (SAMUEL)","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-21 19:30:00.000","appointmentEnd":"2018-05-21 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1117082092,"term":"18S","studentId":104934685,"studentName":"GLICK, SAM (SAMUEL)","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ANDY Z.","appointmentBegin":"2018-06-04 19:30:00.000","appointmentEnd":"2018-06-04 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":557234647,"term":"18S","studentId":104980719,"studentName":"OSBORN, BRONSON DEAN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-04-10 19:30:00.000","appointmentEnd":"2018-04-10 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":557234604,"term":"18S","studentId":104980719,"studentName":"OSBORN, BRONSON DEAN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-04-17 19:30:00.000","appointmentEnd":"2018-04-17 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":557234597,"term":"18S","studentId":104980719,"studentName":"OSBORN, BRONSON DEAN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-04-24 19:30:00.000","appointmentEnd":"2018-04-24 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":557234618,"term":"18S","studentId":104980719,"studentName":"OSBORN, BRONSON DEAN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-05-01 19:30:00.000","appointmentEnd":"2018-05-01 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":557234611,"term":"18S","studentId":104980719,"studentName":"OSBORN, BRONSON DEAN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-05-08 19:30:00.000","appointmentEnd":"2018-05-08 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":557234568,"term":"18S","studentId":104980719,"studentName":"OSBORN, BRONSON DEAN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-05-15 19:30:00.000","appointmentEnd":"2018-05-15 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":557234561,"term":"18S","studentId":104980719,"studentName":"OSBORN, BRONSON DEAN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-05-22 19:30:00.000","appointmentEnd":"2018-05-22 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":557234566,"term":"18S","studentId":104980719,"studentName":"OSBORN, BRONSON DEAN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-05-29 19:30:00.000","appointmentEnd":"2018-05-29 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":557234591,"term":"18S","studentId":104980719,"studentName":"OSBORN, BRONSON DEAN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-06-05 19:30:00.000","appointmentEnd":"2018-06-05 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-2010235844,"term":"18S","studentId":104980719,"studentName":"OSBORN, BRONSON DEAN","sessionName":"ASTR    4 LEC 1","facilitatorName":"MEGAN R.","appointmentBegin":"2018-04-09 17:30:00.000","appointmentEnd":"2018-04-09 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-2010235835,"term":"18S","studentId":104980719,"studentName":"OSBORN, BRONSON DEAN","sessionName":"ASTR    4 LEC 1","facilitatorName":"MEGAN R.","appointmentBegin":"2018-04-16 17:30:00.000","appointmentEnd":"2018-04-16 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-2010235830,"term":"18S","studentId":104980719,"studentName":"OSBORN, BRONSON DEAN","sessionName":"ASTR    4 LEC 1","facilitatorName":"MEGAN R.","appointmentBegin":"2018-04-23 17:30:00.000","appointmentEnd":"2018-04-23 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-2010235821,"term":"18S","studentId":104980719,"studentName":"OSBORN, BRONSON DEAN","sessionName":"ASTR    4 LEC 1","facilitatorName":"MEGAN R.","appointmentBegin":"2018-04-30 17:30:00.000","appointmentEnd":"2018-04-30 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-2010235816,"term":"18S","studentId":104980719,"studentName":"OSBORN, BRONSON DEAN","sessionName":"ASTR    4 LEC 1","facilitatorName":"MEGAN R.","appointmentBegin":"2018-05-07 17:30:00.000","appointmentEnd":"2018-05-07 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-2010235807,"term":"18S","studentId":104980719,"studentName":"OSBORN, BRONSON DEAN","sessionName":"ASTR    4 LEC 1","facilitatorName":"MEGAN R.","appointmentBegin":"2018-05-14 17:30:00.000","appointmentEnd":"2018-05-14 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-2010235802,"term":"18S","studentId":104980719,"studentName":"OSBORN, BRONSON DEAN","sessionName":"ASTR    4 LEC 1","facilitatorName":"MEGAN R.","appointmentBegin":"2018-05-21 17:30:00.000","appointmentEnd":"2018-05-21 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-2010235788,"term":"18S","studentId":104980719,"studentName":"OSBORN, BRONSON DEAN","sessionName":"ASTR    4 LEC 1","facilitatorName":"MEGAN R.","appointmentBegin":"2018-06-04 17:30:00.000","appointmentEnd":"2018-06-04 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1115797480,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 30B LEC 2","facilitatorName":"WAANIA","appointmentBegin":"2018-04-12 17:30:00.000","appointmentEnd":"2018-04-12 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1115797473,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 30B LEC 2","facilitatorName":"WAANIA","appointmentBegin":"2018-04-19 17:30:00.000","appointmentEnd":"2018-04-19 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1115797482,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 30B LEC 2","facilitatorName":"WAANIA","appointmentBegin":"2018-04-26 17:30:00.000","appointmentEnd":"2018-04-26 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1115797491,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 30B LEC 2","facilitatorName":"WAANIA","appointmentBegin":"2018-05-03 17:30:00.000","appointmentEnd":"2018-05-03 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1115797500,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 30B LEC 2","facilitatorName":"WAANIA","appointmentBegin":"2018-05-10 17:30:00.000","appointmentEnd":"2018-05-10 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1115797445,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 30B LEC 2","facilitatorName":"WAANIA","appointmentBegin":"2018-05-17 17:30:00.000","appointmentEnd":"2018-05-17 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1115797454,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 30B LEC 2","facilitatorName":"WAANIA","appointmentBegin":"2018-05-24 17:30:00.000","appointmentEnd":"2018-05-24 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1115797463,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 30B LEC 2","facilitatorName":"WAANIA","appointmentBegin":"2018-05-31 17:30:00.000","appointmentEnd":"2018-05-31 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1115797472,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 30B LEC 2","facilitatorName":"WAANIA","appointmentBegin":"2018-06-07 17:30:00.000","appointmentEnd":"2018-06-07 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1629277880,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 7C LEC 3","facilitatorName":"SHAUNA","appointmentBegin":"2018-04-10 17:30:00.000","appointmentEnd":"2018-04-10 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1629277901,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 7C LEC 3","facilitatorName":"SHAUNA","appointmentBegin":"2018-04-17 17:30:00.000","appointmentEnd":"2018-04-17 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1629277894,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 7C LEC 3","facilitatorName":"SHAUNA","appointmentBegin":"2018-04-24 17:30:00.000","appointmentEnd":"2018-04-24 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1629277915,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 7C LEC 3","facilitatorName":"SHAUNA","appointmentBegin":"2018-05-01 17:30:00.000","appointmentEnd":"2018-05-01 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1629277908,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 7C LEC 3","facilitatorName":"SHAUNA","appointmentBegin":"2018-05-08 17:30:00.000","appointmentEnd":"2018-05-08 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1629277929,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 7C LEC 3","facilitatorName":"SHAUNA","appointmentBegin":"2018-05-15 17:30:00.000","appointmentEnd":"2018-05-15 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1629277922,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 7C LEC 3","facilitatorName":"SHAUNA","appointmentBegin":"2018-05-22 17:30:00.000","appointmentEnd":"2018-05-22 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1629277927,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 7C LEC 3","facilitatorName":"SHAUNA","appointmentBegin":"2018-05-29 17:30:00.000","appointmentEnd":"2018-05-29 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1629277952,"term":"18S","studentId":104993514,"studentName":"CHELLIS, JILLIAN HOPE","sessionName":"LIFESCI 7C LEC 3","facilitatorName":"SHAUNA","appointmentBegin":"2018-06-05 17:30:00.000","appointmentEnd":"2018-06-05 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":747788473,"term":"18S","studentId":105000706,"studentName":"MITCHELL, GARRETT ANTONY","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BEN","appointmentBegin":"2018-04-09 19:30:00.000","appointmentEnd":"2018-04-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":747788480,"term":"18S","studentId":105000706,"studentName":"MITCHELL, GARRETT ANTONY","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BEN","appointmentBegin":"2018-04-16 19:30:00.000","appointmentEnd":"2018-04-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":747788495,"term":"18S","studentId":105000706,"studentName":"MITCHELL, GARRETT ANTONY","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BEN","appointmentBegin":"2018-04-23 19:30:00.000","appointmentEnd":"2018-04-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":747788502,"term":"18S","studentId":105000706,"studentName":"MITCHELL, GARRETT ANTONY","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BEN","appointmentBegin":"2018-04-30 19:30:00.000","appointmentEnd":"2018-04-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":747788509,"term":"18S","studentId":105000706,"studentName":"MITCHELL, GARRETT ANTONY","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BEN","appointmentBegin":"2018-05-07 19:30:00.000","appointmentEnd":"2018-05-07 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":747788516,"term":"18S","studentId":105000706,"studentName":"MITCHELL, GARRETT ANTONY","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BEN","appointmentBegin":"2018-05-14 19:30:00.000","appointmentEnd":"2018-05-14 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":747788515,"term":"18S","studentId":105000706,"studentName":"MITCHELL, GARRETT ANTONY","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BEN","appointmentBegin":"2018-05-21 19:30:00.000","appointmentEnd":"2018-05-21 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":747788529,"term":"18S","studentId":105000706,"studentName":"MITCHELL, GARRETT ANTONY","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BEN","appointmentBegin":"2018-06-04 19:30:00.000","appointmentEnd":"2018-06-04 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":499709656,"term":"18S","studentId":105000933,"studentName":"WILKES, KRISTAFER AARON-D'LAN","sessionName":"GEOG    1 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-04-10 18:30:00.000","appointmentEnd":"2018-04-10 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":499709603,"term":"18S","studentId":105000933,"studentName":"WILKES, KRISTAFER AARON-D'LAN","sessionName":"GEOG    1 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-04-17 18:30:00.000","appointmentEnd":"2018-04-17 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":499709610,"term":"18S","studentId":105000933,"studentName":"WILKES, KRISTAFER AARON-D'LAN","sessionName":"GEOG    1 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-04-24 18:30:00.000","appointmentEnd":"2018-04-24 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":499709621,"term":"18S","studentId":105000933,"studentName":"WILKES, KRISTAFER AARON-D'LAN","sessionName":"GEOG    1 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-05-01 18:30:00.000","appointmentEnd":"2018-05-01 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":499709628,"term":"18S","studentId":105000933,"studentName":"WILKES, KRISTAFER AARON-D'LAN","sessionName":"GEOG    1 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-05-08 18:30:00.000","appointmentEnd":"2018-05-08 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":499709575,"term":"18S","studentId":105000933,"studentName":"WILKES, KRISTAFER AARON-D'LAN","sessionName":"GEOG    1 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-05-15 18:30:00.000","appointmentEnd":"2018-05-15 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":499709582,"term":"18S","studentId":105000933,"studentName":"WILKES, KRISTAFER AARON-D'LAN","sessionName":"GEOG    1 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-05-22 18:30:00.000","appointmentEnd":"2018-05-22 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":499709577,"term":"18S","studentId":105000933,"studentName":"WILKES, KRISTAFER AARON-D'LAN","sessionName":"GEOG    1 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-05-29 18:30:00.000","appointmentEnd":"2018-05-29 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":499709584,"term":"18S","studentId":105000933,"studentName":"WILKES, KRISTAFER AARON-D'LAN","sessionName":"GEOG    1 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-06-05 18:30:00.000","appointmentEnd":"2018-06-05 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-284651685,"term":"18S","studentId":105065104,"studentName":"BRANDT, ROBERT JOSEPH","sessionName":"MGMT    1B LEC 1","facilitatorName":"BRANDON","appointmentBegin":"2018-04-11 19:30:00.000","appointmentEnd":"2018-04-11 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-284651742,"term":"18S","studentId":105065104,"studentName":"BRANDT, ROBERT JOSEPH","sessionName":"MGMT    1B LEC 1","facilitatorName":"BRANDON","appointmentBegin":"2018-04-18 19:30:00.000","appointmentEnd":"2018-04-18 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-284651735,"term":"18S","studentId":105065104,"studentName":"BRANDT, ROBERT JOSEPH","sessionName":"MGMT    1B LEC 1","facilitatorName":"BRANDON","appointmentBegin":"2018-04-25 19:30:00.000","appointmentEnd":"2018-04-25 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-284651728,"term":"18S","studentId":105065104,"studentName":"BRANDT, ROBERT JOSEPH","sessionName":"MGMT    1B LEC 1","facilitatorName":"BRANDON","appointmentBegin":"2018-05-02 19:30:00.000","appointmentEnd":"2018-05-02 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-284651713,"term":"18S","studentId":105065104,"studentName":"BRANDT, ROBERT JOSEPH","sessionName":"MGMT    1B LEC 1","facilitatorName":"BRANDON","appointmentBegin":"2018-05-09 19:30:00.000","appointmentEnd":"2018-05-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-284651770,"term":"18S","studentId":105065104,"studentName":"BRANDT, ROBERT JOSEPH","sessionName":"MGMT    1B LEC 1","facilitatorName":"BRANDON","appointmentBegin":"2018-05-16 19:30:00.000","appointmentEnd":"2018-05-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-284651763,"term":"18S","studentId":105065104,"studentName":"BRANDT, ROBERT JOSEPH","sessionName":"MGMT    1B LEC 1","facilitatorName":"BRANDON","appointmentBegin":"2018-05-23 19:30:00.000","appointmentEnd":"2018-05-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-284651756,"term":"18S","studentId":105065104,"studentName":"BRANDT, ROBERT JOSEPH","sessionName":"MGMT    1B LEC 1","facilitatorName":"BRANDON","appointmentBegin":"2018-05-30 19:30:00.000","appointmentEnd":"2018-05-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-284651757,"term":"18S","studentId":105065104,"studentName":"BRANDT, ROBERT JOSEPH","sessionName":"MGMT    1B LEC 1","facilitatorName":"BRANDON","appointmentBegin":"2018-06-06 19:30:00.000","appointmentEnd":"2018-06-06 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522906459,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-04-11 18:30:00.000","appointmentEnd":"2018-04-11 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522906402,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-04-18 18:30:00.000","appointmentEnd":"2018-04-18 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522906409,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-04-25 18:30:00.000","appointmentEnd":"2018-04-25 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522906416,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-05-02 18:30:00.000","appointmentEnd":"2018-05-02 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522906431,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-05-09 18:30:00.000","appointmentEnd":"2018-05-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522906374,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-05-16 18:30:00.000","appointmentEnd":"2018-05-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522906381,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-05-23 18:30:00.000","appointmentEnd":"2018-05-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522906388,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-05-30 18:30:00.000","appointmentEnd":"2018-05-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522906387,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-06-06 18:30:00.000","appointmentEnd":"2018-06-06 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753295479,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-05-29 19:30:00.000","appointmentEnd":"2018-05-29 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753295472,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-06-05 19:30:00.000","appointmentEnd":"2018-06-05 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753295435,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-05-01 19:30:00.000","appointmentEnd":"2018-05-01 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753295428,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-05-08 19:30:00.000","appointmentEnd":"2018-05-08 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753295481,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-05-15 19:30:00.000","appointmentEnd":"2018-05-15 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753295474,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-05-22 19:30:00.000","appointmentEnd":"2018-05-22 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753295400,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-04-10 19:30:00.000","appointmentEnd":"2018-04-10 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753295453,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-04-17 19:30:00.000","appointmentEnd":"2018-04-17 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753295446,"term":"18S","studentId":105217112,"studentName":"RODNEY, MELENI DIAMOND","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-04-24 19:30:00.000","appointmentEnd":"2018-04-24 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":987971829,"term":"18S","studentId":204712518,"studentName":"BELTREZ, DOMINIQUE ISABELLA","sessionName":"ITALIAN 2 LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-04-09 19:30:00.000","appointmentEnd":"2018-04-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":987971724,"term":"18S","studentId":204712518,"studentName":"BELTREZ, DOMINIQUE ISABELLA","sessionName":"ITALIAN 2 LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-04-16 19:30:00.000","appointmentEnd":"2018-04-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":987971715,"term":"18S","studentId":204712518,"studentName":"BELTREZ, DOMINIQUE ISABELLA","sessionName":"ITALIAN 2 LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-04-23 19:30:00.000","appointmentEnd":"2018-04-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":987971738,"term":"18S","studentId":204712518,"studentName":"BELTREZ, DOMINIQUE ISABELLA","sessionName":"ITALIAN 2 LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-04-30 19:30:00.000","appointmentEnd":"2018-04-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":987971729,"term":"18S","studentId":204712518,"studentName":"BELTREZ, DOMINIQUE ISABELLA","sessionName":"ITALIAN 2 LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-05-07 19:30:00.000","appointmentEnd":"2018-05-07 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":987971752,"term":"18S","studentId":204712518,"studentName":"BELTREZ, DOMINIQUE ISABELLA","sessionName":"ITALIAN 2 LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-05-14 19:30:00.000","appointmentEnd":"2018-05-14 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":987971759,"term":"18S","studentId":204712518,"studentName":"BELTREZ, DOMINIQUE ISABELLA","sessionName":"ITALIAN 2 LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-05-21 19:30:00.000","appointmentEnd":"2018-05-21 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":987971773,"term":"18S","studentId":204712518,"studentName":"BELTREZ, DOMINIQUE ISABELLA","sessionName":"ITALIAN 2 LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-06-04 19:30:00.000","appointmentEnd":"2018-06-04 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1914514380,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-04-10 19:30:00.000","appointmentEnd":"2018-04-10 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1914514359,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-04-17 19:30:00.000","appointmentEnd":"2018-04-17 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1914514366,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-04-24 19:30:00.000","appointmentEnd":"2018-04-24 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1914514337,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-05-01 19:30:00.000","appointmentEnd":"2018-05-01 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1914514344,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-05-08 19:30:00.000","appointmentEnd":"2018-05-08 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1914514323,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-05-15 19:30:00.000","appointmentEnd":"2018-05-15 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1914514330,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-05-22 19:30:00.000","appointmentEnd":"2018-05-22 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1914514333,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-05-29 19:30:00.000","appointmentEnd":"2018-05-29 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1914514308,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-06-05 19:30:00.000","appointmentEnd":"2018-06-05 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1478663848,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"STATS   10 LEC 4","facilitatorName":"JO","appointmentBegin":"2018-04-12 19:30:00.000","appointmentEnd":"2018-04-12 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1478663855,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"STATS   10 LEC 4","facilitatorName":"JO","appointmentBegin":"2018-04-19 19:30:00.000","appointmentEnd":"2018-04-19 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1478663846,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"STATS   10 LEC 4","facilitatorName":"JO","appointmentBegin":"2018-04-26 19:30:00.000","appointmentEnd":"2018-04-26 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1478663869,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"STATS   10 LEC 4","facilitatorName":"JO","appointmentBegin":"2018-05-03 19:30:00.000","appointmentEnd":"2018-05-03 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1478663860,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"STATS   10 LEC 4","facilitatorName":"JO","appointmentBegin":"2018-05-10 19:30:00.000","appointmentEnd":"2018-05-10 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1478663819,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"STATS   10 LEC 4","facilitatorName":"JO","appointmentBegin":"2018-05-17 19:30:00.000","appointmentEnd":"2018-05-17 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1478663810,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"STATS   10 LEC 4","facilitatorName":"JO","appointmentBegin":"2018-05-24 19:30:00.000","appointmentEnd":"2018-05-24 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1478663833,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"STATS   10 LEC 4","facilitatorName":"JO","appointmentBegin":"2018-05-31 19:30:00.000","appointmentEnd":"2018-05-31 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1478663824,"term":"18S","studentId":204963502,"studentName":"FAULKNOR, KENNEDY JADE","sessionName":"STATS   10 LEC 4","facilitatorName":"JO","appointmentBegin":"2018-06-07 19:30:00.000","appointmentEnd":"2018-06-07 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-637502494,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-04-17 18:30:00.000","appointmentEnd":"2018-04-17 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-637502485,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-04-24 18:30:00.000","appointmentEnd":"2018-04-24 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-637502476,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-01 18:30:00.000","appointmentEnd":"2018-05-01 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-637502467,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-08 18:30:00.000","appointmentEnd":"2018-05-08 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-637502522,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-15 18:30:00.000","appointmentEnd":"2018-05-15 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-637502513,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-22 18:30:00.000","appointmentEnd":"2018-05-22 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-637502520,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-29 18:30:00.000","appointmentEnd":"2018-05-29 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-637502511,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-06-05 18:30:00.000","appointmentEnd":"2018-06-05 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-637502567,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-04-10 18:30:00.000","appointmentEnd":"2018-04-10 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":348008902,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"SPAN    25 LEC 2","facilitatorName":"SHAUNA","appointmentBegin":"2018-04-11 20:30:00.000","appointmentEnd":"2018-04-11 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":348008895,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"SPAN    25 LEC 2","facilitatorName":"SHAUNA","appointmentBegin":"2018-04-18 20:30:00.000","appointmentEnd":"2018-04-18 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":348008884,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"SPAN    25 LEC 2","facilitatorName":"SHAUNA","appointmentBegin":"2018-04-25 20:30:00.000","appointmentEnd":"2018-04-25 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":348008877,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"SPAN    25 LEC 2","facilitatorName":"SHAUNA","appointmentBegin":"2018-05-02 20:30:00.000","appointmentEnd":"2018-05-02 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":348008866,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"SPAN    25 LEC 2","facilitatorName":"SHAUNA","appointmentBegin":"2018-05-09 20:30:00.000","appointmentEnd":"2018-05-09 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":348008859,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"SPAN    25 LEC 2","facilitatorName":"SHAUNA","appointmentBegin":"2018-05-16 20:30:00.000","appointmentEnd":"2018-05-16 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":348008848,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"SPAN    25 LEC 2","facilitatorName":"SHAUNA","appointmentBegin":"2018-05-23 20:30:00.000","appointmentEnd":"2018-05-23 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":348008841,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"SPAN    25 LEC 2","facilitatorName":"SHAUNA","appointmentBegin":"2018-05-30 20:30:00.000","appointmentEnd":"2018-05-30 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":348008846,"term":"18S","studentId":204965285,"studentName":"LOREN, KIRA NICOLE","sessionName":"SPAN    25 LEC 2","facilitatorName":"SHAUNA","appointmentBegin":"2018-06-06 20:30:00.000","appointmentEnd":"2018-06-06 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1476280791,"term":"18S","studentId":204974572,"studentName":"KOOYMAN, SAVANNAH SHAY","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-04-09 19:30:00.000","appointmentEnd":"2018-04-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1476280752,"term":"18S","studentId":204974572,"studentName":"KOOYMAN, SAVANNAH SHAY","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-04-16 19:30:00.000","appointmentEnd":"2018-04-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":60618851,"term":"18S","studentId":204974572,"studentName":"KOOYMAN, SAVANNAH SHAY","sessionName":"ENG 4W ALL LECs","facilitatorName":"CONOR","appointmentBegin":"2018-04-12 18:30:00.000","appointmentEnd":"2018-04-12 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":60618852,"term":"18S","studentId":204974572,"studentName":"KOOYMAN, SAVANNAH SHAY","sessionName":"ENG 4W ALL LECs","facilitatorName":"CONOR","appointmentBegin":"2018-04-19 18:30:00.000","appointmentEnd":"2018-04-19 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":60618861,"term":"18S","studentId":204974572,"studentName":"KOOYMAN, SAVANNAH SHAY","sessionName":"ENG 4W ALL LECs","facilitatorName":"CONOR","appointmentBegin":"2018-04-26 18:30:00.000","appointmentEnd":"2018-04-26 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":60618870,"term":"18S","studentId":204974572,"studentName":"KOOYMAN, SAVANNAH SHAY","sessionName":"ENG 4W ALL LECs","facilitatorName":"CONOR","appointmentBegin":"2018-05-03 18:30:00.000","appointmentEnd":"2018-05-03 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":60618879,"term":"18S","studentId":204974572,"studentName":"KOOYMAN, SAVANNAH SHAY","sessionName":"ENG 4W ALL LECs","facilitatorName":"CONOR","appointmentBegin":"2018-05-10 18:30:00.000","appointmentEnd":"2018-05-10 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":60618816,"term":"18S","studentId":204974572,"studentName":"KOOYMAN, SAVANNAH SHAY","sessionName":"ENG 4W ALL LECs","facilitatorName":"CONOR","appointmentBegin":"2018-05-17 18:30:00.000","appointmentEnd":"2018-05-17 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":60618825,"term":"18S","studentId":204974572,"studentName":"KOOYMAN, SAVANNAH SHAY","sessionName":"ENG 4W ALL LECs","facilitatorName":"CONOR","appointmentBegin":"2018-05-24 18:30:00.000","appointmentEnd":"2018-05-24 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":60618834,"term":"18S","studentId":204974572,"studentName":"KOOYMAN, SAVANNAH SHAY","sessionName":"ENG 4W ALL LECs","facilitatorName":"CONOR","appointmentBegin":"2018-05-31 18:30:00.000","appointmentEnd":"2018-05-31 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":60618843,"term":"18S","studentId":204974572,"studentName":"KOOYMAN, SAVANNAH SHAY","sessionName":"ENG 4W ALL LECs","facilitatorName":"CONOR","appointmentBegin":"2018-06-07 18:30:00.000","appointmentEnd":"2018-06-07 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1476280735,"term":"18S","studentId":204974572,"studentName":"KOOYMAN, SAVANNAH SHAY","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-06-04 19:30:00.000","appointmentEnd":"2018-06-04 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1476280737,"term":"18S","studentId":204974572,"studentName":"KOOYMAN, SAVANNAH SHAY","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-04-23 19:30:00.000","appointmentEnd":"2018-04-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1476280762,"term":"18S","studentId":204974572,"studentName":"KOOYMAN, SAVANNAH SHAY","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-04-30 19:30:00.000","appointmentEnd":"2018-04-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1476280755,"term":"18S","studentId":204974572,"studentName":"KOOYMAN, SAVANNAH SHAY","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-05-07 19:30:00.000","appointmentEnd":"2018-05-07 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1476280716,"term":"18S","studentId":204974572,"studentName":"KOOYMAN, SAVANNAH SHAY","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-05-14 19:30:00.000","appointmentEnd":"2018-05-14 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1476280717,"term":"18S","studentId":204974572,"studentName":"KOOYMAN, SAVANNAH SHAY","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-05-21 19:30:00.000","appointmentEnd":"2018-05-21 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-379114988,"term":"18S","studentId":204982044,"studentName":"OWENS, KAYLA SIMONE","sessionName":"EPS SCI 17 LEC 1","facilitatorName":"DALMA","appointmentBegin":"2018-04-10 18:30:00.000","appointmentEnd":"2018-04-10 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-379114897,"term":"18S","studentId":204982044,"studentName":"OWENS, KAYLA SIMONE","sessionName":"EPS SCI 17 LEC 1","facilitatorName":"DALMA","appointmentBegin":"2018-04-17 18:30:00.000","appointmentEnd":"2018-04-17 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-379114906,"term":"18S","studentId":204982044,"studentName":"OWENS, KAYLA SIMONE","sessionName":"EPS SCI 17 LEC 1","facilitatorName":"DALMA","appointmentBegin":"2018-04-24 18:30:00.000","appointmentEnd":"2018-04-24 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-379114887,"term":"18S","studentId":204982044,"studentName":"OWENS, KAYLA SIMONE","sessionName":"EPS SCI 17 LEC 1","facilitatorName":"DALMA","appointmentBegin":"2018-05-01 18:30:00.000","appointmentEnd":"2018-05-01 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-379114896,"term":"18S","studentId":204982044,"studentName":"OWENS, KAYLA SIMONE","sessionName":"EPS SCI 17 LEC 1","facilitatorName":"DALMA","appointmentBegin":"2018-05-08 18:30:00.000","appointmentEnd":"2018-05-08 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-379114933,"term":"18S","studentId":204982044,"studentName":"OWENS, KAYLA SIMONE","sessionName":"EPS SCI 17 LEC 1","facilitatorName":"DALMA","appointmentBegin":"2018-05-15 18:30:00.000","appointmentEnd":"2018-05-15 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-379114942,"term":"18S","studentId":204982044,"studentName":"OWENS, KAYLA SIMONE","sessionName":"EPS SCI 17 LEC 1","facilitatorName":"DALMA","appointmentBegin":"2018-05-22 18:30:00.000","appointmentEnd":"2018-05-22 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-379114939,"term":"18S","studentId":204982044,"studentName":"OWENS, KAYLA SIMONE","sessionName":"EPS SCI 17 LEC 1","facilitatorName":"DALMA","appointmentBegin":"2018-05-29 18:30:00.000","appointmentEnd":"2018-05-29 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-379114916,"term":"18S","studentId":204982044,"studentName":"OWENS, KAYLA SIMONE","sessionName":"EPS SCI 17 LEC 1","facilitatorName":"DALMA","appointmentBegin":"2018-06-05 18:30:00.000","appointmentEnd":"2018-06-05 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":149984073,"term":"18S","studentId":205062708,"studentName":"TERWEGE, BRANDON MICHAEL","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BECKIE","appointmentBegin":"2018-04-09 18:30:00.000","appointmentEnd":"2018-04-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":149984048,"term":"18S","studentId":205062708,"studentName":"TERWEGE, BRANDON MICHAEL","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BECKIE","appointmentBegin":"2018-04-16 18:30:00.000","appointmentEnd":"2018-04-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":149984063,"term":"18S","studentId":205062708,"studentName":"TERWEGE, BRANDON MICHAEL","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BECKIE","appointmentBegin":"2018-04-23 18:30:00.000","appointmentEnd":"2018-04-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":149984038,"term":"18S","studentId":205062708,"studentName":"TERWEGE, BRANDON MICHAEL","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BECKIE","appointmentBegin":"2018-04-30 18:30:00.000","appointmentEnd":"2018-04-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":149984045,"term":"18S","studentId":205062708,"studentName":"TERWEGE, BRANDON MICHAEL","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BECKIE","appointmentBegin":"2018-05-07 18:30:00.000","appointmentEnd":"2018-05-07 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":149984020,"term":"18S","studentId":205062708,"studentName":"TERWEGE, BRANDON MICHAEL","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BECKIE","appointmentBegin":"2018-05-14 18:30:00.000","appointmentEnd":"2018-05-14 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":149984019,"term":"18S","studentId":205062708,"studentName":"TERWEGE, BRANDON MICHAEL","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BECKIE","appointmentBegin":"2018-05-21 18:30:00.000","appointmentEnd":"2018-05-21 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":149984001,"term":"18S","studentId":205062708,"studentName":"TERWEGE, BRANDON MICHAEL","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BECKIE","appointmentBegin":"2018-06-04 18:30:00.000","appointmentEnd":"2018-06-04 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-904339314,"term":"18S","studentId":304903881,"studentName":"PARKS, ALEX HAYDEN","sessionName":"SPAN 2 ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-04-10 19:30:00.000","appointmentEnd":"2018-04-10 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-904339211,"term":"18S","studentId":304903881,"studentName":"PARKS, ALEX HAYDEN","sessionName":"SPAN 2 ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-04-17 19:30:00.000","appointmentEnd":"2018-04-17 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-904339204,"term":"18S","studentId":304903881,"studentName":"PARKS, ALEX HAYDEN","sessionName":"SPAN 2 ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-04-24 19:30:00.000","appointmentEnd":"2018-04-24 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-904339229,"term":"18S","studentId":304903881,"studentName":"PARKS, ALEX HAYDEN","sessionName":"SPAN 2 ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-05-01 19:30:00.000","appointmentEnd":"2018-05-01 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-904339222,"term":"18S","studentId":304903881,"studentName":"PARKS, ALEX HAYDEN","sessionName":"SPAN 2 ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-05-08 19:30:00.000","appointmentEnd":"2018-05-08 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-904339247,"term":"18S","studentId":304903881,"studentName":"PARKS, ALEX HAYDEN","sessionName":"SPAN 2 ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-05-15 19:30:00.000","appointmentEnd":"2018-05-15 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-904339240,"term":"18S","studentId":304903881,"studentName":"PARKS, ALEX HAYDEN","sessionName":"SPAN 2 ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-05-22 19:30:00.000","appointmentEnd":"2018-05-22 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-904339233,"term":"18S","studentId":304903881,"studentName":"PARKS, ALEX HAYDEN","sessionName":"SPAN 2 ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-05-29 19:30:00.000","appointmentEnd":"2018-05-29 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-904339258,"term":"18S","studentId":304903881,"studentName":"PARKS, ALEX HAYDEN","sessionName":"SPAN 2 ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-06-05 19:30:00.000","appointmentEnd":"2018-06-05 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1017661949,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"JOSH","appointmentBegin":"2018-04-12 18:30:00.000","appointmentEnd":"2018-04-12 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1017661946,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"JOSH","appointmentBegin":"2018-04-19 18:30:00.000","appointmentEnd":"2018-04-19 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1017661939,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"JOSH","appointmentBegin":"2018-04-26 18:30:00.000","appointmentEnd":"2018-04-26 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1017661928,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"JOSH","appointmentBegin":"2018-05-03 18:30:00.000","appointmentEnd":"2018-05-03 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1017661921,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"JOSH","appointmentBegin":"2018-05-10 18:30:00.000","appointmentEnd":"2018-05-10 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1017661918,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"JOSH","appointmentBegin":"2018-05-17 18:30:00.000","appointmentEnd":"2018-05-17 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1017661911,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"JOSH","appointmentBegin":"2018-05-24 18:30:00.000","appointmentEnd":"2018-05-24 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1017661900,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"JOSH","appointmentBegin":"2018-05-31 18:30:00.000","appointmentEnd":"2018-05-31 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1017661893,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"JOSH","appointmentBegin":"2018-06-07 18:30:00.000","appointmentEnd":"2018-06-07 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2135178127,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-06-06 18:30:00.000","appointmentEnd":"2018-06-06 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1501398775,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-04-11 19:30:00.000","appointmentEnd":"2018-04-11 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1501398672,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-04-18 19:30:00.000","appointmentEnd":"2018-04-18 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1501398661,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-04-25 19:30:00.000","appointmentEnd":"2018-04-25 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1501398686,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-05-02 19:30:00.000","appointmentEnd":"2018-05-02 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1501398675,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-05-09 19:30:00.000","appointmentEnd":"2018-05-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1501398700,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-05-16 19:30:00.000","appointmentEnd":"2018-05-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1501398689,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-05-23 19:30:00.000","appointmentEnd":"2018-05-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1501398714,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-05-30 19:30:00.000","appointmentEnd":"2018-05-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1501398719,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-06-06 19:30:00.000","appointmentEnd":"2018-06-06 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2135178147,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-09 18:30:00.000","appointmentEnd":"2018-05-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2135178156,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-02 18:30:00.000","appointmentEnd":"2018-05-02 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2135178165,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-04-25 18:30:00.000","appointmentEnd":"2018-04-25 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2135178174,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-04-18 18:30:00.000","appointmentEnd":"2018-04-18 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2135178183,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-04-11 18:30:00.000","appointmentEnd":"2018-04-11 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2135178120,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-30 18:30:00.000","appointmentEnd":"2018-05-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2135178129,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-23 18:30:00.000","appointmentEnd":"2018-05-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2135178138,"term":"18S","studentId":304910711,"studentName":"ANDREW, OLIVIA GRACE","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-16 18:30:00.000","appointmentEnd":"2018-05-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201830742,"term":"18S","studentId":305063222,"studentName":"GONZALEZ, SOFIA ISABEL TACA","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-06-06 17:30:00.000","appointmentEnd":"2018-06-06 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201830728,"term":"18S","studentId":305063222,"studentName":"GONZALEZ, SOFIA ISABEL TACA","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-23 17:30:00.000","appointmentEnd":"2018-05-23 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201830737,"term":"18S","studentId":305063222,"studentName":"GONZALEZ, SOFIA ISABEL TACA","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-30 17:30:00.000","appointmentEnd":"2018-05-30 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201830686,"term":"18S","studentId":305063222,"studentName":"GONZALEZ, SOFIA ISABEL TACA","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-04-11 17:30:00.000","appointmentEnd":"2018-04-11 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201830759,"term":"18S","studentId":305063222,"studentName":"GONZALEZ, SOFIA ISABEL TACA","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-04-18 17:30:00.000","appointmentEnd":"2018-04-18 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201830764,"term":"18S","studentId":305063222,"studentName":"GONZALEZ, SOFIA ISABEL TACA","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-04-25 17:30:00.000","appointmentEnd":"2018-04-25 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201830773,"term":"18S","studentId":305063222,"studentName":"GONZALEZ, SOFIA ISABEL TACA","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-02 17:30:00.000","appointmentEnd":"2018-05-02 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201830778,"term":"18S","studentId":305063222,"studentName":"GONZALEZ, SOFIA ISABEL TACA","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-09 17:30:00.000","appointmentEnd":"2018-05-09 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201830723,"term":"18S","studentId":305063222,"studentName":"GONZALEZ, SOFIA ISABEL TACA","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-16 17:30:00.000","appointmentEnd":"2018-05-16 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-428492733,"term":"18S","studentId":305069097,"studentName":"DOUGLAS, CAMERON MAURICE","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-05-30 17:30:00.000","appointmentEnd":"2018-05-30 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-428492788,"term":"18S","studentId":305069097,"studentName":"DOUGLAS, CAMERON MAURICE","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-04-11 17:30:00.000","appointmentEnd":"2018-04-11 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-428492683,"term":"18S","studentId":305069097,"studentName":"DOUGLAS, CAMERON MAURICE","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-04-18 17:30:00.000","appointmentEnd":"2018-04-18 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-428492674,"term":"18S","studentId":305069097,"studentName":"DOUGLAS, CAMERON MAURICE","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-04-25 17:30:00.000","appointmentEnd":"2018-04-25 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-428492697,"term":"18S","studentId":305069097,"studentName":"DOUGLAS, CAMERON MAURICE","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-05-02 17:30:00.000","appointmentEnd":"2018-05-02 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-428492696,"term":"18S","studentId":305069097,"studentName":"DOUGLAS, CAMERON MAURICE","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-05-09 17:30:00.000","appointmentEnd":"2018-05-09 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-428492719,"term":"18S","studentId":305069097,"studentName":"DOUGLAS, CAMERON MAURICE","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-05-16 17:30:00.000","appointmentEnd":"2018-05-16 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-428492710,"term":"18S","studentId":305069097,"studentName":"DOUGLAS, CAMERON MAURICE","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-05-23 17:30:00.000","appointmentEnd":"2018-05-23 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-428492732,"term":"18S","studentId":305069097,"studentName":"DOUGLAS, CAMERON MAURICE","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-06-06 17:30:00.000","appointmentEnd":"2018-06-06 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522951338,"term":"18S","studentId":404565309,"studentName":"BURKE, KENNEDY VALENTINE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-04-10 18:30:00.000","appointmentEnd":"2018-04-10 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522951377,"term":"18S","studentId":404565309,"studentName":"BURKE, KENNEDY VALENTINE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-04-17 18:30:00.000","appointmentEnd":"2018-04-17 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522951384,"term":"18S","studentId":404565309,"studentName":"BURKE, KENNEDY VALENTINE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-04-24 18:30:00.000","appointmentEnd":"2018-04-24 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522951367,"term":"18S","studentId":404565309,"studentName":"BURKE, KENNEDY VALENTINE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-05-01 18:30:00.000","appointmentEnd":"2018-05-01 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522951374,"term":"18S","studentId":404565309,"studentName":"BURKE, KENNEDY VALENTINE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-05-08 18:30:00.000","appointmentEnd":"2018-05-08 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522951413,"term":"18S","studentId":404565309,"studentName":"BURKE, KENNEDY VALENTINE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-05-15 18:30:00.000","appointmentEnd":"2018-05-15 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522951420,"term":"18S","studentId":404565309,"studentName":"BURKE, KENNEDY VALENTINE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-05-22 18:30:00.000","appointmentEnd":"2018-05-22 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522951419,"term":"18S","studentId":404565309,"studentName":"BURKE, KENNEDY VALENTINE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-05-29 18:30:00.000","appointmentEnd":"2018-05-29 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1522951394,"term":"18S","studentId":404565309,"studentName":"BURKE, KENNEDY VALENTINE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-06-05 18:30:00.000","appointmentEnd":"2018-06-05 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-999636420,"term":"18S","studentId":404633493,"studentName":"ACOLATSE, SUZIE MAUREEN","sessionName":"SOCIOL  102 LEC 2","facilitatorName":"SYDNEY","appointmentBegin":"2018-04-10 18:30:00.000","appointmentEnd":"2018-04-10 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-999636409,"term":"18S","studentId":404633493,"studentName":"ACOLATSE, SUZIE MAUREEN","sessionName":"SOCIOL  102 LEC 2","facilitatorName":"SYDNEY","appointmentBegin":"2018-04-17 18:30:00.000","appointmentEnd":"2018-04-17 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-999636402,"term":"18S","studentId":404633493,"studentName":"ACOLATSE, SUZIE MAUREEN","sessionName":"SOCIOL  102 LEC 2","facilitatorName":"SYDNEY","appointmentBegin":"2018-04-24 18:30:00.000","appointmentEnd":"2018-04-24 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-999636399,"term":"18S","studentId":404633493,"studentName":"ACOLATSE, SUZIE MAUREEN","sessionName":"SOCIOL  102 LEC 2","facilitatorName":"SYDNEY","appointmentBegin":"2018-05-01 18:30:00.000","appointmentEnd":"2018-05-01 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-999636392,"term":"18S","studentId":404633493,"studentName":"ACOLATSE, SUZIE MAUREEN","sessionName":"SOCIOL  102 LEC 2","facilitatorName":"SYDNEY","appointmentBegin":"2018-05-08 18:30:00.000","appointmentEnd":"2018-05-08 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-999636381,"term":"18S","studentId":404633493,"studentName":"ACOLATSE, SUZIE MAUREEN","sessionName":"SOCIOL  102 LEC 2","facilitatorName":"SYDNEY","appointmentBegin":"2018-05-15 18:30:00.000","appointmentEnd":"2018-05-15 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-999636374,"term":"18S","studentId":404633493,"studentName":"ACOLATSE, SUZIE MAUREEN","sessionName":"SOCIOL  102 LEC 2","facilitatorName":"SYDNEY","appointmentBegin":"2018-05-22 18:30:00.000","appointmentEnd":"2018-05-22 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-999636371,"term":"18S","studentId":404633493,"studentName":"ACOLATSE, SUZIE MAUREEN","sessionName":"SOCIOL  102 LEC 2","facilitatorName":"SYDNEY","appointmentBegin":"2018-05-29 18:30:00.000","appointmentEnd":"2018-05-29 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-999636364,"term":"18S","studentId":404633493,"studentName":"ACOLATSE, SUZIE MAUREEN","sessionName":"SOCIOL  102 LEC 2","facilitatorName":"SYDNEY","appointmentBegin":"2018-06-05 18:30:00.000","appointmentEnd":"2018-06-05 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1348614474,"term":"18S","studentId":404712051,"studentName":"OLESINSKI, ALEX JAN","sessionName":"ECON    11 LEC 1","facilitatorName":"LAVANYA","appointmentBegin":"2018-04-10 19:30:00.000","appointmentEnd":"2018-04-10 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1348614449,"term":"18S","studentId":404712051,"studentName":"OLESINSKI, ALEX JAN","sessionName":"ECON    11 LEC 1","facilitatorName":"LAVANYA","appointmentBegin":"2018-04-17 19:30:00.000","appointmentEnd":"2018-04-17 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1348614456,"term":"18S","studentId":404712051,"studentName":"OLESINSKI, ALEX JAN","sessionName":"ECON    11 LEC 1","facilitatorName":"LAVANYA","appointmentBegin":"2018-04-24 19:30:00.000","appointmentEnd":"2018-04-24 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1348614439,"term":"18S","studentId":404712051,"studentName":"OLESINSKI, ALEX JAN","sessionName":"ECON    11 LEC 1","facilitatorName":"LAVANYA","appointmentBegin":"2018-05-01 19:30:00.000","appointmentEnd":"2018-05-01 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1348614446,"term":"18S","studentId":404712051,"studentName":"OLESINSKI, ALEX JAN","sessionName":"ECON    11 LEC 1","facilitatorName":"LAVANYA","appointmentBegin":"2018-05-08 19:30:00.000","appointmentEnd":"2018-05-08 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1348614421,"term":"18S","studentId":404712051,"studentName":"OLESINSKI, ALEX JAN","sessionName":"ECON    11 LEC 1","facilitatorName":"LAVANYA","appointmentBegin":"2018-05-15 19:30:00.000","appointmentEnd":"2018-05-15 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1348614428,"term":"18S","studentId":404712051,"studentName":"OLESINSKI, ALEX JAN","sessionName":"ECON    11 LEC 1","facilitatorName":"LAVANYA","appointmentBegin":"2018-05-22 19:30:00.000","appointmentEnd":"2018-05-22 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1348614427,"term":"18S","studentId":404712051,"studentName":"OLESINSKI, ALEX JAN","sessionName":"ECON    11 LEC 1","facilitatorName":"LAVANYA","appointmentBegin":"2018-05-29 19:30:00.000","appointmentEnd":"2018-05-29 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1348614402,"term":"18S","studentId":404712051,"studentName":"OLESINSKI, ALEX JAN","sessionName":"ECON    11 LEC 1","facilitatorName":"LAVANYA","appointmentBegin":"2018-06-05 19:30:00.000","appointmentEnd":"2018-06-05 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2075652478,"term":"18S","studentId":404914921,"studentName":"KARLOUS, REBECCA (REBECCA LYN)","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-04-18 17:30:00.000","appointmentEnd":"2018-04-18 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2075652359,"term":"18S","studentId":404914921,"studentName":"KARLOUS, REBECCA (REBECCA LYN)","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-04-11 17:30:00.000","appointmentEnd":"2018-04-11 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2075652442,"term":"18S","studentId":404914921,"studentName":"KARLOUS, REBECCA (REBECCA LYN)","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-16 17:30:00.000","appointmentEnd":"2018-05-16 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2075652451,"term":"18S","studentId":404914921,"studentName":"KARLOUS, REBECCA (REBECCA LYN)","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-09 17:30:00.000","appointmentEnd":"2018-05-09 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2075652460,"term":"18S","studentId":404914921,"studentName":"KARLOUS, REBECCA (REBECCA LYN)","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-02 17:30:00.000","appointmentEnd":"2018-05-02 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2075652469,"term":"18S","studentId":404914921,"studentName":"KARLOUS, REBECCA (REBECCA LYN)","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-04-25 17:30:00.000","appointmentEnd":"2018-04-25 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2075652424,"term":"18S","studentId":404914921,"studentName":"KARLOUS, REBECCA (REBECCA LYN)","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-30 17:30:00.000","appointmentEnd":"2018-05-30 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2075652433,"term":"18S","studentId":404914921,"studentName":"KARLOUS, REBECCA (REBECCA LYN)","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-23 17:30:00.000","appointmentEnd":"2018-05-23 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2075652431,"term":"18S","studentId":404914921,"studentName":"KARLOUS, REBECCA (REBECCA LYN)","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-06-06 17:30:00.000","appointmentEnd":"2018-06-06 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-47733885,"term":"18S","studentId":404934189,"studentName":"QUARLES, MALIA SARAH","sessionName":"SOCIOL  1 LEC 1","facilitatorName":"KAJAL","appointmentBegin":"2018-04-09 18:30:00.000","appointmentEnd":"2018-04-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-47733766,"term":"18S","studentId":404934189,"studentName":"QUARLES, MALIA SARAH","sessionName":"SOCIOL  1 LEC 1","facilitatorName":"KAJAL","appointmentBegin":"2018-04-16 18:30:00.000","appointmentEnd":"2018-04-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-47733771,"term":"18S","studentId":404934189,"studentName":"QUARLES, MALIA SARAH","sessionName":"SOCIOL  1 LEC 1","facilitatorName":"KAJAL","appointmentBegin":"2018-04-23 18:30:00.000","appointmentEnd":"2018-04-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-47733780,"term":"18S","studentId":404934189,"studentName":"QUARLES, MALIA SARAH","sessionName":"SOCIOL  1 LEC 1","facilitatorName":"KAJAL","appointmentBegin":"2018-04-30 18:30:00.000","appointmentEnd":"2018-04-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-47733785,"term":"18S","studentId":404934189,"studentName":"QUARLES, MALIA SARAH","sessionName":"SOCIOL  1 LEC 1","facilitatorName":"KAJAL","appointmentBegin":"2018-05-07 18:30:00.000","appointmentEnd":"2018-05-07 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-47733794,"term":"18S","studentId":404934189,"studentName":"QUARLES, MALIA SARAH","sessionName":"SOCIOL  1 LEC 1","facilitatorName":"KAJAL","appointmentBegin":"2018-05-14 18:30:00.000","appointmentEnd":"2018-05-14 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-47733799,"term":"18S","studentId":404934189,"studentName":"QUARLES, MALIA SARAH","sessionName":"SOCIOL  1 LEC 1","facilitatorName":"KAJAL","appointmentBegin":"2018-05-21 18:30:00.000","appointmentEnd":"2018-05-21 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-47733813,"term":"18S","studentId":404934189,"studentName":"QUARLES, MALIA SARAH","sessionName":"SOCIOL  1 LEC 1","facilitatorName":"KAJAL","appointmentBegin":"2018-06-04 18:30:00.000","appointmentEnd":"2018-06-04 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":638241933,"term":"18S","studentId":404937362,"studentName":"DENNIS, NIA CAMILLE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-04-11 18:30:00.000","appointmentEnd":"2018-04-11 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":638242036,"term":"18S","studentId":404937362,"studentName":"DENNIS, NIA CAMILLE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-04-18 18:30:00.000","appointmentEnd":"2018-04-18 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":638242047,"term":"18S","studentId":404937362,"studentName":"DENNIS, NIA CAMILLE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-04-25 18:30:00.000","appointmentEnd":"2018-04-25 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":638242022,"term":"18S","studentId":404937362,"studentName":"DENNIS, NIA CAMILLE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-05-02 18:30:00.000","appointmentEnd":"2018-05-02 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":638242025,"term":"18S","studentId":404937362,"studentName":"DENNIS, NIA CAMILLE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-05-09 18:30:00.000","appointmentEnd":"2018-05-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":638242000,"term":"18S","studentId":404937362,"studentName":"DENNIS, NIA CAMILLE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-05-16 18:30:00.000","appointmentEnd":"2018-05-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":638242011,"term":"18S","studentId":404937362,"studentName":"DENNIS, NIA CAMILLE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-05-23 18:30:00.000","appointmentEnd":"2018-05-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":638241986,"term":"18S","studentId":404937362,"studentName":"DENNIS, NIA CAMILLE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-05-30 18:30:00.000","appointmentEnd":"2018-05-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":638241989,"term":"18S","studentId":404937362,"studentName":"DENNIS, NIA CAMILLE","sessionName":"ENGCOMP 100W","facilitatorName":"DALMA","appointmentBegin":"2018-06-06 18:30:00.000","appointmentEnd":"2018-06-06 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1367722022,"term":"18S","studentId":404987696,"studentName":"POSTON, KENDAL RAE","sessionName":"ENG 4W ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-04-09 18:30:00.000","appointmentEnd":"2018-04-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1367722077,"term":"18S","studentId":404987696,"studentName":"POSTON, KENDAL RAE","sessionName":"ENG 4W ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-04-16 18:30:00.000","appointmentEnd":"2018-04-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1367722068,"term":"18S","studentId":404987696,"studentName":"POSTON, KENDAL RAE","sessionName":"ENG 4W ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-04-23 18:30:00.000","appointmentEnd":"2018-04-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1367722059,"term":"18S","studentId":404987696,"studentName":"POSTON, KENDAL RAE","sessionName":"ENG 4W ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-04-30 18:30:00.000","appointmentEnd":"2018-04-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1367722050,"term":"18S","studentId":404987696,"studentName":"POSTON, KENDAL RAE","sessionName":"ENG 4W ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-05-07 18:30:00.000","appointmentEnd":"2018-05-07 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1367722105,"term":"18S","studentId":404987696,"studentName":"POSTON, KENDAL RAE","sessionName":"ENG 4W ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-05-14 18:30:00.000","appointmentEnd":"2018-05-14 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1367722112,"term":"18S","studentId":404987696,"studentName":"POSTON, KENDAL RAE","sessionName":"ENG 4W ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-05-21 18:30:00.000","appointmentEnd":"2018-05-21 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1367722094,"term":"18S","studentId":404987696,"studentName":"POSTON, KENDAL RAE","sessionName":"ENG 4W ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-06-04 18:30:00.000","appointmentEnd":"2018-06-04 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201729194,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"ASTR    3 LEC 2","facilitatorName":"BEN","appointmentBegin":"2018-04-10 18:30:00.000","appointmentEnd":"2018-04-10 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201729233,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"ASTR    3 LEC 2","facilitatorName":"BEN","appointmentBegin":"2018-04-17 18:30:00.000","appointmentEnd":"2018-04-17 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201729240,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"ASTR    3 LEC 2","facilitatorName":"BEN","appointmentBegin":"2018-04-24 18:30:00.000","appointmentEnd":"2018-04-24 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201729223,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"ASTR    3 LEC 2","facilitatorName":"BEN","appointmentBegin":"2018-05-01 18:30:00.000","appointmentEnd":"2018-05-01 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201729230,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"ASTR    3 LEC 2","facilitatorName":"BEN","appointmentBegin":"2018-05-08 18:30:00.000","appointmentEnd":"2018-05-08 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201729269,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"ASTR    3 LEC 2","facilitatorName":"BEN","appointmentBegin":"2018-05-15 18:30:00.000","appointmentEnd":"2018-05-15 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201729276,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"ASTR    3 LEC 2","facilitatorName":"BEN","appointmentBegin":"2018-05-22 18:30:00.000","appointmentEnd":"2018-05-22 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201729275,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"ASTR    3 LEC 2","facilitatorName":"BEN","appointmentBegin":"2018-05-29 18:30:00.000","appointmentEnd":"2018-05-29 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":201729250,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"ASTR    3 LEC 2","facilitatorName":"BEN","appointmentBegin":"2018-06-05 18:30:00.000","appointmentEnd":"2018-06-05 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753287243,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-05-01 19:30:00.000","appointmentEnd":"2018-05-01 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753287254,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-04-24 19:30:00.000","appointmentEnd":"2018-04-24 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753287261,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-04-17 19:30:00.000","appointmentEnd":"2018-04-17 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753287208,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-04-10 19:30:00.000","appointmentEnd":"2018-04-10 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753287287,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-05-29 19:30:00.000","appointmentEnd":"2018-05-29 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753287282,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-05-22 19:30:00.000","appointmentEnd":"2018-05-22 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753287289,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-05-15 19:30:00.000","appointmentEnd":"2018-05-15 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753287236,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-05-08 19:30:00.000","appointmentEnd":"2018-05-08 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1753287280,"term":"18S","studentId":405217115,"studentName":"SMITH, DARIUS AHMED","sessionName":"SPAN 1 ALL LECs","facilitatorName":"MEGAN R.","appointmentBegin":"2018-06-05 19:30:00.000","appointmentEnd":"2018-06-05 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1940193747,"term":"18S","studentId":504712055,"studentName":"OKWARABIZIE, IKENNA CASMIR","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-15 18:30:00.000","appointmentEnd":"2018-05-15 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1940193754,"term":"18S","studentId":504712055,"studentName":"OKWARABIZIE, IKENNA CASMIR","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-22 18:30:00.000","appointmentEnd":"2018-05-22 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1940193757,"term":"18S","studentId":504712055,"studentName":"OKWARABIZIE, IKENNA CASMIR","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-29 18:30:00.000","appointmentEnd":"2018-05-29 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1940193732,"term":"18S","studentId":504712055,"studentName":"OKWARABIZIE, IKENNA CASMIR","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-06-05 18:30:00.000","appointmentEnd":"2018-06-05 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1940193676,"term":"18S","studentId":504712055,"studentName":"OKWARABIZIE, IKENNA CASMIR","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-04-10 18:30:00.000","appointmentEnd":"2018-04-10 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1940193783,"term":"18S","studentId":504712055,"studentName":"OKWARABIZIE, IKENNA CASMIR","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-04-17 18:30:00.000","appointmentEnd":"2018-04-17 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1940193790,"term":"18S","studentId":504712055,"studentName":"OKWARABIZIE, IKENNA CASMIR","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-04-24 18:30:00.000","appointmentEnd":"2018-04-24 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1940193761,"term":"18S","studentId":504712055,"studentName":"OKWARABIZIE, IKENNA CASMIR","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-01 18:30:00.000","appointmentEnd":"2018-05-01 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1940193768,"term":"18S","studentId":504712055,"studentName":"OKWARABIZIE, IKENNA CASMIR","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-08 18:30:00.000","appointmentEnd":"2018-05-08 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-121343513,"term":"18S","studentId":504899642,"studentName":"BRZYKCY, LAUREN ANN","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-08 18:30:00.000","appointmentEnd":"2018-05-08 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-121343506,"term":"18S","studentId":504899642,"studentName":"BRZYKCY, LAUREN ANN","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-01 18:30:00.000","appointmentEnd":"2018-05-01 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-121343503,"term":"18S","studentId":504899642,"studentName":"BRZYKCY, LAUREN ANN","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-04-24 18:30:00.000","appointmentEnd":"2018-04-24 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-121343496,"term":"18S","studentId":504899642,"studentName":"BRZYKCY, LAUREN ANN","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-04-17 18:30:00.000","appointmentEnd":"2018-04-17 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-121343613,"term":"18S","studentId":504899642,"studentName":"BRZYKCY, LAUREN ANN","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-04-10 18:30:00.000","appointmentEnd":"2018-04-10 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-121343541,"term":"18S","studentId":504899642,"studentName":"BRZYKCY, LAUREN ANN","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-06-05 18:30:00.000","appointmentEnd":"2018-06-05 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-121343534,"term":"18S","studentId":504899642,"studentName":"BRZYKCY, LAUREN ANN","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-29 18:30:00.000","appointmentEnd":"2018-05-29 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-121343531,"term":"18S","studentId":504899642,"studentName":"BRZYKCY, LAUREN ANN","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-22 18:30:00.000","appointmentEnd":"2018-05-22 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-121343524,"term":"18S","studentId":504899642,"studentName":"BRZYKCY, LAUREN ANN","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-15 18:30:00.000","appointmentEnd":"2018-05-15 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1160957536,"term":"18S","studentId":504899642,"studentName":"BRZYKCY, LAUREN ANN","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-06-04 19:30:00.000","appointmentEnd":"2018-06-04 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1160957557,"term":"18S","studentId":504899642,"studentName":"BRZYKCY, LAUREN ANN","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-05-14 19:30:00.000","appointmentEnd":"2018-05-14 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1160957554,"term":"18S","studentId":504899642,"studentName":"BRZYKCY, LAUREN ANN","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-05-21 19:30:00.000","appointmentEnd":"2018-05-21 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1160957511,"term":"18S","studentId":504899642,"studentName":"BRZYKCY, LAUREN ANN","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-04-30 19:30:00.000","appointmentEnd":"2018-04-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1160957516,"term":"18S","studentId":504899642,"studentName":"BRZYKCY, LAUREN ANN","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-05-07 19:30:00.000","appointmentEnd":"2018-05-07 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1160957521,"term":"18S","studentId":504899642,"studentName":"BRZYKCY, LAUREN ANN","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-04-16 19:30:00.000","appointmentEnd":"2018-04-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1160957534,"term":"18S","studentId":504899642,"studentName":"BRZYKCY, LAUREN ANN","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-04-23 19:30:00.000","appointmentEnd":"2018-04-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1160957480,"term":"18S","studentId":504899642,"studentName":"BRZYKCY, LAUREN ANN","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-04-09 19:30:00.000","appointmentEnd":"2018-04-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1531470185,"term":"18S","studentId":504905817,"studentName":"ADLER, ERIKA HAHN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-04-10 18:30:00.000","appointmentEnd":"2018-04-10 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1531470100,"term":"18S","studentId":504905817,"studentName":"ADLER, ERIKA HAHN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-04-17 18:30:00.000","appointmentEnd":"2018-04-17 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1531470107,"term":"18S","studentId":504905817,"studentName":"ADLER, ERIKA HAHN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-04-24 18:30:00.000","appointmentEnd":"2018-04-24 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1531470086,"term":"18S","studentId":504905817,"studentName":"ADLER, ERIKA HAHN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-05-01 18:30:00.000","appointmentEnd":"2018-05-01 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1531470093,"term":"18S","studentId":504905817,"studentName":"ADLER, ERIKA HAHN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-05-08 18:30:00.000","appointmentEnd":"2018-05-08 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1531470136,"term":"18S","studentId":504905817,"studentName":"ADLER, ERIKA HAHN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-05-15 18:30:00.000","appointmentEnd":"2018-05-15 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1531470143,"term":"18S","studentId":504905817,"studentName":"ADLER, ERIKA HAHN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-05-22 18:30:00.000","appointmentEnd":"2018-05-22 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1531470138,"term":"18S","studentId":504905817,"studentName":"ADLER, ERIKA HAHN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-05-29 18:30:00.000","appointmentEnd":"2018-05-29 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1531470113,"term":"18S","studentId":504905817,"studentName":"ADLER, ERIKA HAHN","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LINDSEY","appointmentBegin":"2018-06-05 18:30:00.000","appointmentEnd":"2018-06-05 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-872305072,"term":"18S","studentId":504910574,"studentName":"BERNSTEIN, LEILA HIERONS","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-04-16 19:30:00.000","appointmentEnd":"2018-04-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-872305111,"term":"18S","studentId":504910574,"studentName":"BERNSTEIN, LEILA HIERONS","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-04-09 19:30:00.000","appointmentEnd":"2018-04-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-872305057,"term":"18S","studentId":504910574,"studentName":"BERNSTEIN, LEILA HIERONS","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-04-23 19:30:00.000","appointmentEnd":"2018-04-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-872305082,"term":"18S","studentId":504910574,"studentName":"BERNSTEIN, LEILA HIERONS","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-04-30 19:30:00.000","appointmentEnd":"2018-04-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-872305037,"term":"18S","studentId":504910574,"studentName":"BERNSTEIN, LEILA HIERONS","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-05-21 19:30:00.000","appointmentEnd":"2018-05-21 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-872305036,"term":"18S","studentId":504910574,"studentName":"BERNSTEIN, LEILA HIERONS","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-05-14 19:30:00.000","appointmentEnd":"2018-05-14 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-872305075,"term":"18S","studentId":504910574,"studentName":"BERNSTEIN, LEILA HIERONS","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-05-07 19:30:00.000","appointmentEnd":"2018-05-07 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-872305055,"term":"18S","studentId":504910574,"studentName":"BERNSTEIN, LEILA HIERONS","sessionName":"PSYCH   10 LEC 2","facilitatorName":"ROSEMARIE","appointmentBegin":"2018-06-04 19:30:00.000","appointmentEnd":"2018-06-04 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1190335462,"term":"18S","studentId":504979747,"studentName":"ONYENWERE, MICHAELA NNE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-04-10 19:30:00.000","appointmentEnd":"2018-04-10 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1190335389,"term":"18S","studentId":504979747,"studentName":"ONYENWERE, MICHAELA NNE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-04-17 19:30:00.000","appointmentEnd":"2018-04-17 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1190335380,"term":"18S","studentId":504979747,"studentName":"ONYENWERE, MICHAELA NNE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-04-24 19:30:00.000","appointmentEnd":"2018-04-24 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1190335371,"term":"18S","studentId":504979747,"studentName":"ONYENWERE, MICHAELA NNE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-05-01 19:30:00.000","appointmentEnd":"2018-05-01 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1190335362,"term":"18S","studentId":504979747,"studentName":"ONYENWERE, MICHAELA NNE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-05-08 19:30:00.000","appointmentEnd":"2018-05-08 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1190335417,"term":"18S","studentId":504979747,"studentName":"ONYENWERE, MICHAELA NNE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-05-15 19:30:00.000","appointmentEnd":"2018-05-15 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1190335408,"term":"18S","studentId":504979747,"studentName":"ONYENWERE, MICHAELA NNE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-05-22 19:30:00.000","appointmentEnd":"2018-05-22 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1190335415,"term":"18S","studentId":504979747,"studentName":"ONYENWERE, MICHAELA NNE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-05-29 19:30:00.000","appointmentEnd":"2018-05-29 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1190335406,"term":"18S","studentId":504979747,"studentName":"ONYENWERE, MICHAELA NNE","sessionName":"STATS   10 LEC 2","facilitatorName":"KAJAL","appointmentBegin":"2018-06-05 19:30:00.000","appointmentEnd":"2018-06-05 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1812083100,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"GEOG    5 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-04-10 19:30:00.000","appointmentEnd":"2018-04-10 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1812083175,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"GEOG    5 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-04-17 19:30:00.000","appointmentEnd":"2018-04-17 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1812083182,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"GEOG    5 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-04-24 19:30:00.000","appointmentEnd":"2018-04-24 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1812083185,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"GEOG    5 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-05-01 19:30:00.000","appointmentEnd":"2018-05-01 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1812083192,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"GEOG    5 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-05-08 19:30:00.000","appointmentEnd":"2018-05-08 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1812083139,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"GEOG    5 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-05-15 19:30:00.000","appointmentEnd":"2018-05-15 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1812083146,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"GEOG    5 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-05-22 19:30:00.000","appointmentEnd":"2018-05-22 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1812083149,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"GEOG    5 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-05-29 19:30:00.000","appointmentEnd":"2018-05-29 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1812083156,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"GEOG    5 LEC 1","facilitatorName":"SHELLEY","appointmentBegin":"2018-06-05 19:30:00.000","appointmentEnd":"2018-06-05 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":177301947,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-04-11 19:30:00.000","appointmentEnd":"2018-04-11 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":177301954,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-04-18 19:30:00.000","appointmentEnd":"2018-04-18 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":177301961,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-04-25 19:30:00.000","appointmentEnd":"2018-04-25 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":177301968,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-05-02 19:30:00.000","appointmentEnd":"2018-05-02 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":177301983,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-05-09 19:30:00.000","appointmentEnd":"2018-05-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":177301990,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-05-16 19:30:00.000","appointmentEnd":"2018-05-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":177301997,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-05-23 19:30:00.000","appointmentEnd":"2018-05-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":177302004,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-05-30 19:30:00.000","appointmentEnd":"2018-05-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":177302003,"term":"18S","studentId":505071283,"studentName":"SAVELJIC, NICOLAS","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-06-06 19:30:00.000","appointmentEnd":"2018-06-06 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":240103340,"term":"18S","studentId":604894427,"studentName":"WULFF, ISAAC MILLER","sessionName":"POL SCI 10 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-04-10 18:30:00.000","appointmentEnd":"2018-04-10 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":240103383,"term":"18S","studentId":604894427,"studentName":"WULFF, ISAAC MILLER","sessionName":"POL SCI 10 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-04-17 18:30:00.000","appointmentEnd":"2018-04-17 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":240103390,"term":"18S","studentId":604894427,"studentName":"WULFF, ISAAC MILLER","sessionName":"POL SCI 10 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-04-24 18:30:00.000","appointmentEnd":"2018-04-24 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":240103361,"term":"18S","studentId":604894427,"studentName":"WULFF, ISAAC MILLER","sessionName":"POL SCI 10 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-05-01 18:30:00.000","appointmentEnd":"2018-05-01 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":240103368,"term":"18S","studentId":604894427,"studentName":"WULFF, ISAAC MILLER","sessionName":"POL SCI 10 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-05-08 18:30:00.000","appointmentEnd":"2018-05-08 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":240103411,"term":"18S","studentId":604894427,"studentName":"WULFF, ISAAC MILLER","sessionName":"POL SCI 10 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-05-15 18:30:00.000","appointmentEnd":"2018-05-15 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":240103418,"term":"18S","studentId":604894427,"studentName":"WULFF, ISAAC MILLER","sessionName":"POL SCI 10 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-05-22 18:30:00.000","appointmentEnd":"2018-05-22 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":240103421,"term":"18S","studentId":604894427,"studentName":"WULFF, ISAAC MILLER","sessionName":"POL SCI 10 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-05-29 18:30:00.000","appointmentEnd":"2018-05-29 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":240103396,"term":"18S","studentId":604894427,"studentName":"WULFF, ISAAC MILLER","sessionName":"POL SCI 10 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-06-05 18:30:00.000","appointmentEnd":"2018-06-05 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":933663672,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"HIST    119D LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-04-11 19:30:00.000","appointmentEnd":"2018-04-11 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":933663681,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"HIST    119D LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-04-18 19:30:00.000","appointmentEnd":"2018-04-18 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":933663690,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"HIST    119D LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-04-25 19:30:00.000","appointmentEnd":"2018-04-25 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":933663699,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"HIST    119D LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-05-02 19:30:00.000","appointmentEnd":"2018-05-02 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":933663708,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"HIST    119D LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-05-09 19:30:00.000","appointmentEnd":"2018-05-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":933663717,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"HIST    119D LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-05-16 19:30:00.000","appointmentEnd":"2018-05-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":933663726,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"HIST    119D LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-05-23 19:30:00.000","appointmentEnd":"2018-05-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":933663735,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"HIST    119D LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-05-30 19:30:00.000","appointmentEnd":"2018-05-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":933663728,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"HIST    119D LEC 1","facilitatorName":"CHRISTINA","appointmentBegin":"2018-06-06 19:30:00.000","appointmentEnd":"2018-06-06 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":631069564,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"FRENCH 2 ALL LECs","facilitatorName":"SAM B.","appointmentBegin":"2018-04-11 20:30:00.000","appointmentEnd":"2018-04-11 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":631069445,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"FRENCH 2 ALL LECs","facilitatorName":"SAM B.","appointmentBegin":"2018-04-18 20:30:00.000","appointmentEnd":"2018-04-18 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":631069454,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"FRENCH 2 ALL LECs","facilitatorName":"SAM B.","appointmentBegin":"2018-04-25 20:30:00.000","appointmentEnd":"2018-04-25 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":631069463,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"FRENCH 2 ALL LECs","facilitatorName":"SAM B.","appointmentBegin":"2018-05-02 20:30:00.000","appointmentEnd":"2018-05-02 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":631069464,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"FRENCH 2 ALL LECs","facilitatorName":"SAM B.","appointmentBegin":"2018-05-09 20:30:00.000","appointmentEnd":"2018-05-09 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":631069473,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"FRENCH 2 ALL LECs","facilitatorName":"SAM B.","appointmentBegin":"2018-05-16 20:30:00.000","appointmentEnd":"2018-05-16 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":631069482,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"FRENCH 2 ALL LECs","facilitatorName":"SAM B.","appointmentBegin":"2018-05-23 20:30:00.000","appointmentEnd":"2018-05-23 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":631069491,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"FRENCH 2 ALL LECs","facilitatorName":"SAM B.","appointmentBegin":"2018-05-30 20:30:00.000","appointmentEnd":"2018-05-30 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":631069492,"term":"18S","studentId":604903813,"studentName":"SAUNDERS, PATRICK JOHN","sessionName":"FRENCH 2 ALL LECs","facilitatorName":"SAM B.","appointmentBegin":"2018-06-06 20:30:00.000","appointmentEnd":"2018-06-06 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1242774471,"term":"18S","studentId":604925264,"studentName":"BELLAMY, LUCAS OLIVER","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-04-11 18:30:00.000","appointmentEnd":"2018-04-11 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1242774462,"term":"18S","studentId":604925264,"studentName":"BELLAMY, LUCAS OLIVER","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-04-18 18:30:00.000","appointmentEnd":"2018-04-18 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1242774453,"term":"18S","studentId":604925264,"studentName":"BELLAMY, LUCAS OLIVER","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-04-25 18:30:00.000","appointmentEnd":"2018-04-25 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1242774444,"term":"18S","studentId":604925264,"studentName":"BELLAMY, LUCAS OLIVER","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-02 18:30:00.000","appointmentEnd":"2018-05-02 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1242774435,"term":"18S","studentId":604925264,"studentName":"BELLAMY, LUCAS OLIVER","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-09 18:30:00.000","appointmentEnd":"2018-05-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1242774426,"term":"18S","studentId":604925264,"studentName":"BELLAMY, LUCAS OLIVER","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-16 18:30:00.000","appointmentEnd":"2018-05-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":221531792,"term":"18S","studentId":604925264,"studentName":"BELLAMY, LUCAS OLIVER","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LANEY","appointmentBegin":"2018-04-09 18:30:00.000","appointmentEnd":"2018-04-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":221531881,"term":"18S","studentId":604925264,"studentName":"BELLAMY, LUCAS OLIVER","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LANEY","appointmentBegin":"2018-04-16 18:30:00.000","appointmentEnd":"2018-04-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":221531878,"term":"18S","studentId":604925264,"studentName":"BELLAMY, LUCAS OLIVER","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LANEY","appointmentBegin":"2018-04-23 18:30:00.000","appointmentEnd":"2018-04-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":221531903,"term":"18S","studentId":604925264,"studentName":"BELLAMY, LUCAS OLIVER","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LANEY","appointmentBegin":"2018-04-30 18:30:00.000","appointmentEnd":"2018-04-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":221531892,"term":"18S","studentId":604925264,"studentName":"BELLAMY, LUCAS OLIVER","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LANEY","appointmentBegin":"2018-05-07 18:30:00.000","appointmentEnd":"2018-05-07 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":221531853,"term":"18S","studentId":604925264,"studentName":"BELLAMY, LUCAS OLIVER","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LANEY","appointmentBegin":"2018-05-14 18:30:00.000","appointmentEnd":"2018-05-14 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":221531850,"term":"18S","studentId":604925264,"studentName":"BELLAMY, LUCAS OLIVER","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LANEY","appointmentBegin":"2018-05-21 18:30:00.000","appointmentEnd":"2018-05-21 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":221531864,"term":"18S","studentId":604925264,"studentName":"BELLAMY, LUCAS OLIVER","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LANEY","appointmentBegin":"2018-06-04 18:30:00.000","appointmentEnd":"2018-06-04 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1242774417,"term":"18S","studentId":604925264,"studentName":"BELLAMY, LUCAS OLIVER","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-23 18:30:00.000","appointmentEnd":"2018-05-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1242774408,"term":"18S","studentId":604925264,"studentName":"BELLAMY, LUCAS OLIVER","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-05-30 18:30:00.000","appointmentEnd":"2018-05-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1242774415,"term":"18S","studentId":604925264,"studentName":"BELLAMY, LUCAS OLIVER","sessionName":"EPS SCI 15 LEC 1","facilitatorName":"WILL","appointmentBegin":"2018-06-06 18:30:00.000","appointmentEnd":"2018-06-06 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1534847824,"term":"18S","studentId":604962888,"studentName":"WILSON, ALYSSA NICOLE","sessionName":"MATH    3B LEC 1","facilitatorName":"MITALI","appointmentBegin":"2018-04-10 18:30:00.000","appointmentEnd":"2018-04-10 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1534847787,"term":"18S","studentId":604962888,"studentName":"WILSON, ALYSSA NICOLE","sessionName":"MATH    3B LEC 1","facilitatorName":"MITALI","appointmentBegin":"2018-04-17 18:30:00.000","appointmentEnd":"2018-04-17 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1534847778,"term":"18S","studentId":604962888,"studentName":"WILSON, ALYSSA NICOLE","sessionName":"MATH    3B LEC 1","facilitatorName":"MITALI","appointmentBegin":"2018-04-24 18:30:00.000","appointmentEnd":"2018-04-24 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1534847805,"term":"18S","studentId":604962888,"studentName":"WILSON, ALYSSA NICOLE","sessionName":"MATH    3B LEC 1","facilitatorName":"MITALI","appointmentBegin":"2018-05-01 18:30:00.000","appointmentEnd":"2018-05-01 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1534847796,"term":"18S","studentId":604962888,"studentName":"WILSON, ALYSSA NICOLE","sessionName":"MATH    3B LEC 1","facilitatorName":"MITALI","appointmentBegin":"2018-05-08 18:30:00.000","appointmentEnd":"2018-05-08 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1534847759,"term":"18S","studentId":604962888,"studentName":"WILSON, ALYSSA NICOLE","sessionName":"MATH    3B LEC 1","facilitatorName":"MITALI","appointmentBegin":"2018-05-15 18:30:00.000","appointmentEnd":"2018-05-15 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1534847750,"term":"18S","studentId":604962888,"studentName":"WILSON, ALYSSA NICOLE","sessionName":"MATH    3B LEC 1","facilitatorName":"MITALI","appointmentBegin":"2018-05-22 18:30:00.000","appointmentEnd":"2018-05-22 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1534847745,"term":"18S","studentId":604962888,"studentName":"WILSON, ALYSSA NICOLE","sessionName":"MATH    3B LEC 1","facilitatorName":"MITALI","appointmentBegin":"2018-05-29 18:30:00.000","appointmentEnd":"2018-05-29 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1534847768,"term":"18S","studentId":604962888,"studentName":"WILSON, ALYSSA NICOLE","sessionName":"MATH    3B LEC 1","facilitatorName":"MITALI","appointmentBegin":"2018-06-05 18:30:00.000","appointmentEnd":"2018-06-05 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1868283595,"term":"18S","studentId":604962888,"studentName":"WILSON, ALYSSA NICOLE","sessionName":"LIFESCI 7C LEC 1","facilitatorName":"SHAUNA","appointmentBegin":"2018-04-09 19:30:00.000","appointmentEnd":"2018-04-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1868283570,"term":"18S","studentId":604962888,"studentName":"WILSON, ALYSSA NICOLE","sessionName":"LIFESCI 7C LEC 1","facilitatorName":"SHAUNA","appointmentBegin":"2018-04-16 19:30:00.000","appointmentEnd":"2018-04-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1868283581,"term":"18S","studentId":604962888,"studentName":"WILSON, ALYSSA NICOLE","sessionName":"LIFESCI 7C LEC 1","facilitatorName":"SHAUNA","appointmentBegin":"2018-04-23 19:30:00.000","appointmentEnd":"2018-04-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1868283556,"term":"18S","studentId":604962888,"studentName":"WILSON, ALYSSA NICOLE","sessionName":"LIFESCI 7C LEC 1","facilitatorName":"SHAUNA","appointmentBegin":"2018-04-30 19:30:00.000","appointmentEnd":"2018-04-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1868283567,"term":"18S","studentId":604962888,"studentName":"WILSON, ALYSSA NICOLE","sessionName":"LIFESCI 7C LEC 1","facilitatorName":"SHAUNA","appointmentBegin":"2018-05-07 19:30:00.000","appointmentEnd":"2018-05-07 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1868283542,"term":"18S","studentId":604962888,"studentName":"WILSON, ALYSSA NICOLE","sessionName":"LIFESCI 7C LEC 1","facilitatorName":"SHAUNA","appointmentBegin":"2018-05-14 19:30:00.000","appointmentEnd":"2018-05-14 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1868283537,"term":"18S","studentId":604962888,"studentName":"WILSON, ALYSSA NICOLE","sessionName":"LIFESCI 7C LEC 1","facilitatorName":"SHAUNA","appointmentBegin":"2018-05-21 19:30:00.000","appointmentEnd":"2018-05-21 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1868283523,"term":"18S","studentId":604962888,"studentName":"WILSON, ALYSSA NICOLE","sessionName":"LIFESCI 7C LEC 1","facilitatorName":"SHAUNA","appointmentBegin":"2018-06-04 19:30:00.000","appointmentEnd":"2018-06-04 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":696673544,"term":"18S","studentId":604964528,"studentName":"CARTER, PAIGE ALLMARAS","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-06-06 18:30:00.000","appointmentEnd":"2018-06-06 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":696673551,"term":"18S","studentId":604964528,"studentName":"CARTER, PAIGE ALLMARAS","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-05-30 18:30:00.000","appointmentEnd":"2018-05-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":696673558,"term":"18S","studentId":604964528,"studentName":"CARTER, PAIGE ALLMARAS","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-05-23 18:30:00.000","appointmentEnd":"2018-05-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":696673565,"term":"18S","studentId":604964528,"studentName":"CARTER, PAIGE ALLMARAS","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-05-16 18:30:00.000","appointmentEnd":"2018-05-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":696673572,"term":"18S","studentId":604964528,"studentName":"CARTER, PAIGE ALLMARAS","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-05-09 18:30:00.000","appointmentEnd":"2018-05-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":696673579,"term":"18S","studentId":604964528,"studentName":"CARTER, PAIGE ALLMARAS","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-05-02 18:30:00.000","appointmentEnd":"2018-05-02 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":696673586,"term":"18S","studentId":604964528,"studentName":"CARTER, PAIGE ALLMARAS","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-04-25 18:30:00.000","appointmentEnd":"2018-04-25 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":696673593,"term":"18S","studentId":604964528,"studentName":"CARTER, PAIGE ALLMARAS","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-04-18 18:30:00.000","appointmentEnd":"2018-04-18 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":696673600,"term":"18S","studentId":604964528,"studentName":"CARTER, PAIGE ALLMARAS","sessionName":"PSYCH   15 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-04-11 18:30:00.000","appointmentEnd":"2018-04-11 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1018611648,"term":"18S","studentId":604974688,"studentName":"NORRIS, JAMES RYAN","sessionName":"A&O SCI 2 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-04-09 18:30:00.000","appointmentEnd":"2018-04-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1018611655,"term":"18S","studentId":604974688,"studentName":"NORRIS, JAMES RYAN","sessionName":"A&O SCI 2 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-04-16 18:30:00.000","appointmentEnd":"2018-04-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1018611658,"term":"18S","studentId":604974688,"studentName":"NORRIS, JAMES RYAN","sessionName":"A&O SCI 2 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-04-23 18:30:00.000","appointmentEnd":"2018-04-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1018611665,"term":"18S","studentId":604974688,"studentName":"NORRIS, JAMES RYAN","sessionName":"A&O SCI 2 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-04-30 18:30:00.000","appointmentEnd":"2018-04-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1018611676,"term":"18S","studentId":604974688,"studentName":"NORRIS, JAMES RYAN","sessionName":"A&O SCI 2 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-05-07 18:30:00.000","appointmentEnd":"2018-05-07 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1018611683,"term":"18S","studentId":604974688,"studentName":"NORRIS, JAMES RYAN","sessionName":"A&O SCI 2 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-05-14 18:30:00.000","appointmentEnd":"2018-05-14 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1018611686,"term":"18S","studentId":604974688,"studentName":"NORRIS, JAMES RYAN","sessionName":"A&O SCI 2 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-05-21 18:30:00.000","appointmentEnd":"2018-05-21 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1018611704,"term":"18S","studentId":604974688,"studentName":"NORRIS, JAMES RYAN","sessionName":"A&O SCI 2 LEC 1","facilitatorName":"JESSICA","appointmentBegin":"2018-06-04 18:30:00.000","appointmentEnd":"2018-06-04 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2029538388,"term":"18S","studentId":604989053,"studentName":"FARRELL, CHASE RYAN","sessionName":"PHILOS  5 LEC 1","facilitatorName":"BECKIE","appointmentBegin":"2018-04-09 19:30:00.000","appointmentEnd":"2018-04-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2029538349,"term":"18S","studentId":604989053,"studentName":"FARRELL, CHASE RYAN","sessionName":"PHILOS  5 LEC 1","facilitatorName":"BECKIE","appointmentBegin":"2018-04-16 19:30:00.000","appointmentEnd":"2018-04-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2029538338,"term":"18S","studentId":604989053,"studentName":"FARRELL, CHASE RYAN","sessionName":"PHILOS  5 LEC 1","facilitatorName":"BECKIE","appointmentBegin":"2018-04-23 19:30:00.000","appointmentEnd":"2018-04-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2029538363,"term":"18S","studentId":604989053,"studentName":"FARRELL, CHASE RYAN","sessionName":"PHILOS  5 LEC 1","facilitatorName":"BECKIE","appointmentBegin":"2018-04-30 19:30:00.000","appointmentEnd":"2018-04-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2029538352,"term":"18S","studentId":604989053,"studentName":"FARRELL, CHASE RYAN","sessionName":"PHILOS  5 LEC 1","facilitatorName":"BECKIE","appointmentBegin":"2018-05-07 19:30:00.000","appointmentEnd":"2018-05-07 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2029538313,"term":"18S","studentId":604989053,"studentName":"FARRELL, CHASE RYAN","sessionName":"PHILOS  5 LEC 1","facilitatorName":"BECKIE","appointmentBegin":"2018-05-14 19:30:00.000","appointmentEnd":"2018-05-14 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2029538318,"term":"18S","studentId":604989053,"studentName":"FARRELL, CHASE RYAN","sessionName":"PHILOS  5 LEC 1","facilitatorName":"BECKIE","appointmentBegin":"2018-05-21 19:30:00.000","appointmentEnd":"2018-05-21 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":2029538332,"term":"18S","studentId":604989053,"studentName":"FARRELL, CHASE RYAN","sessionName":"PHILOS  5 LEC 1","facilitatorName":"BECKIE","appointmentBegin":"2018-06-04 19:30:00.000","appointmentEnd":"2018-06-04 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1595403275,"term":"18S","studentId":605066950,"studentName":"CASAROTTO, ILARIA","sessionName":"MATH    3C LEC 1","facilitatorName":"MITALI","appointmentBegin":"2018-04-09 19:30:00.000","appointmentEnd":"2018-04-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1595403378,"term":"18S","studentId":605066950,"studentName":"CASAROTTO, ILARIA","sessionName":"MATH    3C LEC 1","facilitatorName":"MITALI","appointmentBegin":"2018-04-16 19:30:00.000","appointmentEnd":"2018-04-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1595403389,"term":"18S","studentId":605066950,"studentName":"CASAROTTO, ILARIA","sessionName":"MATH    3C LEC 1","facilitatorName":"MITALI","appointmentBegin":"2018-04-23 19:30:00.000","appointmentEnd":"2018-04-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1595403364,"term":"18S","studentId":605066950,"studentName":"CASAROTTO, ILARIA","sessionName":"MATH    3C LEC 1","facilitatorName":"MITALI","appointmentBegin":"2018-04-30 19:30:00.000","appointmentEnd":"2018-04-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1595403375,"term":"18S","studentId":605066950,"studentName":"CASAROTTO, ILARIA","sessionName":"MATH    3C LEC 1","facilitatorName":"MITALI","appointmentBegin":"2018-05-07 19:30:00.000","appointmentEnd":"2018-05-07 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1595403350,"term":"18S","studentId":605066950,"studentName":"CASAROTTO, ILARIA","sessionName":"MATH    3C LEC 1","facilitatorName":"MITALI","appointmentBegin":"2018-05-14 19:30:00.000","appointmentEnd":"2018-05-14 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1595403345,"term":"18S","studentId":605066950,"studentName":"CASAROTTO, ILARIA","sessionName":"MATH    3C LEC 1","facilitatorName":"MITALI","appointmentBegin":"2018-05-21 19:30:00.000","appointmentEnd":"2018-05-21 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1595403331,"term":"18S","studentId":605066950,"studentName":"CASAROTTO, ILARIA","sessionName":"MATH    3C LEC 1","facilitatorName":"MITALI","appointmentBegin":"2018-06-04 19:30:00.000","appointmentEnd":"2018-06-04 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":940400229,"term":"18S","studentId":605257445,"studentName":"SUNDQUIST, CODY BIAGI","sessionName":"EPS SCI 13 LEC 1","facilitatorName":"JOSH","appointmentBegin":"2018-04-12 20:30:00.000","appointmentEnd":"2018-04-12 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":940400226,"term":"18S","studentId":605257445,"studentName":"SUNDQUIST, CODY BIAGI","sessionName":"EPS SCI 13 LEC 1","facilitatorName":"JOSH","appointmentBegin":"2018-04-19 20:30:00.000","appointmentEnd":"2018-04-19 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":940400235,"term":"18S","studentId":605257445,"studentName":"SUNDQUIST, CODY BIAGI","sessionName":"EPS SCI 13 LEC 1","facilitatorName":"JOSH","appointmentBegin":"2018-04-26 20:30:00.000","appointmentEnd":"2018-04-26 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":940400240,"term":"18S","studentId":605257445,"studentName":"SUNDQUIST, CODY BIAGI","sessionName":"EPS SCI 13 LEC 1","facilitatorName":"JOSH","appointmentBegin":"2018-05-03 20:30:00.000","appointmentEnd":"2018-05-03 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":940400249,"term":"18S","studentId":605257445,"studentName":"SUNDQUIST, CODY BIAGI","sessionName":"EPS SCI 13 LEC 1","facilitatorName":"JOSH","appointmentBegin":"2018-05-10 20:30:00.000","appointmentEnd":"2018-05-10 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":940400198,"term":"18S","studentId":605257445,"studentName":"SUNDQUIST, CODY BIAGI","sessionName":"EPS SCI 13 LEC 1","facilitatorName":"JOSH","appointmentBegin":"2018-05-17 20:30:00.000","appointmentEnd":"2018-05-17 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":940400207,"term":"18S","studentId":605257445,"studentName":"SUNDQUIST, CODY BIAGI","sessionName":"EPS SCI 13 LEC 1","facilitatorName":"JOSH","appointmentBegin":"2018-05-24 20:30:00.000","appointmentEnd":"2018-05-24 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":940400212,"term":"18S","studentId":605257445,"studentName":"SUNDQUIST, CODY BIAGI","sessionName":"EPS SCI 13 LEC 1","facilitatorName":"JOSH","appointmentBegin":"2018-05-31 20:30:00.000","appointmentEnd":"2018-05-31 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":940400221,"term":"18S","studentId":605257445,"studentName":"SUNDQUIST, CODY BIAGI","sessionName":"EPS SCI 13 LEC 1","facilitatorName":"JOSH","appointmentBegin":"2018-06-07 20:30:00.000","appointmentEnd":"2018-06-07 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":896144464,"term":"18S","studentId":704562154,"studentName":"ALUMBRES, CESAR JEROME AGUILAR","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-04-11 18:30:00.000","appointmentEnd":"2018-04-11 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":896144425,"term":"18S","studentId":704562154,"studentName":"ALUMBRES, CESAR JEROME AGUILAR","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-04-18 18:30:00.000","appointmentEnd":"2018-04-18 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":896144418,"term":"18S","studentId":704562154,"studentName":"ALUMBRES, CESAR JEROME AGUILAR","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-04-25 18:30:00.000","appointmentEnd":"2018-04-25 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":896144443,"term":"18S","studentId":704562154,"studentName":"ALUMBRES, CESAR JEROME AGUILAR","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-05-02 18:30:00.000","appointmentEnd":"2018-05-02 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":896144436,"term":"18S","studentId":704562154,"studentName":"ALUMBRES, CESAR JEROME AGUILAR","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-05-09 18:30:00.000","appointmentEnd":"2018-05-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":896144397,"term":"18S","studentId":704562154,"studentName":"ALUMBRES, CESAR JEROME AGUILAR","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-05-16 18:30:00.000","appointmentEnd":"2018-05-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":896144390,"term":"18S","studentId":704562154,"studentName":"ALUMBRES, CESAR JEROME AGUILAR","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-05-23 18:30:00.000","appointmentEnd":"2018-05-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":896144415,"term":"18S","studentId":704562154,"studentName":"ALUMBRES, CESAR JEROME AGUILAR","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-05-30 18:30:00.000","appointmentEnd":"2018-05-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":896144408,"term":"18S","studentId":704562154,"studentName":"ALUMBRES, CESAR JEROME AGUILAR","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-06-06 18:30:00.000","appointmentEnd":"2018-06-06 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1307365090,"term":"18S","studentId":704936243,"studentName":"BAILEY, COLIN MICHAEL","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-04-11 18:30:00.000","appointmentEnd":"2018-04-11 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1307365019,"term":"18S","studentId":704936243,"studentName":"BAILEY, COLIN MICHAEL","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-04-18 18:30:00.000","appointmentEnd":"2018-04-18 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1307365008,"term":"18S","studentId":704936243,"studentName":"BAILEY, COLIN MICHAEL","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-04-25 18:30:00.000","appointmentEnd":"2018-04-25 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1307365001,"term":"18S","studentId":704936243,"studentName":"BAILEY, COLIN MICHAEL","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-05-02 18:30:00.000","appointmentEnd":"2018-05-02 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1307364998,"term":"18S","studentId":704936243,"studentName":"BAILEY, COLIN MICHAEL","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-05-09 18:30:00.000","appointmentEnd":"2018-05-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1307365055,"term":"18S","studentId":704936243,"studentName":"BAILEY, COLIN MICHAEL","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-05-16 18:30:00.000","appointmentEnd":"2018-05-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1307365044,"term":"18S","studentId":704936243,"studentName":"BAILEY, COLIN MICHAEL","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-05-23 18:30:00.000","appointmentEnd":"2018-05-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1307365037,"term":"18S","studentId":704936243,"studentName":"BAILEY, COLIN MICHAEL","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-05-30 18:30:00.000","appointmentEnd":"2018-05-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1307365034,"term":"18S","studentId":704936243,"studentName":"BAILEY, COLIN MICHAEL","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"SAM B.","appointmentBegin":"2018-06-06 18:30:00.000","appointmentEnd":"2018-06-06 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1317515232,"term":"18S","studentId":704962147,"studentName":"PARISH, IAN RICHARD","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BEN","appointmentBegin":"2018-04-09 18:30:00.000","appointmentEnd":"2018-04-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1317515161,"term":"18S","studentId":704962147,"studentName":"PARISH, IAN RICHARD","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BEN","appointmentBegin":"2018-04-16 18:30:00.000","appointmentEnd":"2018-04-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1317515158,"term":"18S","studentId":704962147,"studentName":"PARISH, IAN RICHARD","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BEN","appointmentBegin":"2018-04-23 18:30:00.000","appointmentEnd":"2018-04-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1317515151,"term":"18S","studentId":704962147,"studentName":"PARISH, IAN RICHARD","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BEN","appointmentBegin":"2018-04-30 18:30:00.000","appointmentEnd":"2018-04-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1317515140,"term":"18S","studentId":704962147,"studentName":"PARISH, IAN RICHARD","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BEN","appointmentBegin":"2018-05-07 18:30:00.000","appointmentEnd":"2018-05-07 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1317515197,"term":"18S","studentId":704962147,"studentName":"PARISH, IAN RICHARD","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BEN","appointmentBegin":"2018-05-14 18:30:00.000","appointmentEnd":"2018-05-14 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1317515194,"term":"18S","studentId":704962147,"studentName":"PARISH, IAN RICHARD","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BEN","appointmentBegin":"2018-05-21 18:30:00.000","appointmentEnd":"2018-05-21 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1317515176,"term":"18S","studentId":704962147,"studentName":"PARISH, IAN RICHARD","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"BEN","appointmentBegin":"2018-06-04 18:30:00.000","appointmentEnd":"2018-06-04 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1740438644,"term":"18S","studentId":704962147,"studentName":"PARISH, IAN RICHARD","sessionName":"ECON    2 LEC 1","facilitatorName":"CONOR","appointmentBegin":"2018-04-11 18:30:00.000","appointmentEnd":"2018-04-11 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1740438541,"term":"18S","studentId":704962147,"studentName":"PARISH, IAN RICHARD","sessionName":"ECON    2 LEC 1","facilitatorName":"CONOR","appointmentBegin":"2018-04-18 18:30:00.000","appointmentEnd":"2018-04-18 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1740438534,"term":"18S","studentId":704962147,"studentName":"PARISH, IAN RICHARD","sessionName":"ECON    2 LEC 1","facilitatorName":"CONOR","appointmentBegin":"2018-04-25 18:30:00.000","appointmentEnd":"2018-04-25 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1740438559,"term":"18S","studentId":704962147,"studentName":"PARISH, IAN RICHARD","sessionName":"ECON    2 LEC 1","facilitatorName":"CONOR","appointmentBegin":"2018-05-02 18:30:00.000","appointmentEnd":"2018-05-02 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1740438544,"term":"18S","studentId":704962147,"studentName":"PARISH, IAN RICHARD","sessionName":"ECON    2 LEC 1","facilitatorName":"CONOR","appointmentBegin":"2018-05-09 18:30:00.000","appointmentEnd":"2018-05-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1740438569,"term":"18S","studentId":704962147,"studentName":"PARISH, IAN RICHARD","sessionName":"ECON    2 LEC 1","facilitatorName":"CONOR","appointmentBegin":"2018-05-16 18:30:00.000","appointmentEnd":"2018-05-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1740438562,"term":"18S","studentId":704962147,"studentName":"PARISH, IAN RICHARD","sessionName":"ECON    2 LEC 1","facilitatorName":"CONOR","appointmentBegin":"2018-05-23 18:30:00.000","appointmentEnd":"2018-05-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1740438587,"term":"18S","studentId":704962147,"studentName":"PARISH, IAN RICHARD","sessionName":"ECON    2 LEC 1","facilitatorName":"CONOR","appointmentBegin":"2018-05-30 18:30:00.000","appointmentEnd":"2018-05-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1740438588,"term":"18S","studentId":704962147,"studentName":"PARISH, IAN RICHARD","sessionName":"ECON    2 LEC 1","facilitatorName":"CONOR","appointmentBegin":"2018-06-06 18:30:00.000","appointmentEnd":"2018-06-06 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1575353675,"term":"18S","studentId":705071277,"studentName":"HERRERA YALLONARDO, SANTIAGO","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ALLY","appointmentBegin":"2018-04-11 17:30:00.000","appointmentEnd":"2018-04-11 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1575353650,"term":"18S","studentId":705071277,"studentName":"HERRERA YALLONARDO, SANTIAGO","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ALLY","appointmentBegin":"2018-04-18 17:30:00.000","appointmentEnd":"2018-04-18 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1575353657,"term":"18S","studentId":705071277,"studentName":"HERRERA YALLONARDO, SANTIAGO","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ALLY","appointmentBegin":"2018-04-25 17:30:00.000","appointmentEnd":"2018-04-25 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1575353632,"term":"18S","studentId":705071277,"studentName":"HERRERA YALLONARDO, SANTIAGO","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ALLY","appointmentBegin":"2018-05-02 17:30:00.000","appointmentEnd":"2018-05-02 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1575353647,"term":"18S","studentId":705071277,"studentName":"HERRERA YALLONARDO, SANTIAGO","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ALLY","appointmentBegin":"2018-05-09 17:30:00.000","appointmentEnd":"2018-05-09 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1575353622,"term":"18S","studentId":705071277,"studentName":"HERRERA YALLONARDO, SANTIAGO","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ALLY","appointmentBegin":"2018-05-16 17:30:00.000","appointmentEnd":"2018-05-16 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1575353629,"term":"18S","studentId":705071277,"studentName":"HERRERA YALLONARDO, SANTIAGO","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ALLY","appointmentBegin":"2018-05-23 17:30:00.000","appointmentEnd":"2018-05-23 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1575353604,"term":"18S","studentId":705071277,"studentName":"HERRERA YALLONARDO, SANTIAGO","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ALLY","appointmentBegin":"2018-05-30 17:30:00.000","appointmentEnd":"2018-05-30 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1575353603,"term":"18S","studentId":705071277,"studentName":"HERRERA YALLONARDO, SANTIAGO","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"ALLY","appointmentBegin":"2018-06-06 17:30:00.000","appointmentEnd":"2018-06-06 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-252016947,"term":"18S","studentId":804903063,"studentName":"PETTWAY, ZACHARY LAMARRE","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-04-18 19:30:00.000","appointmentEnd":"2018-04-18 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-252016929,"term":"18S","studentId":804903063,"studentName":"PETTWAY, ZACHARY LAMARRE","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-05-02 19:30:00.000","appointmentEnd":"2018-05-02 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-252016954,"term":"18S","studentId":804903063,"studentName":"PETTWAY, ZACHARY LAMARRE","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-04-25 19:30:00.000","appointmentEnd":"2018-04-25 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-252016901,"term":"18S","studentId":804903063,"studentName":"PETTWAY, ZACHARY LAMARRE","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-05-30 19:30:00.000","appointmentEnd":"2018-05-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-252016926,"term":"18S","studentId":804903063,"studentName":"PETTWAY, ZACHARY LAMARRE","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-05-23 19:30:00.000","appointmentEnd":"2018-05-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-252016919,"term":"18S","studentId":804903063,"studentName":"PETTWAY, ZACHARY LAMARRE","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-05-16 19:30:00.000","appointmentEnd":"2018-05-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-252016944,"term":"18S","studentId":804903063,"studentName":"PETTWAY, ZACHARY LAMARRE","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-05-09 19:30:00.000","appointmentEnd":"2018-05-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-252016972,"term":"18S","studentId":804903063,"studentName":"PETTWAY, ZACHARY LAMARRE","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-04-11 19:30:00.000","appointmentEnd":"2018-04-11 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-252016900,"term":"18S","studentId":804903063,"studentName":"PETTWAY, ZACHARY LAMARRE","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-06-06 19:30:00.000","appointmentEnd":"2018-06-06 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":720473433,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"ENG 4W ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-04-10 20:30:00.000","appointmentEnd":"2018-04-10 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":720473378,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"ENG 4W ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-04-17 20:30:00.000","appointmentEnd":"2018-04-17 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":720473387,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"ENG 4W ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-04-24 20:30:00.000","appointmentEnd":"2018-04-24 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":720473396,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"ENG 4W ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-05-01 20:30:00.000","appointmentEnd":"2018-05-01 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":720473405,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"ENG 4W ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-05-08 20:30:00.000","appointmentEnd":"2018-05-08 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":720473350,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"ENG 4W ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-05-15 20:30:00.000","appointmentEnd":"2018-05-15 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":720473359,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"ENG 4W ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-05-22 20:30:00.000","appointmentEnd":"2018-05-22 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":720473352,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"ENG 4W ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-05-29 20:30:00.000","appointmentEnd":"2018-05-29 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":720473361,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"ENG 4W ALL LECs","facilitatorName":"ANNA G.","appointmentBegin":"2018-06-05 20:30:00.000","appointmentEnd":"2018-06-05 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":40159365,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"ECON    1 LEC 1","facilitatorName":"ALLY","appointmentBegin":"2018-04-09 19:30:00.000","appointmentEnd":"2018-04-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":40159484,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"ECON    1 LEC 1","facilitatorName":"ALLY","appointmentBegin":"2018-04-16 19:30:00.000","appointmentEnd":"2018-04-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":40159475,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"ECON    1 LEC 1","facilitatorName":"ALLY","appointmentBegin":"2018-04-23 19:30:00.000","appointmentEnd":"2018-04-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":40159466,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"ECON    1 LEC 1","facilitatorName":"ALLY","appointmentBegin":"2018-04-30 19:30:00.000","appointmentEnd":"2018-04-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":40159457,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"ECON    1 LEC 1","facilitatorName":"ALLY","appointmentBegin":"2018-05-07 19:30:00.000","appointmentEnd":"2018-05-07 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":40159448,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"ECON    1 LEC 1","facilitatorName":"ALLY","appointmentBegin":"2018-05-14 19:30:00.000","appointmentEnd":"2018-05-14 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":40159455,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"ECON    1 LEC 1","facilitatorName":"ALLY","appointmentBegin":"2018-05-21 19:30:00.000","appointmentEnd":"2018-05-21 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":40159437,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"ECON    1 LEC 1","facilitatorName":"ALLY","appointmentBegin":"2018-06-04 19:30:00.000","appointmentEnd":"2018-06-04 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1251982135,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-04-11 20:30:00.000","appointmentEnd":"2018-04-11 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1251982160,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-04-18 20:30:00.000","appointmentEnd":"2018-04-18 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1251982149,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-04-25 20:30:00.000","appointmentEnd":"2018-04-25 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1251982174,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-05-02 20:30:00.000","appointmentEnd":"2018-05-02 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1251982163,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-05-09 20:30:00.000","appointmentEnd":"2018-05-09 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1251982188,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-05-16 20:30:00.000","appointmentEnd":"2018-05-16 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1251982177,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-05-23 20:30:00.000","appointmentEnd":"2018-05-23 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1251982202,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-05-30 20:30:00.000","appointmentEnd":"2018-05-30 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1251982207,"term":"18S","studentId":804903831,"studentName":"MARKEVICH, VERA","sessionName":"GEOG    4 LEC 1","facilitatorName":"MICHELLE","appointmentBegin":"2018-06-06 20:30:00.000","appointmentEnd":"2018-06-06 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1392736051,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"POL SCI 30 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-04-10 19:30:00.000","appointmentEnd":"2018-04-10 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1392736074,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"POL SCI 30 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-04-17 19:30:00.000","appointmentEnd":"2018-04-17 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1392736065,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"POL SCI 30 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-04-24 19:30:00.000","appointmentEnd":"2018-04-24 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1392736096,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"POL SCI 30 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-05-01 19:30:00.000","appointmentEnd":"2018-05-01 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1392736087,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"POL SCI 30 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-05-08 19:30:00.000","appointmentEnd":"2018-05-08 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1392736110,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"POL SCI 30 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-05-15 19:30:00.000","appointmentEnd":"2018-05-15 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1392736101,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"POL SCI 30 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-05-22 19:30:00.000","appointmentEnd":"2018-05-22 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1392736100,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"POL SCI 30 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-05-29 19:30:00.000","appointmentEnd":"2018-05-29 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1392736123,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"POL SCI 30 LEC 1","facilitatorName":"ROBYN","appointmentBegin":"2018-06-05 19:30:00.000","appointmentEnd":"2018-06-05 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-376572730,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"CHEM    20B LEC 1","facilitatorName":"SAM N.","appointmentBegin":"2018-04-09 20:30:00.000","appointmentEnd":"2018-04-09 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-376572737,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"CHEM    20B LEC 1","facilitatorName":"SAM N.","appointmentBegin":"2018-04-16 20:30:00.000","appointmentEnd":"2018-04-16 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-376572752,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"CHEM    20B LEC 1","facilitatorName":"SAM N.","appointmentBegin":"2018-04-23 20:30:00.000","appointmentEnd":"2018-04-23 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-376572759,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"CHEM    20B LEC 1","facilitatorName":"SAM N.","appointmentBegin":"2018-04-30 20:30:00.000","appointmentEnd":"2018-04-30 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-376572766,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"CHEM    20B LEC 1","facilitatorName":"SAM N.","appointmentBegin":"2018-05-07 20:30:00.000","appointmentEnd":"2018-05-07 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-376572773,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"CHEM    20B LEC 1","facilitatorName":"SAM N.","appointmentBegin":"2018-05-14 20:30:00.000","appointmentEnd":"2018-05-14 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-376572772,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"CHEM    20B LEC 1","facilitatorName":"SAM N.","appointmentBegin":"2018-05-21 20:30:00.000","appointmentEnd":"2018-05-21 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-376572786,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"CHEM    20B LEC 1","facilitatorName":"SAM N.","appointmentBegin":"2018-06-04 20:30:00.000","appointmentEnd":"2018-06-04 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1811134169,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"PHYSCI  5 LEC 1","facilitatorName":"LOGAN","appointmentBegin":"2018-04-10 20:30:00.000","appointmentEnd":"2018-04-10 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1811134116,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"PHYSCI  5 LEC 1","facilitatorName":"LOGAN","appointmentBegin":"2018-04-17 20:30:00.000","appointmentEnd":"2018-04-17 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1811134123,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"PHYSCI  5 LEC 1","facilitatorName":"LOGAN","appointmentBegin":"2018-04-24 20:30:00.000","appointmentEnd":"2018-04-24 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1811134134,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"PHYSCI  5 LEC 1","facilitatorName":"LOGAN","appointmentBegin":"2018-05-01 20:30:00.000","appointmentEnd":"2018-05-01 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1811134141,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"PHYSCI  5 LEC 1","facilitatorName":"LOGAN","appointmentBegin":"2018-05-08 20:30:00.000","appointmentEnd":"2018-05-08 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1811134088,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"PHYSCI  5 LEC 1","facilitatorName":"LOGAN","appointmentBegin":"2018-05-15 20:30:00.000","appointmentEnd":"2018-05-15 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1811134095,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"PHYSCI  5 LEC 1","facilitatorName":"LOGAN","appointmentBegin":"2018-05-22 20:30:00.000","appointmentEnd":"2018-05-22 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1811134090,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"PHYSCI  5 LEC 1","facilitatorName":"LOGAN","appointmentBegin":"2018-05-29 20:30:00.000","appointmentEnd":"2018-05-29 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1811134097,"term":"18S","studentId":804936803,"studentName":"SAWYER, RYAN PATRICK","sessionName":"PHYSCI  5 LEC 1","facilitatorName":"LOGAN","appointmentBegin":"2018-06-05 20:30:00.000","appointmentEnd":"2018-06-05 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":921429011,"term":"18S","studentId":804961944,"studentName":"HANDS, JAYLEN JOSEPH","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-05-30 18:30:00.000","appointmentEnd":"2018-05-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":921429012,"term":"18S","studentId":804961944,"studentName":"HANDS, JAYLEN JOSEPH","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-06-06 18:30:00.000","appointmentEnd":"2018-06-06 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":921428993,"term":"18S","studentId":804961944,"studentName":"HANDS, JAYLEN JOSEPH","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-05-16 18:30:00.000","appointmentEnd":"2018-05-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":921429002,"term":"18S","studentId":804961944,"studentName":"HANDS, JAYLEN JOSEPH","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-05-23 18:30:00.000","appointmentEnd":"2018-05-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-133772479,"term":"18S","studentId":804961944,"studentName":"HANDS, JAYLEN JOSEPH","sessionName":"ANTHRO  1 LEC 1","facilitatorName":"WAANIA","appointmentBegin":"2018-04-09 18:30:00.000","appointmentEnd":"2018-04-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-133772488,"term":"18S","studentId":804961944,"studentName":"HANDS, JAYLEN JOSEPH","sessionName":"ANTHRO  1 LEC 1","facilitatorName":"WAANIA","appointmentBegin":"2018-04-16 18:30:00.000","appointmentEnd":"2018-04-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-133772489,"term":"18S","studentId":804961944,"studentName":"HANDS, JAYLEN JOSEPH","sessionName":"ANTHRO  1 LEC 1","facilitatorName":"WAANIA","appointmentBegin":"2018-04-23 18:30:00.000","appointmentEnd":"2018-04-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-133772498,"term":"18S","studentId":804961944,"studentName":"HANDS, JAYLEN JOSEPH","sessionName":"ANTHRO  1 LEC 1","facilitatorName":"WAANIA","appointmentBegin":"2018-04-30 18:30:00.000","appointmentEnd":"2018-04-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-133772507,"term":"18S","studentId":804961944,"studentName":"HANDS, JAYLEN JOSEPH","sessionName":"ANTHRO  1 LEC 1","facilitatorName":"WAANIA","appointmentBegin":"2018-05-07 18:30:00.000","appointmentEnd":"2018-05-07 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-133772516,"term":"18S","studentId":804961944,"studentName":"HANDS, JAYLEN JOSEPH","sessionName":"ANTHRO  1 LEC 1","facilitatorName":"WAANIA","appointmentBegin":"2018-05-14 18:30:00.000","appointmentEnd":"2018-05-14 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-133772517,"term":"18S","studentId":804961944,"studentName":"HANDS, JAYLEN JOSEPH","sessionName":"ANTHRO  1 LEC 1","facilitatorName":"WAANIA","appointmentBegin":"2018-05-21 18:30:00.000","appointmentEnd":"2018-05-21 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-133772535,"term":"18S","studentId":804961944,"studentName":"HANDS, JAYLEN JOSEPH","sessionName":"ANTHRO  1 LEC 1","facilitatorName":"WAANIA","appointmentBegin":"2018-06-04 18:30:00.000","appointmentEnd":"2018-06-04 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":921429047,"term":"18S","studentId":804961944,"studentName":"HANDS, JAYLEN JOSEPH","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-05-02 18:30:00.000","appointmentEnd":"2018-05-02 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":921429048,"term":"18S","studentId":804961944,"studentName":"HANDS, JAYLEN JOSEPH","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-05-09 18:30:00.000","appointmentEnd":"2018-05-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":921429029,"term":"18S","studentId":804961944,"studentName":"HANDS, JAYLEN JOSEPH","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-04-18 18:30:00.000","appointmentEnd":"2018-04-18 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":921429038,"term":"18S","studentId":804961944,"studentName":"HANDS, JAYLEN JOSEPH","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-04-25 18:30:00.000","appointmentEnd":"2018-04-25 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":921429084,"term":"18S","studentId":804961944,"studentName":"HANDS, JAYLEN JOSEPH","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-04-11 18:30:00.000","appointmentEnd":"2018-04-11 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-2021123274,"term":"18S","studentId":804974159,"studentName":"SANCHEZ, CAMRYN A","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-04-09 17:30:00.000","appointmentEnd":"2018-04-09 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-2021123249,"term":"18S","studentId":804974159,"studentName":"SANCHEZ, CAMRYN A","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-04-16 17:30:00.000","appointmentEnd":"2018-04-16 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-2021123264,"term":"18S","studentId":804974159,"studentName":"SANCHEZ, CAMRYN A","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-04-23 17:30:00.000","appointmentEnd":"2018-04-23 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-2021123239,"term":"18S","studentId":804974159,"studentName":"SANCHEZ, CAMRYN A","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-04-30 17:30:00.000","appointmentEnd":"2018-04-30 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-2021123246,"term":"18S","studentId":804974159,"studentName":"SANCHEZ, CAMRYN A","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-05-07 17:30:00.000","appointmentEnd":"2018-05-07 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-2021123221,"term":"18S","studentId":804974159,"studentName":"SANCHEZ, CAMRYN A","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-05-14 17:30:00.000","appointmentEnd":"2018-05-14 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-2021123220,"term":"18S","studentId":804974159,"studentName":"SANCHEZ, CAMRYN A","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-05-21 17:30:00.000","appointmentEnd":"2018-05-21 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-2021123202,"term":"18S","studentId":804974159,"studentName":"SANCHEZ, CAMRYN A","sessionName":"PHILOS  2 LEC 1","facilitatorName":"PATRICK","appointmentBegin":"2018-06-04 17:30:00.000","appointmentEnd":"2018-06-04 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":760150937,"term":"18S","studentId":804992667,"studentName":"HORVAT, CHANTEL-ANAIS","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-04-10 18:30:00.000","appointmentEnd":"2018-04-10 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":760150993,"term":"18S","studentId":804992667,"studentName":"HORVAT, CHANTEL-ANAIS","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-06-05 18:30:00.000","appointmentEnd":"2018-06-05 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":760150984,"term":"18S","studentId":804992667,"studentName":"HORVAT, CHANTEL-ANAIS","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-29 18:30:00.000","appointmentEnd":"2018-05-29 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":760150991,"term":"18S","studentId":804992667,"studentName":"HORVAT, CHANTEL-ANAIS","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-22 18:30:00.000","appointmentEnd":"2018-05-22 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":760150982,"term":"18S","studentId":804992667,"studentName":"HORVAT, CHANTEL-ANAIS","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-15 18:30:00.000","appointmentEnd":"2018-05-15 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":760151037,"term":"18S","studentId":804992667,"studentName":"HORVAT, CHANTEL-ANAIS","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-08 18:30:00.000","appointmentEnd":"2018-05-08 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":760151028,"term":"18S","studentId":804992667,"studentName":"HORVAT, CHANTEL-ANAIS","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-05-01 18:30:00.000","appointmentEnd":"2018-05-01 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":760151019,"term":"18S","studentId":804992667,"studentName":"HORVAT, CHANTEL-ANAIS","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-04-24 18:30:00.000","appointmentEnd":"2018-04-24 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":760151010,"term":"18S","studentId":804992667,"studentName":"HORVAT, CHANTEL-ANAIS","sessionName":"COMM    10 LEC 1","facilitatorName":"ANDY Z.","appointmentBegin":"2018-04-17 18:30:00.000","appointmentEnd":"2018-04-17 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1628797404,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LANEY","appointmentBegin":"2018-04-09 19:30:00.000","appointmentEnd":"2018-04-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1628797349,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LANEY","appointmentBegin":"2018-04-16 19:30:00.000","appointmentEnd":"2018-04-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1628797354,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LANEY","appointmentBegin":"2018-04-23 19:30:00.000","appointmentEnd":"2018-04-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1628797363,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LANEY","appointmentBegin":"2018-04-30 19:30:00.000","appointmentEnd":"2018-04-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1628797368,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LANEY","appointmentBegin":"2018-05-07 19:30:00.000","appointmentEnd":"2018-05-07 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1628797313,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LANEY","appointmentBegin":"2018-05-14 19:30:00.000","appointmentEnd":"2018-05-14 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1628797318,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LANEY","appointmentBegin":"2018-05-21 19:30:00.000","appointmentEnd":"2018-05-21 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1628797332,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"ENGCOMP 2 OR 3","facilitatorName":"LANEY","appointmentBegin":"2018-06-04 19:30:00.000","appointmentEnd":"2018-06-04 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1193326603,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"MSC HST 8 LEC 1","facilitatorName":"SONYA","appointmentBegin":"2018-04-11 19:30:00.000","appointmentEnd":"2018-04-11 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1193326706,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"MSC HST 8 LEC 1","facilitatorName":"SONYA","appointmentBegin":"2018-04-18 19:30:00.000","appointmentEnd":"2018-04-18 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1193326713,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"MSC HST 8 LEC 1","facilitatorName":"SONYA","appointmentBegin":"2018-04-25 19:30:00.000","appointmentEnd":"2018-04-25 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1193326688,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"MSC HST 8 LEC 1","facilitatorName":"SONYA","appointmentBegin":"2018-05-02 19:30:00.000","appointmentEnd":"2018-05-02 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1193326703,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"MSC HST 8 LEC 1","facilitatorName":"SONYA","appointmentBegin":"2018-05-09 19:30:00.000","appointmentEnd":"2018-05-09 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1193326678,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"MSC HST 8 LEC 1","facilitatorName":"SONYA","appointmentBegin":"2018-05-16 19:30:00.000","appointmentEnd":"2018-05-16 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1193326685,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"MSC HST 8 LEC 1","facilitatorName":"SONYA","appointmentBegin":"2018-05-23 19:30:00.000","appointmentEnd":"2018-05-23 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1193326660,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"MSC HST 8 LEC 1","facilitatorName":"SONYA","appointmentBegin":"2018-05-30 19:30:00.000","appointmentEnd":"2018-05-30 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1193326659,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"MSC HST 8 LEC 1","facilitatorName":"SONYA","appointmentBegin":"2018-06-06 19:30:00.000","appointmentEnd":"2018-06-06 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1152729093,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"LIFESCI 7A LEC 2","facilitatorName":"SHAUNA","appointmentBegin":"2018-04-09 20:30:00.000","appointmentEnd":"2018-04-09 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1152729212,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"LIFESCI 7A LEC 2","facilitatorName":"SHAUNA","appointmentBegin":"2018-04-16 20:30:00.000","appointmentEnd":"2018-04-16 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1152729203,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"LIFESCI 7A LEC 2","facilitatorName":"SHAUNA","appointmentBegin":"2018-04-23 20:30:00.000","appointmentEnd":"2018-04-23 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1152729194,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"LIFESCI 7A LEC 2","facilitatorName":"SHAUNA","appointmentBegin":"2018-04-30 20:30:00.000","appointmentEnd":"2018-04-30 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1152729185,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"LIFESCI 7A LEC 2","facilitatorName":"SHAUNA","appointmentBegin":"2018-05-07 20:30:00.000","appointmentEnd":"2018-05-07 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1152729176,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"LIFESCI 7A LEC 2","facilitatorName":"SHAUNA","appointmentBegin":"2018-05-14 20:30:00.000","appointmentEnd":"2018-05-14 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1152729183,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"LIFESCI 7A LEC 2","facilitatorName":"SHAUNA","appointmentBegin":"2018-05-21 20:30:00.000","appointmentEnd":"2018-05-21 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1152729165,"term":"18S","studentId":904549760,"studentName":"BENT, JAHMEA VAHNAI","sessionName":"LIFESCI 7A LEC 2","facilitatorName":"SHAUNA","appointmentBegin":"2018-06-04 20:30:00.000","appointmentEnd":"2018-06-04 21:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1907484579,"term":"18S","studentId":904901327,"studentName":"DEROOS, MATTHEW RYAN","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-06-06 17:30:00.000","appointmentEnd":"2018-06-06 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1907484582,"term":"18S","studentId":904901327,"studentName":"DEROOS, MATTHEW RYAN","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-05-30 17:30:00.000","appointmentEnd":"2018-05-30 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1907484605,"term":"18S","studentId":904901327,"studentName":"DEROOS, MATTHEW RYAN","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-05-23 17:30:00.000","appointmentEnd":"2018-05-23 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1907484600,"term":"18S","studentId":904901327,"studentName":"DEROOS, MATTHEW RYAN","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-05-16 17:30:00.000","appointmentEnd":"2018-05-16 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1907484559,"term":"18S","studentId":904901327,"studentName":"DEROOS, MATTHEW RYAN","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-05-09 17:30:00.000","appointmentEnd":"2018-05-09 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1907484564,"term":"18S","studentId":904901327,"studentName":"DEROOS, MATTHEW RYAN","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-04-18 17:30:00.000","appointmentEnd":"2018-04-18 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1907484546,"term":"18S","studentId":904901327,"studentName":"DEROOS, MATTHEW RYAN","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-05-02 17:30:00.000","appointmentEnd":"2018-05-02 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1907484569,"term":"18S","studentId":904901327,"studentName":"DEROOS, MATTHEW RYAN","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-04-25 17:30:00.000","appointmentEnd":"2018-04-25 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":-1907484651,"term":"18S","studentId":904901327,"studentName":"DEROOS, MATTHEW RYAN","sessionName":"MATH    31B LEC 2","facilitatorName":"SAM N.","appointmentBegin":"2018-04-11 17:30:00.000","appointmentEnd":"2018-04-11 18:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1650009738,"term":"18S","studentId":904903883,"studentName":"PARKS, ADAM ARON","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-06-05 19:30:00.000","appointmentEnd":"2018-06-05 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1650009747,"term":"18S","studentId":904903883,"studentName":"PARKS, ADAM ARON","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-29 19:30:00.000","appointmentEnd":"2018-05-29 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1650009748,"term":"18S","studentId":904903883,"studentName":"PARKS, ADAM ARON","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-22 19:30:00.000","appointmentEnd":"2018-05-22 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1650009757,"term":"18S","studentId":904903883,"studentName":"PARKS, ADAM ARON","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-15 19:30:00.000","appointmentEnd":"2018-05-15 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1650009794,"term":"18S","studentId":904903883,"studentName":"PARKS, ADAM ARON","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-04-10 19:30:00.000","appointmentEnd":"2018-04-10 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1650009766,"term":"18S","studentId":904903883,"studentName":"PARKS, ADAM ARON","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-08 19:30:00.000","appointmentEnd":"2018-05-08 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1650009775,"term":"18S","studentId":904903883,"studentName":"PARKS, ADAM ARON","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-05-01 19:30:00.000","appointmentEnd":"2018-05-01 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1650009776,"term":"18S","studentId":904903883,"studentName":"PARKS, ADAM ARON","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-04-24 19:30:00.000","appointmentEnd":"2018-04-24 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1650009785,"term":"18S","studentId":904903883,"studentName":"PARKS, ADAM ARON","sessionName":"STATS   10 LEC 3","facilitatorName":"ANNA S.","appointmentBegin":"2018-04-17 19:30:00.000","appointmentEnd":"2018-04-17 20:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1475261495,"term":"18S","studentId":905000910,"studentName":"MILLER, LAURYN MICHELLE","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-04-25 18:30:00.000","appointmentEnd":"2018-04-25 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1475261486,"term":"18S","studentId":905000910,"studentName":"MILLER, LAURYN MICHELLE","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-05-02 18:30:00.000","appointmentEnd":"2018-05-02 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1475261500,"term":"18S","studentId":905000910,"studentName":"MILLER, LAURYN MICHELLE","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-04-18 18:30:00.000","appointmentEnd":"2018-04-18 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1475261509,"term":"18S","studentId":905000910,"studentName":"MILLER, LAURYN MICHELLE","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-04-11 18:30:00.000","appointmentEnd":"2018-04-11 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1475261459,"term":"18S","studentId":905000910,"studentName":"MILLER, LAURYN MICHELLE","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-05-23 18:30:00.000","appointmentEnd":"2018-05-23 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1475261464,"term":"18S","studentId":905000910,"studentName":"MILLER, LAURYN MICHELLE","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-05-16 18:30:00.000","appointmentEnd":"2018-05-16 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1475261473,"term":"18S","studentId":905000910,"studentName":"MILLER, LAURYN MICHELLE","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-05-09 18:30:00.000","appointmentEnd":"2018-05-09 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1475261450,"term":"18S","studentId":905000910,"studentName":"MILLER, LAURYN MICHELLE","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-05-30 18:30:00.000","appointmentEnd":"2018-05-30 19:30:00.000","import_date":"20180403-1104"},
    {"SessionKey":1475261453,"term":"18S","studentId":905000910,"studentName":"MILLER, LAURYN MICHELLE","sessionName":"SOCIOL  20 LEC 1","facilitatorName":"TIERRA","appointmentBegin":"2018-06-06 18:30:00.000","appointmentEnd":"2018-06-06 19:30:00.000","import_date":"20180403-1104"}];
}