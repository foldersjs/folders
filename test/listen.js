/*
 *
 * Test api for event streams
 * and channels
 *
 */
 
import Fio from '../src/api.js';
import route from './route.js';

const fio = new Fio(null,null,route);

/*
 *
 * Global to track is route has 
 * already been opened or not 
 *
 */
 
let isRouteCreated = false;
let gChannel=null;

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

export default listen;
