var logger = {}
logger.log = function (...args){
    console.log(args.join(' '))
}
module.exports = logger