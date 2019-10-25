'use strict';

const axios = require('axios');


function captureWeb(){
    const screenshotlayer_API = 'd0ce67ba029f46ad2131453ca77e4345';
    const screenshotlayer_URL = 'http://api.screenshotlayer.com/api/capture';

    const promise = axios.get(screenshotlayer_URL, {
        params: {
            access_key: screenshotlayer_API,
            url: 'https://supportit.syncromsp.com/tickets/dashboard_public/e97cda19-ea54-4680-8f0a-02ef67be300d',
            viewport: '1440x900',
            fullpage: 1,
            format: 'PNG',
            delay: 2
        }
    });
  return promise;
}

module.exports = { captureWeb };
