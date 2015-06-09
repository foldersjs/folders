/*
 *
 * Test api for event streams
 * and channels
 *
 */
 
var Fio = require('../api');
var route = require('./route');
var fio = new Fio(null,null,route);

/*
 *
 * Global to track is route has 
 * already been opened or not 
 *
 */
 
isRouteCreated = false;
gChannel=null;

function listen(cb){

	if (!isRouteCreated){

		fio.watch().then(function(channel){
			console.log("channels are active ")
			isRouteCreated = true;
			console.log(channel.session.shareId);
			gChannel = channel;
			if (cb  ) {
				cb(gChannel,fio);
			}
		});

	}
	else {
		if (cb) {
			cb(gChannel,fio);
		}
	}

}

module.exports = listen;

