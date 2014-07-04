
var config = require('./config')
  , host = config.socket.host
  , mongoose = require('mongoose')
  , net = require('net')
  , port = config.socket.port
  , Promise = require('bluebird')
  , Schema = mongoose.Schema
  , uid = require('uid2');

require('./database')(mongoose, config);

var ClimateSchema = {
  connection: String,
  createdAt: Date,
  humidity: Number,
  temperature: Number
};
var Second = mongoose.model('Second', new Schema(ClimateSchema).index({ createdAt: 1 }, { expireAfterSeconds: 60 })) // expires after 60 seconds
  , Minute = mongoose.model('Minute', new Schema(ClimateSchema).index({ createdAt: 1 }, { expireAfterSeconds: 86400 })) // expires after 1 day
  , Hour = mongoose.model('Hour', new Schema(ClimateSchema).index({ createdAt: 1 }, { expireAfterSeconds: 604800 })) // expires after 1 week
  , Day = mongoose.model('Day', new Schema(ClimateSchema).index({ createdAt: 1 })); // never expires

var climate = {
  data: {},
  save: function (id, document, interval, offset) {
    if (offset) return setTimeout(function () {
      climate.save(id, document, interval);
    }, offset);
    if (!climate.data[id]) return;
    var data = new document(climate.data[id]);
    Promise.promisify(data.save, data)().catch(function (err) {
      console.error(err);
    });
    setTimeout(function () {
      climate.save(id, document, interval);
    }, interval);
  }
};

var time = {
  components: [
    'Date',
    'Hours',
    'Minutes',
    'Seconds',
    'Milliseconds'
  ],
  nextComponent: function (component) {
    var d = new Date()
      , i = time.components.length;
    while (i--) {
      if (component === time.components[i]) return d['set' + component](d['get' + component]() + 1) - new Date();
      d['set' + time.components[i]](0);
    }
  },
  nextDay: function () {
    return time.nextComponent('Date');
  },
  nextHour: function () {
    return time.nextComponent('Hours');
  },
  nextMinute: function () {
    return time.nextComponent('Minutes');
  }
};

var connections = [], server = net.createServer(function (socket) {
  socket.id = uid(4) + new Date().getTime();
  connections.push(socket);
  console.log('socket connection ' + socket.id + ' opened');
  socket.on('close', function () {
    console.log('socket connection ' + socket.id + ' closed');
    delete climate.data[socket.id];
  });
  socket.on('data', function (data) {
    try {
      data = JSON.parse(data);
      climate.data[socket.id].createdAt = data.createdAt ? new Date(parseInt(data.createdAt)) : new Date();
      climate.data[socket.id].humidity = data.humidity;
      climate.data[socket.id].temperature = data.temperature;
    } catch (err) {
      console.error(err);
    }
  });
  socket.setTimeout(5000, function () {
    console.log('socket connection ' + socket.id + ' will be closed due to inactivity');
    socket.destroy();
  });
  climate.data[socket.id] = {
    connection: socket.id
  };
  climate.save(socket.id, Second, 1000, 1000);
  climate.save(socket.id, Minute, 60000, time.nextMinute());
  climate.save(socket.id, Hour, 3600000, time.nextHour());
  climate.save(socket.id, Day, 86400000, time.nextDay());
});
server.listen(port, host);
console.log('Listening for connections: ', { host: host, port: port });
