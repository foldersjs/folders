/*
 *
 * Convert a REST request to an event stream (incomplete).
 *
 */


export default function(conn,requestId,shareid) {
  const uri = conn.location.pathname;

  if(uri.substr(0,5) === "/dir/") {
    let shareId = uri.substr(5);
    let path = "/";
    const idxPath = shareId.indexOf("/");
    if(idxPath != -1) {
      path = shareId.substr(idxPath);
      shareId = shareId.substr(0,idxPath);
    }
    if ((shareid != 'testshareid'  && shareid ) || shareId=='' ){
      
      shareId = shareid;
      
    }
    const DirectoryListRequest = {
      "type": "DirectoryListRequest",
      "data": {
        "shareId": shareId,
        "streamId": requestId,
        "serverHostname": "testHostname",
        "path": path
      }
    };
    console.log("Requested URI", uri, DirectoryListRequest);
    return DirectoryListRequest;
  }
  
  
  if (uri.substr(0,6) == '/file/'){
    
    let shareId = shareid;
    
    const FileRequest ={
      "type" : "FileRequest",
      "data" :{
       "shareId" :shareId,
       "streamId":requestId,
       "fileId":'testfileid',
       "browserFileId":"testid", 
       "serverHostname" :"testserverhostname",
       "clientHostname":"testclienthostname",
       "ip":"testip", 
       "offset":"testoffset",
       "length":"testlength",
       "offer":"testoffer", 
      }
      
    }
    
    console.log("Requested URI", uri, FileRequest);
    return FileRequest;
    
  }
 

// Deprecated methods.
  if(uri === "/set_files") {
    const SetFilesRequest = {
      "type": "SetFilesRequest",
      "streamId" : requestId,
      "data": { 
        "shareId":"",
        "allowOfflineStorage":"true",
        "allowUploads":"false",
        "parent":"0",
        "data":[]
      } 
    };
    console.log("Requested URI", uri, SetFilesRequest);
    return SetFilesRequest;
  }

  if (uri === '/get_share'){
    const x = {
      "shareId":"testshareid",
      "offline":"0",
      "parent":"0",
      "gw":"0",
      "_":"1429695010939"
    }
    console.log("Requested URI", uri,x);
    return x;
  }

  console.log("Requested URI", uri);
};
