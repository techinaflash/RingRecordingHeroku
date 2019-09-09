'use strict';

const axios = require('axios');
const qs = require('qs');

const apiUrl = 'https://slack.com/api';

// This argument can be a channel ID, a DM ID, a MPDM ID, or a group ID
const conversationId = 'CBAM8P0EQ';

/*
 *  Get user info from users.info method
 */

//BEGIN OPEN DIALOG
// open the dialog by calling dialogs.open method and sending the payload
const openDialog = (payload, real_name) => {

    //console.log(payload.message.files)

    var publicFileResponse = makeFilePublic (payload.message.files[0].id)

    console.log(publicFileResponse)
    

    const dialogData = {
      token: process.env.SLACK_ACCESS_TOKEN,
      state: payload.message.files[0].permalink_public,
      trigger_id: payload.trigger_id,
      dialog: JSON.stringify({
        title: 'Upload file to Syncro',
        callback_id: 'upload_to_syncro',
        submit_label: 'Upload',
        elements: [
           {
             label: 'Ticket Private Comment',
             type: 'textarea',
             name: 'comment',
             value: payload.message.text
           },
           {
             label: 'Attach to Ticket #',
             type: 'text',
             name: 'ticket',
             value: ``,
             placeholder: 'Enter a ticket number...'

           },
           
        ]
      })
    };
  
    // open the dialog by calling dialogs.open method and sending the payload
    const promise = axios.post(`${apiUrl}/dialog.open`, qs.stringify(dialogData));
    return promise;
  };
  //END OPEN DIALOG

  const postMessage = (payload) => {
    const messageData = {
      //filename: (response.data.customers[0].business_and_full_name + ' ' + record.direction + ' ' + record.startTime.replace(/[/\\?%*:|"<>]/g, '-') + '.mp3'), 
      // You can use a ReadableStream or a Buffer for the file option
      // This file is located in the current directory (`process.pwd()`), so the relative path resolves
      text: 'text',
      channel: conversationId,
      blocks: [
          {
              "type": "section",
              "text": {
                  "type": "mrkdwn",
                  "text": "You have a new call recording:\n*<google.com|Fred Enriquez - Time Off request>*"
              }
          },
          {
              "type": "section",
              "text": {
                  "type": "mrkdwn",
                  "text": "*Type:*\nPaid time off\n*When:*\nAug 10-Aug 13\n*Hours:* 16.0 (2 days)\n*Remaining balance:* 32.0 hours (4 days)\n*Comments:* \"Family in town, going camping!\""
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
                          "text": "Approve"
                      },
                      "style": "primary",
                      "value": "click_me_123"
                  },
                  {
                      "type": "button",
                      "text": {
                          "type": "plain_text",
                          "emoji": true,
                          "text": "Deny"
                      },
                      "style": "danger",
                      "value": "click_me_123"
                  }
              ]
          }
      ]
      };

      const promise = axios.post(`${apiUrl}/chat.postMessage`, qs.stringify(messageData));
    return promise;
  }


  //BEGIN POST EPHEMERAL
  const postEphemeral = (payload, real_name) => {

    const ephemeralData = {
      token: process.env.SLACK_ACCESS_TOKEN,
      channel: payload.channel.id,
      text: 'File uploaded to ticket ' + payload.submission.ticket,
      thread_ts: payload.state,
      user: payload.user.id,
      attachments: JSON.stringify({
        title: 'Upload file to Syncro',
        callback_id: 'upload_to_syncro',
        submit_label: 'Upload',
        elements: [
           {
             label: 'Call recording uploaded to ticket',
             type: 'text',
             name: 'ticket',
             value: payload.submission.ticket,
             placeholder: 'Enter a ticket number...'

           },
           
        ]
      })
    };
  
    // open the dialog by calling dialogs.open method and sending the payload
    const promise = axios.post(`${apiUrl}/chat.postEphemeral`, qs.stringify(ephemeralData));
    return promise;
  };
  //END POST EPHEMERAL

  function makeFilePublic(fileid) {
    const fileData = {
      token: process.env.SLACK_ACCESS_TOKEN,
      file: fileid
    }


    const promise = axios.post(`${apiUrl}/files.sharedPublicURL`, qs.stringify(fileData));
    return promise;
  }

  function makeFilePrivate(fileid) {
    const fileData = {
      token: process.env.SLACK_ACCESS_TOKEN,
      file: fileid
    }


    const promise = axios.post(`${apiUrl}/files.revokePublicURL`, qs.stringify(fileData));
    return promise;
  }
  
module.exports = { openDialog, postEphemeral, postMessage };