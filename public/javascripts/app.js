(function(){
	var app = angular.module('projectRtc', [],
		function($locationProvider){$locationProvider.html5Mode(true);}
    );
	var client = new PeerManager();
	var mediaConfig = {
        audio:true,
        video: {
			mandatory: {},
			optional: []
        }
    };

    app.factory('camera', ['$rootScope', '$window', function($rootScope, $window){
    	var camera = {};
    	camera.preview = $window.document.getElementById('localVideo');

    	camera.start = function(){
			return requestUserMedia(mediaConfig)
			.then(function(stream){			
				attachMediaStream(camera.preview, stream);
				client.setLocalStream(stream);
				camera.stream = stream;
				$rootScope.$broadcast('cameraIsOn',true);
			})
			.catch(Error('Failed to get access to local media.'));
		};
    	camera.stop = function(){
    		return new Promise(function(resolve, reject){			
				try {
					// generating random string
				    function generateRandomString() {
				        if (window.crypto) {
				            var a = window.crypto.getRandomValues(new Uint32Array(3)),
				                token = '';
				            for (var i = 0, l = a.length; i < l; i++) token += a[i].toString(36);
				            return token;
				        } else {
				            return (Math.random() * new Date().getTime()).toString(36).replace(/\./g, '');
				        }
				    }

					// XHR2/FormData
					function xhr(url, data, callback) {
						var request = new XMLHttpRequest();
						request.onreadystatechange = function() {
							if (request.readyState == 4 && request.status == 200) {
						    	callback(request.responseText);
						  	}
						};

						request.upload.onprogress = function(event) {
						};
						request.upload.onload = function() {
						};

						request.open('POST', url);
						request.send(data);
					}

				    // this function submits both audio/video or single recorded blob to nodejs server
				    function postFiles(video) {
				        // getting unique identifier for the file name
				        fileName = generateRandomString();

				        // this object is used to allow submitting multiple recorded blobs
				        var files = {};
				        files.video = {
				            name: fileName + '.' + video.blob.type.split('/')[1],
				            type: video.blob.type,
				            contents: video.dataURL
				        };

				        xhr('/upload/run', JSON.stringify(files), function(_fileName) {
				        });
				    }

				    //add code to stop recording and save as server.
					recordRTC.stopRecording(function (audioVideoWebMURL) {
			            recordRTC.getDataURL(function(dataURL) { 
			                var video = {
			                  blob: recordRTC.getBlob(),
			                  dataURL: dataURL
			                };

			                postFiles(video);
			            });
			        });

					//handle stream.
					camera.stream.stop();
					camera.preview.src = '';
					resolve();
				} catch(error) {
					reject(error);
				}
    		})
    		.then(function(result){
    			$rootScope.$broadcast('cameraIsOn',false);
    		});	
		};
		return camera;
    }]);

	app.controller('RemoteStreamsController', ['camera', '$location', '$http', function(camera, $location, $http){
		var rtc = this;
		rtc.remoteStreams = [];
		function getStreamById(id) {
		    for(var i=0; i<rtc.remoteStreams.length;i++) {
		    	if (rtc.remoteStreams[i].id === id) {return rtc.remoteStreams[i];}
		    }
		}
		rtc.loadData = function () {
			// get list of streams from the server
			$http.get('/streams.json').success(function(data){
				// filter own stream
				var streams = data.filter(function(stream) {
			      	return stream.id != client.getId();
			    });
			    // get former state
			    for(var i=0; i<streams.length;i++) {
			    	var stream = getStreamById(streams[i].id);
			    	streams[i].isPlaying = (!!stream) ? stream.isPLaying : false;
			    }
			    // save new streams
			    rtc.remoteStreams = streams;
			});
		};

		rtc.view = function(stream){
			client.peerInit(stream.id);
			stream.isPlaying = !stream.isPlaying;
		};
		rtc.call = function(stream){
			/* If json isn't loaded yet, construct a new stream 
			 * This happens when you load <serverUrl>/<socketId> : 
			 * it calls socketId immediatly.
			**/
			if(!stream.id){
				stream = {id: stream, isPlaying: false};
				rtc.remoteStreams.push(stream);
			}
			if(camera.isOn){
				client.toggleLocalStream(stream.id);
				if(stream.isPlaying){
					client.peerRenegociate(stream.id);
				} else {
					client.peerInit(stream.id);
				}
				stream.isPlaying = !stream.isPlaying;
			} else {
				camera.start()
				.then(function(result) {
					client.toggleLocalStream(stream.id);
					if(stream.isPlaying){
						client.peerRenegociate(stream.id);
					} else {
						client.peerInit(stream.id);
					}
					stream.isPlaying = !stream.isPlaying;
				})
				.catch(function(err) {
					console.log(err);
				});
			}
		};

		//initial load
		rtc.loadData();
    	if($location.url() != '/'){
      		rtc.call($location.url().slice(1));
    	};
	}]);

	app.controller('LocalStreamController',['camera', '$scope', '$window', function(camera, $scope, $window){
		var localStream = this;
		localStream.name = 'Guest';
		localStream.link = '';
		localStream.cameraIsOn = false;

		$scope.$on('cameraIsOn', function(event,data) {
    		$scope.$apply(function() {
		    	localStream.cameraIsOn = data;
		    });
		});

		localStream.toggleCam = function(){
			if(localStream.cameraIsOn){
				camera.stop()
				.then(function(result){
					client.send('leave');
	    			client.setLocalStream(null);
				})
				.catch(function(err) {
					console.log(err);
				});
			} else {
				camera.start()
				.then(function(result) {
					localStream.link = $window.location.host + '/' + client.getId();
					client.send('readyToStream', { name: localStream.name });
				})
				.catch(function(err) {
					console.log(err);
				});
			}
		};
	}]);
})();