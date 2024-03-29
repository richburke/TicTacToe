
var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');

app.listen(8001);

function handler (req, res) {
  fs.readFile(__dirname + '/socket.html',
    function (err, data) {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading index.html');
      }

      res.writeHead(200);
      res.end(data);
    });
}

io.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.emit('message', {'message': 'Oderdonk' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});
