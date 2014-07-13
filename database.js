
module.exports = function (mongoose, config) {
  mongoose.set('debug', config.mongo.debug);
  var connect = function () {
    var opts = { server: { socketOptions: { keepAlive: 1 } } };
    mongoose.connect('mongodb://' + config.mongo.host + '/' + config.mongo.db, opts);
  };
  connect();

  mongoose.connection.on('disconnected', function () {
    connect();
  });
  mongoose.connection.on('error', function (err) {
    console.error(err);
  });
  mongoose.connection.once('open', function () {
    console.log('Connected to MongoDB', config.mongo);
  });
};
