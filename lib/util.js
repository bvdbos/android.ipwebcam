const Homey = require('homey');
const rp = require('request-promise-native');
const nodemailer = require('nodemailer');

exports.getHomeyIp = function () {
    return new Promise(function (resolve, reject) {
        Homey.ManagerCloud.getLocalAddress()
            .then(localAddress => {
                return resolve(localAddress)
            })
            .catch(error => {
                throw new Error(error);
            })
    })
}

exports.createSnapshot = function (address, port, username, password) {
    return new Promise(function (resolve, reject) {
        var options = {
            url: "http://"+ address +":"+ port +"/shot.jpg",
            encoding: 'binary',
            auth: {
                user: username,
                pass: password
            },
            resolveWithFullResponse: true,
            timeout: 10000
        };

        rp(options)
            .then(function (response) {
                if (response.statusCode == 200) {
                    var buf = new Buffer(response.body, 'binary');
                    return resolve(buf);
                } else {
                    return reject(response.statusCode);
                }
            })
            .catch(function (error) {
                return reject(error.statusCode);
            });
    })
}

exports.getIpwebcam = function (address, port, username, password) {
    return new Promise(function (resolve, reject) {
        var options = {
            url: "http://"+ address +":"+ port +"/sensors.json",
            auth: {
                user: username,
                pass: password
            },
            resolveWithFullResponse: true,
            timeout: 4000
        };

        rp(options)
            .then(function (response) {
                if (response.statusCode == 200) {
                    var data = JSON.parse(response.body);

                    if(data.motion_active.data[0][1][0] == 1) {
                        var motion = true;
                    } else {
                        var motion = false;
                    }

                    if(data.sound_event.data[0][1][0] == 1) {
                        var sound = true;
                    } else {
                        var sound = false;
                    }

                    var result = {
                        battery: data.battery_level.data[0][1][0],
                        motionalarm: motion,
                        soundalarm: sound,
                        lux: data.light.data[0][1][0]
                    }

                    return resolve(result);
                } else {
                    return reject(response.statusCode);
                }
            })
            .catch(function (error) {
                return reject(error.statusCode);
            });
    })
}

exports.testEmail = function (args, callback) {
    var transporter = nodemailer.createTransport({
        host: args.body.email_hostname,
        port: args.body.email_port,
        secure: args.body.email_secure,
        auth: {
            user: args.body.email_username,
            pass: args.body.email_password
        },
        tls: {rejectUnauthorized: false}
    });

    var mailOptions = {
        from: 'Homey IP Webcam App <' + args.body.email_sender + '>',
        to: args.body.email_sender,
        subject: 'Test Email Homey IP Webcam App',
        text: Homey.__('This is a test email which confirms your email settings in the Homey IP Webcam App are correct.'),
        html: Homey.__('<h1>Homey IP Webcam App</h1><p>This is a test email which confirms your email settings in the Homey IP Webcam App are correct.</p>')
    }

    transporter.sendMail(mailOptions, function(error, info) {
        if(error) {
            callback (error, false);
        }
        callback (false, "OK");
    });
}

exports.sendSnapshot = function (image, args) {
    return new Promise(function (resolve, reject) {
        var now = getDateTime();
        var cid = ""+ now.year + now.month + now.day +"-"+ now.hour + now.min +"";

        var transporter = nodemailer.createTransport({
            host: Homey.ManagerSettings.get('email_hostname'),
            port: Homey.ManagerSettings.get('email_port'),
            secure: Homey.ManagerSettings.get('email_secure'),
            auth: {
                user: Homey.ManagerSettings.get('email_username'),
                pass: Homey.ManagerSettings.get('email_password')
            },
            tls: {rejectUnauthorized: false}
        });

        var mailOptions = {
            from: 'Homey IP Webcam App <' + Homey.ManagerSettings.get('email_sender') + '>',
            to: args.mailto,
            subject: 'Homey IP Webcam App Snapshot - '+ now.year +'-'+ now.month +'-'+ now.day +' '+ now.hour +':'+ now.min,
            text: '',
            html: Homey.__('<h1>Homey IP Webcam App</h1><p>This snapshot was taken at ') + now.year +'-'+ now.month +'-'+ now.day +' '+ now.hour +':'+ now.min +'.</p><p><img src="cid:'+ cid +'" alt="IP Webcam Snapshot" border="0" /></p>',
            attachments: [ {
                filename: 'ipwebcam_snapshot.jpg',
                content: new Buffer(image, 'base64'),
                cid: cid
            } ]
        }

        transporter.sendMail(mailOptions, function(error, info) {
            if(error) {
                return reject(error);
            } else {
                return resolve();
            }
        });
    })
}

function getDateTime() {
    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return { year: year, month: month, day: day, hour: hour, min: min };
}
