log = console.log

// Converts a unix timestamp to a normal date
const unixConvert = (time) => {
    // Converts time to an integer if it's a string
    if (typeof(time) === "string") time = Number(time)

    const miliseconds = time * 1000
    const date = new Date(miliseconds).toLocaleString()
    log(date)
}

// Returns the current unix time
const getUnix = () => {
    const time = Math.round((new Date()).getTime() / 1000);
    return time
}

module.exports.getUnix = getUnix