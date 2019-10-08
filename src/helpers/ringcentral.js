var RC = require('ringcentral')
var fs = require('fs')
///var accessToken =  'wzbcGXINJ33755:^%wtaMY*'
const { WebClient } = require('@slack/web-api');
const axios = require('axios');
var spsave = require("spsave").spsave;
var redisclient = require('redis').createClient(process.env.REDIS_URL);
///var jsftp = require('jsftp');

//connect to redis client
redisclient.on('connect', function() {
  console.log('Redis client connected');
});
redisclient.on('error', function (err) {
  console.log('Something went wrong ' + err);
});

// Read a token from the environment variables
const token = process.env.SLACK_TOKEN;

/* //Build FTP Connector
const Ftp = new jsftp({
  host: "files.techinaflash.net",
  port: 21, // defaults to 21
  user: "slackbot@files.techinaflash.net", // defaults to "anonymous"
  pass: process.env.SYNCRO_CALLERID_TOKEN // defaults to "@anonymous"
}); */

// Initialize
const web = new WebClient(token);

// This argument can be a channel ID, a DM ID, a MPDM ID, or a group ID
const conversationId = 'CBAM8P0EQ';



var async = require("async");
///var filename = "test";

//Setup RingCentral SDK with logins
var rcsdk = null
if (process.env.MODE == "production"){
  rcsdk = new RC({
    server:RC.server.production,
    appKey: process.env.CLIENT_ID_PROD,
    appSecret:process.env.CLIENT_SECRET_PROD
  })
}else{
  rcsdk = new RC({
      server:RC.server.sandbox,
      appKey: process.env.CLIENT_ID_SB,
      appSecret:process.env.CLIENT_SECRET_SB
    })
}
console.log("Server is: " + rcsdk.server)

var platform = rcsdk.platform()
var subscription = rcsdk.createSubscription()
subscription.on(subscription.events.notification, presenceEvent)

var usersList = []

login()

function login(){
  var un = ""
  var pwd = ""
  if (process.env.RC_MODE == "production"){
    un= process.env.USERNAME_PROD,
    pwd= process.env.PASSWORD_PROD
  }else{
    un= process.env.USERNAME_SB,
    pwd= process.env.PASSWORD_SB
  }
  platform.login({
    username:un,
    password:pwd
  })
  .then(function(resp){
    checkExistingSubscription()
  })
  .catch(function(e){
    console.log(e)
    throw e
  })
}

function checkExistingSubscription(){
  redisclient.get('rc_subscription_id', function (err, id) {
    if (err) {
      subscribeForNotification()
    }else{
      removeRegisteredSubscription(id)
    }
    console.log('GET result ->' + id);
  });
  
}

function removeRegisteredSubscription(id) {
  platform.delete('/subscription/' + id)
    .then(function (response) {
      console.log("deleted: " + id)
      subscribeForNotification()
    })
    .catch(function(e) {
      console.log('Cannot delete subscription id' + id)
      console.error(e.toString());
      subscribeForNotification()
    });
}

function subscribeForNotification(){
  var eventFilter = ['/restapi/v1.0/account/~/presence?detailedTelephonyState=true']
  subscription.setEventFilters(eventFilter)
   .register()
   .then(function(resp){
     console.log('Ready for getting account presense events')
     var json = resp.json();
     redisclient.set('rc_subscription_id', json.id, function(err) {
      if(err)
        console.log(err);
      else
        console.log("SubscriptionId " + json.id + " is stored.");
      }); 
   })
   .catch(function(e){
     throw e
   })
}

function presenceEvent(msg){
  //console.log('Message Body is...')
  console.log(msg.body)
  //console.log('Caller ID is...')
  //console.log(msg.body.activeCalls[0].from)
  var user = {}
  user['extensionId'] = msg.body.extensionId
  user['telephonyStatus'] = msg.body.telephonyStatus
  user['startTime'] = ""
  user['callerid'] = msg.body.activeCalls[0].from
  user['direction'] =msg.body.activeCalls[0].direction
  checkTelephonyStatusChange(user)
}

