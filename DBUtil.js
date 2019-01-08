var sql = require('mssql'),
  connPoolPromise = null;

const config = {
    user: 'sa_jeff',
    password: 'eraser$06',
    server: '164.67.162.40', // You can use 'localhost\\instance' to connect to named instance
    database: 'BruinTrax_SQL',
    pool: { max: 20 }
};

function getConnPoolPromise() {
  if (connPoolPromise) return connPoolPromise;

  connPoolPromise = new Promise(function (resolve, reject) {
    var conn = new sql.ConnectionPool( config );

    conn.on('close', function () {
      connPoolPromise = null;
    });

    conn.connect().then(function (connPool) {
      return resolve(connPool);
    }).catch(function (err) {
      connPoolPromise = null;
      return reject(err);
    });
  });

  return connPoolPromise;
}

// Fetch data example
exports.query = function(sqlQuery) {

    return getConnPoolPromise().then(function (connPool) {

        var sqlRequest = new sql.Request(connPool);
        return sqlRequest.query(sqlQuery);

    });
}