const champselect = require('./index.js')

console.log(champselect)

champselect.on('timer', data => {
    //console.log(data)
})

champselect.on('message', data => {
    console.log(data)
})

champselect.on('error', data => {

})