function checkTelephonyStatusChange(user){
  var newUser = true
  for (var i=0; i<usersList.length; i++){
    if (usersList[i].extensionId == user.extensionId){
      console.log("OLD -> NEW: " + usersList[i].telephonyStatus + " -> " + user.telephonyStatus)
      newUser = false
      if (usersList[i].telephonyStatus == "NoCall" && user.telephonyStatus == "Ringing"){
        usersList[i].telephonyStatus = user.telephonyStatus
        usersList[i].startTime = createStartTime()
        console.log("ExtensionId " + usersList[i].extensionId + " has an incoming call")
        axios.get('https://supportit.syncromsp.com/api/callerid/', {
            params: {
              did:  usersList[i].callerid,
              token: process.env.SYNCRO_CALLERID_TOKEN
            }
          })
          .then(function (response) {
            
          })
          .catch(function (error) {
            console.log(error);
          }); 
        break
      }
      if (usersList[i].telephonyStatus == "Ringing" && user.telephonyStatus == "CallConnected"){
        usersList[i].telephonyStatus = user.telephonyStatus
        console.log("ExtensionId " + usersList[i].extensionId + " has a accepted a call")
        break
      }
      if (usersList[i].telephonyStatus == "Ringing" && user.telephonyStatus == "NoCall"){
        usersList[i].telephonyStatus = user.telephonyStatus
        console.log("ExtensionId " + usersList[i].extensionId + " has a missed call")
        break
      }
      if (usersList[i].telephonyStatus == "CallConnected" && user.telephonyStatus == "NoCall"){
        usersList[i].telephonyStatus = user.telephonyStatus
        var date = new Date()
        var stopTime = date.toISOString()
        stopTime = stopTime.replace('/', ':')
        console.log("ExtensionId " + usersList[i].extensionId + " has a terminated call")
        // wait for 20 secs then check for call recordings
        setTimeout(function(){
          readExtensionCallLogs(usersList[i].extensionId, usersList[i].startTime, stopTime)
        }, 25000)
        break
      }
    }
  }
  if (newUser){
    console.log("NEW USER: " + " -> " + user.telephonyStatus)
    if (user.telephonyStatus == "Ringing"){
      user.startTime = createStartTime()
      console.log("ExtensionId " + user.extensionId + " has an incoming call.")

      //Pops call alert up in Syncro
      axios.get('https://supportit.syncromsp.com/api/callerid/', {
            params: {
              did:  user.callerid,
              token: process.env.SYNCRO_CALLERID_TOKEN
            }
          })
          .then(function (response) {
            
          })
          .catch(function (error) {
            console.log(error);
          }); 

    }
    usersList.push(user)
  }
}

function createStartTime(){
  var date = new Date()
  var time = date.getTime()
  // make 10 secs to offset some delay in response
  var lessXXSeconds = time - 10000
  var from = new Date(lessXXSeconds)
  var dateFrom = from.toISOString()
  return dateFrom.replace('/', ':')
}

function readExtensionCallLogs(extensionId, startTime, stopTime){
  var endpoint = '/account/~/extension/'+ extensionId +'/call-log'
  var params = {}
  params['dateFrom'] = startTime
  params['dateTo'] = stopTime
  params['recordingType'] = 'All'
  

  platform.get(endpoint, params)
  .then(function(resp){
    async.each(resp.json().records,
      function(record, callback){
        
        console.log("THIS CALL HAS A RECORDING: " + record.recording.contentUri)
        console.log("From: " + record.from.phoneNumber)
        saveAudioFile(record)
      },
      function(err){
        console.log(err)
        console.log("No call with call recording within this period of time.")
      }
    );
  })
  .catch(function(e){
    var err = e.toString();
    console.log(err)
  })
}


