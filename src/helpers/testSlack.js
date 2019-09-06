const { WebClient } = require('@slack/web-api');
const axios = require('axios');

// Read a token from the environment variables
const token = process.env.SLACK_TOKEN;

// Initialize
const web = new WebClient(token);

// This argument can be a channel ID, a DM ID, a MPDM ID, or a group ID
const conversationId = 'CBAM8P0EQ';



const result = web.chat.postMessage({
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
    })