/* jshint node: true */
/* global navigator, document, window */
/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

'use strict';

var APPIUM_SERVER_HOST = 'localhost';
var APPIUM_SERVER_PORT = 4723;
var WEBVIEW_WAIT_TIMEOUT = 5000;
var IMPLICIT_WAIT_TIMEOUT = 10000;
var ASYNC_SCRIPT_TIMEOUT = 60000;

var fs = require('fs');
var path = require('path');
var wd = global.WD || require('wd');

module.exports.getDriver = function (platform) {
    var normalizedPlatform;
    switch (platform.toLowerCase()) {
        case 'android':
            normalizedPlatform = 'Android';
            break;
        case 'ios':
            normalizedPlatform = 'iOS';
            break;
        default:
            throw 'Unknown platform: ' + platform;
    }

    var serverConfig = {
        host: APPIUM_SERVER_HOST,
        port: APPIUM_SERVER_PORT
    };

    var driverConfig = {
        browserName: '',
        platformName: normalizedPlatform,
        platformVersion: global.PLATFORM_VERSION || '',
        deviceName: global.DEVICE_NAME || '',
        app: global.PACKAGE_PATH,
        autoAcceptAlerts: true,
    };
    if (global.UDID) {
        driverConfig.udid = global.UDID;
    }

    var driver = global.WD.promiseChainRemote(serverConfig);
    module.exports.configureLogging(driver);

    return driver
        .init(driverConfig)
        .setImplicitWaitTimeout(IMPLICIT_WAIT_TIMEOUT);
};

module.exports.getWD = function () {
    return wd;
};

module.exports.getWebviewContext = function (driver, retries) {
    if (typeof retries === 'undefined') {
        retries = 2;
    }
    return driver
        .sleep(WEBVIEW_WAIT_TIMEOUT)
        .contexts()
        .then(function (contexts) {
            // take the last webview context
            for (var i = 0; i < contexts.length; i++) {
                if (contexts[i].indexOf('WEBVIEW') >= 0) {
                    return contexts[i];
                }
            }
            // no webview context, the app is still loading
            return driver
                .then(function () {
                    if (retries > 0) {
                        console.log('No webview context. Retries remaining: ' + retries);
                        return driver
                            .then(function () {
                                return module.exports.getWebviewContext(driver, retries - 1);
                        });
                    }
                    throw 'Couldn\'t get webview context.';
                });
        });
};

module.exports.waitForDeviceReady = function (driver) {
    return driver
        .setAsyncScriptTimeout(ASYNC_SCRIPT_TIMEOUT)
        .executeAsync(function (cb) {
            document.addEventListener('deviceready', cb, false);
        }, []);
};

module.exports.injectLibraries = function (driver) {
    var q = fs.readFileSync(path.join(__dirname, '/lib/q.min.js'), 'utf8');
    return driver
        .execute(q)
        .execute(function () {
            navigator._appiumPromises = {};
        }, []);
};

module.exports.configureLogging = function (driver) {
    driver.on('status', function (info) {
        console.log(info);
    });
    driver.on('command', function (meth, path, data) {
        console.log(' > ' + meth, path, data || '');
    });
    driver.on('http', function (meth, path, data) {
        console.log(' > ' + meth, path, data || '');
    });
};

module.exports.tapElementByXPath = function (xpath, driver) {
    return driver
        .waitForElementByXPath(xpath, 30000)
        .getLocation()
        .then(function (loc) {
            if (loc.x <= 0) {
                loc.x = 1;
            }
            if (loc.y <= 0) {
                loc.y = 1;
            }
            loc.x = Math.floor(loc.x + 1);
            loc.y = Math.floor(loc.y + 1);

            var wd = module.exports.getWD();
            var tapElement = new wd.TouchAction();
            tapElement.tap(loc);
            return driver.performTouchAction(tapElement);
        });
};

module.exports.pollForEvents = function (driver, isAndroid, windowOffset) {
    if (!windowOffset) {
        windowOffset = 0;
    }
    // polling for new events
    return driver
    //driver.then is not a function, so
    .sleep(0)
    .then(function() {
        if (!isAndroid) {
            return driver;
        }
        // for some reason inappbrowser tests tend to leave an active window on android
        // so for the polling to work correctly we need to
        // switch back to the window where the cache is located
        return driver
        .windowHandles()
        .then(function (windowHandles) {
            if (windowOffset >= windowHandles.length) {
                throw new Error('Cannot find a window with the event cache.');
            }
            return driver.window(windowHandles[windowOffset]);
        });
    })
    .execute(function () {
        if (typeof window._jasmineParamedicProxyCache === 'undefined') {
            // wrong window
            return null;
        }
        // get the results and clean up the cache
        var result = window._jasmineParamedicProxyCache;
        window._jasmineParamedicProxyCache = [];
        return result;
    }, [])
    .then(function (result) {
        if (Object.prototype.toString.call(result) === '[object Array]') {
            return result;
        }
        if (!isAndroid) {
            throw new Error('Cannot get the event cache: it doesn\'t exist in the app.');
        }
        // no luck finding the event cache in this window, let's try next
        return module.exports.pollForEvents(driver, isAndroid, windowOffset + 1);
    });
};

wd.addPromiseChainMethod('getWebviewContext', function (retries) {
    return module.exports.getWebviewContext(this, retries);
});

wd.addPromiseChainMethod('injectLibraries', function () {
    return module.exports.tapElementByXPath(this);
});

wd.addPromiseChainMethod('waitForDeviceReady', function () {
    return module.exports.waitForDeviceReady(this);
});

wd.addPromiseChainMethod('injectLibraries', function () {
    return module.exports.tapElementByXPath(this);
});

wd.addPromiseChainMethod('tapElementByXPath', function (xpath) {
    return module.exports.tapElementByXPath(xpath, this);
});

wd.addPromiseChainMethod('pollForEvents', function (isAndroid) {
    return module.exports.pollForEvents(this, isAndroid);
});