function saveAudioFile(record){
	
  platform.get(record.recording.contentUri)
  .then(function(res) {
    return res.response().buffer();
  })
  .then(function(buffer) {
    //Get Name associated with phone number from Syncro
    axios.get('https://supportit.syncromsp.com/api/v1/customers', {
      params: {
        api_key:  process.env.SYNCRO_API_KEY,
        query: record.from.phoneNumber.slice(-10)
      }
    })
    .then(function (response) {
      //Build mp3 file name as BusinessFullName Direction TimeinZulu
      const recFilename = (response.data.customers[0].business_and_full_name + ' ' + record.direction + ' ' + record.startTime.replace(/[/\\?%*:|"<>]/g, '-') + '.mp3')

          //Setup variables for Sharepoint Save*********************************
          var creds = {
            username: process.env.SP_USERNAME,
            password: process.env.SP_PASSWORD
          };
          var fileOpts = {
            folder: 'Shared Documents/General/Call Log/Customers/' + response.data.customers[0].business_and_full_name,
            fileName: recFilename,
            fileContent: buffer
          };
      
          var coreOpts = {
            siteUrl: process.env.SP_DOMAIN
          };
          //*****************************************************************

      //Save to Sharepoint
      spsave(coreOpts, creds, fileOpts)
      .then(function(spsaveData){
          console.log('File uploaded!');
          console.log(spsaveData);
      })
      .catch(function(err){
          console.log('Error occurred');
      });

   /*    //Save to FTP
      Ftp.put(buffer, recFilename, err => {
        if (!err) {
          console.log("File transferred successfully!");
        }
      }); */


      
      (async () => {
        // Just use the `file` argument as the documentation suggests
        // See: https://api.slack.com/methods/files.upload
        /* const result = await web.chat.postMessage({
          text: 'text',
          channel: conversationId,
          blocks: [
              {
                  "type": "section",
                  "text": {
                      "type": "mrkdwn",
                      "text": 'You have a new call recording:\n*<https://techinaflash.sharepoint.com/sites/TechinaFlash/Shared%20Documents/General/Call%20Log/Customers/' + response.data.customers[0].business_and_full_name. + '|' + response.data.customers[0].business_and_full_name +' - Call recording>*'
                  }
              },
              {
                  "type": "section",
                  "text": {
                      "type": "mrkdwn",
                      "text": '*Direction:*\n' + record.direction + '\n*When:*\n' + record.startTime + '\n*Comments:*\nCall recording comments'
                  },
                  "accessory": {
                      "type": "image",
                      "image_url": "https://api.slack.com/img/blocks/bkb_template_images/approvalsNewDevice.png",
                      "alt_text": "computer thumbnail"
                  }
              },
              {
                  "type": "actions",
                  "elements": [
                      {
                          "type": "button",
                          "text": {
                              "type": "plain_text",
                              "emoji": true,
                              "text": "Upload"
                          },
                          "style": "primary",
                          "value": "click_me_123"
                      },
                      {
                          "type": "button",
                          "text": {
                              "type": "plain_text",
                              "emoji": true,
                              "text": "Cancel"
                          },
                          "style": "danger",
                          "value": "click_me_123"
                      }
                  ]
              }
          ]
        }) */

        //BEGIN - Upload file to Slack*************************************************************************
        const result = await web.files.upload({
        filename: (recFilename), 
        // You can use a ReadableStream or a Buffer for the file option
        // This file is located in the current directory (`process.pwd()`), so the relative path resolves
        file: buffer,
        filetyp: 'mp3',
        channels: conversationId,
        initial_comment: ('New Ring Central recording - ' + response.data.customers[0].business_and_full_name)
        })
        console.log('Result from Slack file upload: ', result);
        //END - Upload file to Slack****************************************************************************

        /* const updateResult = await web.chat.update({
          text: 'text',
          ts: result.ts,
          channel: conversationId,
          blocks: [
              {
                  "type": "section",
                  "text": {
                      "type": "mrkdwn",
                      "text": 'You have a new call recording:\n*<https://techinaflash.sharepoint.com/sites/TechinaFlash/Shared%20Documents/General/Call%20Log/Customers/' + response.data.customers[0].business_and_full_name + '|' + response.data.customers[0].business_and_full_name +' - Call recording>*'
                  }
              },
              {
                  "type": "section",
                  "text": {
                      "type": "mrkdwn",
                      "text": '*Direction:*\n' + record.direction + '\n*When:*\n' + record.startTime + '\n*Comments:*\nCall recording comments'
                  },
                  "accessory": {
                      "type": "image",
                      "image_url": "https://api.slack.com/img/blocks/bkb_template_images/approvalsNewDevice.png",
                      "alt_text": "computer thumbnail"
                  }
              },
              {
                  "type": "actions",
                  "elements": [
                      {
                          "type": "button",
                          "text": {
                              "type": "plain_text",
                              "emoji": true,
                              "text": "Upload"
                          },
                          "style": "primary",
                          "value": "click_me_123"
                      },
                      {
                          "type": "button",
                          "text": {
                              "type": "plain_text",
                              "emoji": true,
                              "text": "Cancel"
                          },
                          "style": "danger",
                          "value": "click_me_123"
                      }
                  ]
              }
          ]
        }) */
     

        // `res` contains information about the uploaded file
        //console.log('Result from Slack message: ', updateResult);
      })();
    })
    .catch(function (error) {
      console.log(error);
    });  

    //var callerid = (response.data.customers[0].business_and_full_name + ' ' + record.direction + ' ' + record.startTime.replace(/[/\\?%*:|"<>]/g, '-') + '.mp3');
    //var destFile = './recordings/' + record.recording.id + '.mp3'	
    //fs.writeFileSync(destFile, buffer);
    //console.log("CALL RECORDING SAVED AT: " + destFile)
    //const filename = record.recording.id + '.mp3';

    
    })
  .catch(function(e){
    console.log(e)
  })
}