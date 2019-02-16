`npm i --save lol-champselect`

Example:
```
const champselect = require('lol-champselect')

champselect.on('timer', data => {
    //console.log(data)
    //Timer is sent with the message event as well as with this separate timer event
})

champselect.on('message', data => {
    console.log(data)
})

champselect.on('error', err => {
    console.log(err)
})
```
