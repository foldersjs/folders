/*
 * (c) Folders.io - All rights reserved.
 * Software intended for internal use only.
 * Test file for basic services and connectivity to 
 * folders.io
 *
 */

/*
 * Test to check if route to remote server 
 * has been opened successfully
 * and channels have been initialized or not   
 */
 
var Fio = require('../api');
var route = require('../route');
var fio = new Fio(null,null,route)

/*
 * Global to track is route has 
 * already been opened or not 
 */
 
isRouteCreated = false
gChannel=null

function listen(cb){
	
	if (!isRouteCreated){
		
		fio.watch().then(function(channel){
			
			console.log("folders.io channels are active ")
			isRouteCreated = true
			console.log(channel.session.shareId)
			gChannel = channel
			if (cb  )
			cb(gChannel,fio)
			
		})
	}
	else{
		if (cb)
		cb(gChannel,fio)
	}
	
}

module.exports = listen






