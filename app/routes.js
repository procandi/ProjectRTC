module.exports = function(app, streams) {

  // GET home 
  var index = function(req, res) {
    res.render('index', { 
                          title: 'Project RTC', 
                          header: 'WebRTC live streaming',
                          username: 'Username',
                          share: 'Share this link',
                          footer: 'pierre@chabardes.net',
                          id: req.params.id
                        });
  };

  // GET streams as JSON
  var displayStreams = function(req, res) {
    var streamList = streams.getStreams();
    // JSON exploit to clone streamList.public
    var data = (JSON.parse(JSON.stringify(streamList))); 

    res.status(200).json(data);
  };

  //add fs to write file.
  var fs = require('fs');

  //load post data and parse it.
  function upload(response, postData) {
    var files = JSON.parse(postData);

    // writing video file to disk
    _upload(response, files.video);
  }

  //upload and write file to server.
  function _upload(response, file) {
      var fileRootName = file.name.split('.').shift(),
          fileExtension = file.name.split('.').pop(),
          filePathBase = './uploads/',
          fileRootNameWithBase = filePathBase + fileRootName,
          filePath = fileRootNameWithBase + '.' + fileExtension,
          fileID = 2,
          fileBuffer;

      while (fs.existsSync(filePath)) {
          filePath = fileRootNameWithBase + '(' + fileID + ').' + fileExtension;
          fileID += 1;
      }

      file.contents = file.contents.split(',').pop();
      fileBuffer = new Buffer(file.contents, "base64");
      fs.writeFileSync(filePath, fileBuffer);
  }


  var url = require('url');
  app.get('/streams.json', displayStreams);
  app.get('/', index);
  app.get('/:id', index);

  //add new route to handle write file to server.
  app.post('/upload/run',function(request, response){
      //setting encoding.
      request.setEncoding('utf8');

      //reading data.
      var postData='';
      request.addListener('data', function(postDataChunk) {
          postData += postDataChunk;
      });

      //route to new function.
      request.addListener('end', function() {
          upload(response,postData);
      });
  });
}